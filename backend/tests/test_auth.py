"""Authorization uses real DB dependencies; provider tests mock only HTTP transport."""

import re
from unittest.mock import Mock

import pytest
import requests

import auth
from config import Config
from models import AuthIdentity, UserTable


def headers(userid):
    return {"Authorization": f"Bearer fixture-{userid}"}


def test_every_business_route_requires_authentication(app):
    spec = app.get("/openapi.json").json()
    app.headers.pop("Authorization")
    for path, operations in spec["paths"].items():
        if path in ("/health", "/login", "/register"):
            continue
        for method in operations:
            url = re.sub(r"\{\w+\}", "1", path)
            result = app.request(method, url, json={})
            assert result.status_code == 401, (method, path, result.text)
            assert operations[method]["security"] == [{"HTTPBearer": []}]


@pytest.mark.parametrize(
    "path,payload",
    [
        ("/user-checklist", {"userid": 2, "checklistoptionids": [1]}),
        (
            "/nearby-locations",
            {"userid": 2, "lat": 0, "lon": 0, "actiontype": "repair"},
        ),
        ("/add-history", {"userid": 2, "shopid": 4}),
        (
            "/forums/add",
            {"posterid": 2, "shopid": 4, "forumtext": "Forged author identity"},
        ),
        (
            "/comments/add",
            {"posterid": 2, "forumid": 1, "commenttext": "Forged author identity"},
        ),
        (
            "/comments/reply/1",
            {"posterid": 2, "forumid": 1, "commenttext": "Forged author identity"},
        ),
        ("/comments/report/1", {"reporterid": 2}),
        ("/remove-shop", {"shopid": 2}),
        ("/update-single-user-points/2", {}),
        ("/update-all-user-points", {}),
        ("/classify-comment-GPT", {}),
        ("/classify-comment-AZURE", {}),
        ("/comments/report-gpt/1", {}),
        ("/comments/report-azure/1", {}),
    ],
)
def test_resident_cannot_impersonate_or_moderate(app, path, payload):
    assert app.post(path, json=payload).status_code == 403


def test_private_reads_and_shop_ownership(app):
    assert app.get("/user-checklist/2").status_code == 403
    assert (
        app.get("/get-history", params={"userid": 2, "lat": 0, "lon": 0}).status_code
        == 403
    )
    assert app.get("/comments/reported").status_code == 403
    shop = {
        "userid": 2,
        "shopname": "Forged",
        "addressname": "Test",
        "latitude": 0,
        "longtitude": 0,
        "actiontype": "repair",
    }
    assert app.post("/add-shop", json=shop).status_code == 403
    assert app.post("/add-shop", json=shop, headers=headers(3)).status_code == 403
    assert (
        app.post("/remove-shop", json={"shopid": 2}, headers=headers(3)).status_code
        == 403
    )
    assert app.post("/add-shop", json=shop, headers=headers(2)).status_code == 200


def test_authors_moderators_and_atomic_points(app):
    assert (
        app.post(
            "/forums/add",
            json={"shopid": 4, "posterid": 1, "forumtext": "Resident discussion"},
        ).status_code
        == 201
    )
    fid = app.get("/forums/4").json()[0]["forumid"]
    comment = {"forumid": fid, "posterid": 2, "commenttext": "Helpful shop response"}
    assert (
        app.post("/comments/add", json=comment, headers=headers(2)).status_code == 201
    )
    cid = app.get(f"/comments/{fid}").json()[0]["commentid"]
    assert app.get("/auth/me", headers=headers(2)).json()["points"] == 5
    for role in (3, 99):
        assert (
            app.put(
                f"/comments/edit/{cid}",
                json={"commenttext": "Impersonated edit"},
                headers=headers(role),
            ).status_code
            == 403
        )
        assert (
            app.put(
                f"/forums/edit/{fid}",
                json={"forumtext": "Impersonated edit"},
                headers=headers(role),
            ).status_code
            == 403
        )
    assert app.put(f"/comments/delete/{cid}", headers=headers(3)).status_code == 403
    assert app.delete(f"/forums/delete/{fid}", headers=headers(2)).status_code == 403
    assert (
        app.post(f"/comments/report/{cid}", json={"reporterid": 1}).status_code == 201
    )
    assert (
        app.post(f"/comments/report/{cid}", json={"reporterid": 1}).status_code == 200
    )
    assert (
        app.get("/comments/reported", headers=headers(99)).json()[0]["report_count"]
        == 1
    )
    assert app.put(f"/comments/delete/{cid}", headers=headers(99)).status_code == 200
    assert app.get("/auth/me", headers=headers(2)).json()["points"] == 0
    assert app.delete(f"/forums/delete/{fid}", headers=headers(99)).status_code == 200
    assert app.get("/auth/me").json()["points"] == 0


def test_cannot_reply_across_forums(app):
    for text in ("First test discussion", "Second test discussion"):
        app.post("/forums/add", json={"shopid": 4, "posterid": 1, "forumtext": text})
    forums = app.get("/forums/4").json()
    comment = {
        "forumid": forums[0]["forumid"],
        "posterid": 1,
        "commenttext": "A valid test response",
    }
    app.post("/comments/add", json=comment)
    cid = app.get(f"/comments/{comment['forumid']}").json()[0]["commentid"]
    assert (
        app.post(
            f"/comments/reply/{cid}", json={**comment, "forumid": forums[1]["forumid"]}
        ).status_code
        == 400
    )


def test_profiles_cannot_claim_legacy_accounts_or_change_roles(app, db):
    app.headers.update(headers(100))
    assert app.get("/auth/me").json()["detail"] == "profile_required"
    assert (
        app.post(
            "/auth/profile", json={"username": "resident", "usertype": "user"}
        ).status_code
        == 409
    )
    assert (
        app.post(
            "/auth/profile", json={"username": "new", "usertype": "admin"}
        ).status_code
        == 422
    )
    created = app.post("/auth/profile", json={"username": "new", "usertype": "user"})
    assert created.status_code == 201
    assert "password" not in created.text
    assert (
        app.post(
            "/auth/profile", json={"username": "other", "usertype": "shop"}
        ).status_code
        == 409
    )
    assert app.get("/auth/me").json()["usertype"] == "user"
    identity = db.session.get(AuthIdentity, "00000000-0000-0000-0000-000000000100")
    identity.disabled = True
    db.session.commit()
    assert app.get("/auth/me").status_code == 403
    assert app.get("/forums/4").status_code == 403


@pytest.fixture
def online_verifier(app, monkeypatch):
    app.app.dependency_overrides.pop(auth.authenticated_subject)
    monkeypatch.setattr(Config, "SUPABASE_URL", "https://project.example")
    monkeypatch.setattr(Config, "SUPABASE_PUBLISHABLE_KEY", "public-fixture-key")
    response = Mock(status_code=200)
    response.json.return_value = {
        "id": "00000000-0000-0000-0000-000000000001",
        "email_confirmed_at": "2026-09-21",
        "user_metadata": {"usertype": "admin"},
    }
    get = Mock(return_value=response)
    monkeypatch.setattr(auth.requests, "get", get)
    return response, get


def test_verified_identity_not_metadata_or_body_controls_permissions(
    app, online_verifier
):
    _, get = online_verifier
    result = app.post(
        "/verify",
        json={"userid": 99, "usertype": "admin", "userhashedpassword": "ignored"},
    )
    assert result.status_code == 200
    assert result.json()["userid"] == 1
    assert result.json()["usertype"] == "user"
    assert get.call_count == 1  # Router and handler dependency share one verification.
    assert get.call_args.args == ("https://project.example/auth/v1/user",)
    assert get.call_args.kwargs["allow_redirects"] is False
    assert get.call_args.kwargs["timeout"] == (3, 5)
    assert get.call_args.kwargs["headers"]["Authorization"] == "Bearer fixture-1"


@pytest.mark.parametrize(
    "upstream,expected", [(401, 401), (403, 401), (429, 503), (500, 503), (302, 503)]
)
def test_upstream_rejection_fails_closed(app, online_verifier, upstream, expected):
    response, _ = online_verifier
    response.status_code = upstream
    result = app.get("/auth/me")
    assert result.status_code == expected
    assert "fixture-1" not in result.text


@pytest.mark.parametrize(
    "data,expected",
    [
        ({}, 403),
        ({"email_confirmed_at": "yes", "id": "malformed"}, 503),
        ({"email_confirmed_at": "yes", "is_anonymous": True}, 403),
    ],
)
def test_unconfirmed_or_malformed_identity_rejected(
    app, online_verifier, data, expected
):
    online_verifier[0].json.return_value = data
    assert app.get("/auth/me").status_code == expected


def test_timeout_missing_config_and_missing_bearer(app, online_verifier, monkeypatch):
    _, get = online_verifier
    get.side_effect = requests.Timeout("sensitive upstream detail")
    result = app.get("/auth/me")
    assert result.status_code == 503 and "sensitive" not in result.text
    monkeypatch.setattr(Config, "SUPABASE_URL", "")
    assert app.get("/auth/me").status_code == 503
    app.headers.pop("Authorization")
    assert app.get("/auth/me").status_code == 401


def test_role_changes_take_effect_on_next_request(app, db):
    assert app.get("/comments/reported").status_code == 403
    db.session.get(UserTable, 1).usertype = "admin"
    db.session.commit()
    assert app.get("/comments/reported").status_code == 200
