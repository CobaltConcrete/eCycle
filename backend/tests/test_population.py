"""Import safety checks; these tests never connect to the configured database."""

import pytest
from sqlalchemy import create_engine, text

from populate_database import TABLES, fingerprint, require_empty, validate_source


def test_existing_database_is_refused_without_changing_data():
    engine = create_engine("sqlite://")
    with engine.begin() as connection:
        connection.execute(text("ATTACH DATABASE ':memory:' AS public"))
        connection.execute(text("CREATE TABLE public.existing (value INTEGER)"))
        connection.execute(text("INSERT INTO public.existing VALUES (42)"))
        with pytest.raises(ValueError, match="already contains tables"):
            require_empty(connection)
        assert connection.scalar(text("SELECT value FROM public.existing")) == 42


def test_missing_parent_is_rejected_before_import():
    data = {name: [] for name in TABLES}
    data["userhistorytable"] = [{"userid": 7, "shopid": 8, "time": "2024"}]
    with pytest.raises(ValueError, match="Missing foreign key"):
        validate_source(data)


def test_duplicate_history_is_rejected_not_silently_dropped():
    data = {name: [] for name in TABLES}
    row = {"userid": 7, "shopid": 8, "time": "2024"}
    data["userhistorytable"] = [row, dict(row, time="2025")]
    with pytest.raises(ValueError, match="Duplicate primary key"):
        validate_source(data)


def test_full_value_verification_ignores_order_but_detects_changes():
    rows = [{"id": 1, "image": "abc"}, {"id": 2, "image": None}]
    assert fingerprint(rows) == fingerprint(list(reversed(rows)))
    assert fingerprint(rows) != fingerprint([dict(rows[0], image="abcd"), rows[1]])
