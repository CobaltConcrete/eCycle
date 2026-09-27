"""Behavior and query-count regression tests. Never connects to a live database."""

import pytest
from sqlalchemy import event

from models import ShopTable, UserChecklistTable, UserTable


def search(app, **overrides):
    return app.post(
        "/nearby-locations",
        json={"lat": 0, "lon": 0, "userid": 1, "actiontype": "repair", **overrides},
    )


def test_all_selected_items_and_constant_query_count(app, db):
    db.session.add_all(
        [UserChecklistTable(userid=1, checklistoptionid=i) for i in (1, 2)]
    )
    db.session.commit()
    statements = []

    def record(conn, cursor, statement, parameters, context, executemany):
        statements.append(statement)

    event.listen(db.engine, "before_cursor_execute", record)
    try:
        response = search(app)
    finally:
        event.remove(db.engine, "before_cursor_execute", record)
    assert response.status_code == 200
    assert [row["shopid"] for row in response.json()] == list(range(4, 32, 2))
    assert len(statements) == 3  # One identity/role lookup + two search queries.


def test_empty_checklist_returns_all_matching_places_without_a_cap(app, db):
    assert [r["shopid"] for r in search(app).json()] == list(range(3, 32))


def test_ties_are_resolved_by_shop_id(app, db):
    db.session.query(ShopTable).update({"latitude": 0})
    db.session.commit()
    assert [r["shopid"] for r in search(app).json()] == list(range(3, 32))


def test_sort_uses_unrounded_distance(app, db):
    db.session.query(ShopTable).filter_by(shopid=3).update({"latitude": 0.00101})
    db.session.query(ShopTable).filter_by(shopid=4).update({"latitude": 0.00100})
    db.session.commit()
    rows = search(app).json()
    assert rows[0]["shopid"] == 4
    assert rows[0]["distance"] < rows[1]["distance"]
    assert round(rows[0]["distance"], 2) == round(rows[1]["distance"], 2)


def test_no_matching_shop(app, db):
    assert search(app, actiontype="dispose").json() == []


@pytest.mark.parametrize(
    "overrides",
    [
        {"lat": None},
        {"lat": True},
        {"lat": "NaN"},
        {"lon": "Infinity"},
        {"lat": 91},
        {"lon": -181},
        {"userid": 0},
        {"userid": 1.5},
        {"userid": []},
        {"actiontype": "invalid"},
    ],
)
def test_bad_input_is_rejected(app, overrides):
    assert search(app, **overrides).status_code == 422


@pytest.mark.parametrize("payload", [[], None, "invalid"])
def test_non_object_json_is_rejected(app, payload):
    assert app.post("/nearby-locations", json=payload).status_code == 422


def test_cannot_self_register_as_admin(app, db):
    response = app.post(
        "/auth/profile",
        json={
            "username": "attacker",
            "usertype": "admin",
        },
    )
    assert response.status_code == 422
    assert db.session.query(UserTable).filter_by(username="attacker").first() is None
