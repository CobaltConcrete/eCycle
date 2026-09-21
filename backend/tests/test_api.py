"""Framework-migration contracts: exercise actual ASGI routes with an isolated DB."""

import json
from pathlib import Path
from unittest.mock import Mock

import pytest
import requests
from sqlalchemy import event

import database
from controllers import map_controller
from models import UserTable


def test_all_legacy_routes_are_documented(app):
    spec = app.get("/openapi.json").json()
    routes = json.loads(Path(__file__).with_name("legacy_routes.json").read_text())
    for route in routes:
        assert route["method"] in spec["paths"][route["path"]], route
    nearby = spec["paths"]["/nearby-locations"]["post"]
    assert nearby["requestBody"]["content"]["application/json"]["schema"][
        "$ref"
    ].endswith("/NearbyInput")
    assert (
        nearby["responses"]["200"]["content"]["application/json"]["schema"]["type"]
        == "array"
    )
    assert app.get("/docs").status_code == 200


def test_liveness_does_not_query_database(app, db):
    queries = []

    def record(*args):
        queries.append(args)

    event.listen(db.engine, "before_cursor_execute", record)
    try:
        assert app.get("/health").json() == {"status": "ok", "service": "ecycle-api"}
    finally:
        event.remove(db.engine, "before_cursor_execute", record)
    assert queries == []


def test_legacy_credentials_retired(app):
    for path in ("/login", "/register"):
        result = app.post(path, json={"username": "resident", "password": "secret"})
        assert result.status_code == 410
        assert "secret" not in result.text
    assert (
        app.post(
            "/verify",
            json={"userid": 99, "usertype": "admin", "userhashedpassword": "forged"},
        ).json()["userid"]
        == 1
    )
    assert app.post("/verify-admin").status_code == 403
    assert app.post("/verify-shop").status_code == 403


def test_bcrypt_hashes_remain_compatible():
    import bcrypt

    # Flask-Bcrypt used standard bcrypt hashes; validate a previously hashed value.
    encoded = bcrypt.hashpw(b"fixture", bcrypt.gensalt(rounds=4)).decode()
    user = UserTable(username="fixture", password=encoded, usertype="user")
    assert user.check_password("fixture")
    assert not user.check_password("wrong")


def test_validation_never_echoes_password(app):
    secret = "fixture-secret-" * 10
    response = app.post("/register", json={"username": "person", "password": secret})
    assert response.status_code == 410
    assert secret not in response.text


def test_checklist_save_and_rollback(app):
    assert len(app.get("/checklist-options").json()) == 2
    assert (
        app.post(
            "/user-checklist", json={"userid": "1", "checklistoptionids": [1, 2]}
        ).status_code
        == 201
    )
    duplicate = app.post(
        "/user-checklist", json={"userid": 1, "checklistoptionids": [1, 1]}
    )
    assert duplicate.status_code == 422
    # Foreign-key failure after deleting old entries must not erase the saved checklist.
    failure = app.post(
        "/user-checklist", json={"userid": 1, "checklistoptionids": [999]}
    )
    assert failure.status_code == 409
    assert sorted(app.get("/user-checklist/1").json()) == [1, 2]


def test_discussion_report_points_and_delete_flow(app):
    assert (
        app.post(
            "/forums/add",
            json={
                "shopid": "4",
                "posterid": "1",
                "forumtext": "Repair question for this shop",
            },
        ).status_code
        == 201
    )
    forum = app.get("/forums/4").json()[0]
    fid = forum["forumid"]
    assert forum["postername"] == "resident"
    assert app.get(f"/forums/details/{fid}").status_code == 200
    assert app.get(f"/get-shopid-from-forumid/{fid}").json()["shopid"] == 4
    assert app.get("/get-actiontype-from-shopid/4").json()["actiontype"] == "repair"
    assert (
        app.put(
            f"/forums/edit/{fid}", json={"forumtext": "Updated repair question"}
        ).status_code
        == 200
    )
    comment = {
        "forumid": fid,
        "posterid": 1,
        "commenttext": "A helpful fixture comment",
    }
    assert app.post("/comments/add", json=comment).status_code == 201
    cid = app.get(f"/comments/{fid}").json()[0]["commentid"]
    assert app.post(f"/comments/reply/{cid}", json=comment).status_code == 201
    assert (
        app.put(
            f"/comments/edit/{cid}", json={"commenttext": "An updated fixture comment"}
        ).status_code
        == 200
    )
    assert (
        app.post(f"/comments/report/{cid}", json={"reporterid": "1"}).status_code == 201
    )
    reports = app.get(
        "/comments/reported", headers={"Authorization": "Bearer fixture-99"}
    )
    assert reports.status_code == 200  # Must not be swallowed by /comments/{forumid}.
    assert reports.json()[0]["report_count"] == 1
    assert app.post("/update-single-user-points/1").json()["points"] == 20
    assert (
        app.post(
            "/update-all-user-points", headers={"Authorization": "Bearer fixture-99"}
        ).status_code
        == 200
    )
    assert app.put(f"/comments/delete/{cid}").status_code == 200
    assert (
        app.get(
            "/comments/reported", headers={"Authorization": "Bearer fixture-99"}
        ).json()
        == []
    )
    assert app.post("/update-single-user-points/1").json()["points"] == 15
    assert app.delete(f"/forums/delete/{fid}").status_code == 200
    assert app.get("/forums/4").json() == []
    assert app.get(f"/comments/{fid}").json() == []


def test_shop_create_update_and_remove(app):
    app.headers["Authorization"] = "Bearer fixture-100"
    result = app.post("/auth/profile", json={"username": "newshop", "usertype": "shop"})
    assert result.status_code == 201
    sid = result.json()["userid"]
    assert app.post("/verify-shop").status_code == 200
    details = {
        "userid": str(sid),
        "shopname": "Test shop",
        "addressname": "Fixture address",
        "latitude": 1.3,
        "longtitude": 103.8,
        "actiontype": "repair",
    }
    assert app.post("/add-shop", json=details).status_code == 201
    assert (
        app.post("/add-shop", json={**details, "shopname": "Updated shop"}).status_code
        == 200
    )
    assert app.get(f"/get-shop-details/{sid}").json()["shopname"] == "Updated shop"
    assert app.post("/remove-shop", json={"shopid": sid}).status_code == 200
    assert app.get(f"/get-shop-details/{sid}").status_code == 404


def test_history_retains_five_distinct_shops(app):
    for shopid in range(2, 9):
        assert (
            app.post("/add-history", json={"userid": 1, "shopid": shopid}).status_code
            == 201
        )
    assert app.post("/add-history", json={"userid": 1, "shopid": 8}).status_code == 201
    response = app.get("/get-history", params={"userid": 1, "lat": 0, "lon": 0})
    assert response.status_code == 200
    assert len(response.json()["history"]) == 5
    assert len({r["shopid"] for r in response.json()["history"]}) == 5


def test_geocoding_parameters_and_timeout(app, monkeypatch):
    provider = Mock()
    provider.json.return_value = {
        "status": "OK",
        "results": [{"geometry": {"location": {"lat": 1.3, "lng": 103.8}}}],
    }
    get = Mock(return_value=provider)
    monkeypatch.setattr(map_controller.requests, "get", get)
    response = app.post("/get-coordinates", json={"address": "A & B, Singapore"})
    assert response.json() == {"lat": 1.3, "lng": 103.8}
    assert get.call_args.kwargs["params"]["address"] == "A & B, Singapore"
    assert get.call_args.kwargs["timeout"] == 10


def test_provider_timeout_is_bounded_error(app, monkeypatch):
    monkeypatch.setattr(
        map_controller.requests,
        "get",
        Mock(side_effect=requests.Timeout("secret-provider-details")),
    )
    response = app.post("/get-coordinates", json={"address": "Fixture"})
    assert response.status_code == 502
    assert "secret-provider-details" not in response.text


def test_cors_preflight(app):
    headers = {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    }
    response = app.options("/login", headers=headers)
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    response = app.options(
        "/login", headers={**headers, "Origin": "https://unexpected.example"}
    )
    assert "access-control-allow-origin" not in response.headers


def test_db_dependency_rolls_back_after_failure(db, monkeypatch):
    from sqlalchemy.orm import sessionmaker

    monkeypatch.setattr(database, "SessionLocal", sessionmaker(bind=db.engine))
    dependency = database.get_db()
    session = next(dependency)
    session.add(
        UserTable(
            userid=999, username="must_rollback", password="unused", usertype="user"
        )
    )
    session.flush()
    with pytest.raises(RuntimeError):
        dependency.throw(RuntimeError("fixture failure"))
    assert db.session.get(UserTable, 999) is None


@pytest.mark.parametrize(
    "path,payload",
    [
        ("/comments/add", {"forumid": 1, "posterid": 1, "commenttext": "a" * 256}),
        ("/forums/add", {"shopid": 4, "posterid": 1, "forumtext": "too short"}),
        (
            "/add-shop",
            {
                "userid": 2,
                "shopname": "Shop",
                "addressname": "Address",
                "latitude": 100,
                "longtitude": 0,
                "actiontype": "repair",
            },
        ),
    ],
)
def test_invalid_writes_are_rejected(app, path, payload):
    assert app.post(path, json=payload).status_code == 422
