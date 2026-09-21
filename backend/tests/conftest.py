"""Isolated SQLite fixtures; never open the configured PostgreSQL connection."""

import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import Depends, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import create_app
from auth import authenticated_subject, bearer
from database import Base, get_db
from models import (
    AuthIdentity,
    ChecklistOptionTable,
    ShopTable,
    UserChecklistTable,
    UserTable,
)


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )

    @event.listens_for(engine, "connect")
    def foreign_keys(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    with Session(engine) as session:
        session.add(
            UserTable(userid=1, username="resident", password="unused", usertype="user")
        )
        session.add_all(
            [
                ChecklistOptionTable(checklistoptionid=i, checklistoptiontype=str(i))
                for i in (1, 2)
            ]
        )
        session.add_all(
            [
                UserTable(
                    userid=i, username=f"shop{i}", password="unused", usertype="shop"
                )
                for i in range(2, 32)
            ]
        )
        session.flush()
        for i in range(2, 32):
            session.add(
                ShopTable(
                    shopid=i,
                    shopname=f"Shop {i}",
                    latitude=i / 1000,
                    longtitude=0,
                    addressname="Fixture",
                    actiontype="general" if i == 2 else "repair",
                )
            )
            session.add(UserChecklistTable(userid=i, checklistoptionid=1))
            if i % 2 == 0:
                session.add(UserChecklistTable(userid=i, checklistoptionid=2))
        session.add(
            UserTable(
                userid=99, username="moderator", password="unused", usertype="admin"
            )
        )
        session.flush()
        session.add_all(
            [
                AuthIdentity(auth_user_id=f"00000000-0000-0000-0000-{i:012d}", userid=i)
                for i in [*range(1, 32), 99]
            ]
        )
        session.commit()
        yield SimpleNamespace(session=session, engine=engine)
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def app(db):
    application = create_app()

    def test_session():
        with Session(db.engine) as session:
            yield session

    application.dependency_overrides[get_db] = test_session

    def fixture_subject(credentials=Depends(bearer)):
        if not credentials or not credentials.credentials.startswith("fixture-"):
            raise HTTPException(401, "Invalid fixture token")
        return (
            f"00000000-0000-0000-0000-{int(credentials.credentials.split('-')[1]):012d}"
        )

    application.dependency_overrides[authenticated_subject] = fixture_subject
    with TestClient(
        application, headers={"Authorization": "Bearer fixture-1"}
    ) as client:
        yield client
