from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict

from auth import CurrentUser, Subject, profile
from database import Database
from models import AuthIdentity, UserTable
from schemas import Name

router = APIRouter()


class ProfileInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    username: Name
    usertype: Literal["user", "shop"]


@router.get("/auth/me")
def me(user: CurrentUser):
    return profile(user)


@router.post("/auth/profile", status_code=201)
def create_profile(payload: ProfileInput, subject: Subject, session: Database):
    if session.get(AuthIdentity, subject):
        raise HTTPException(409, "This identity already has an account")
    if session.query(UserTable).filter_by(username=payload.username).first():
        raise HTTPException(
            409,
            "Username unavailable. Existing accounts require verified operator linking.",
        )
    user = UserTable(
        username=payload.username,
        usertype=payload.usertype,
        password="!supabase-auth-only!",
        points=0,
    )
    session.add(user)
    session.flush()
    session.add(AuthIdentity(auth_user_id=subject, userid=user.userid))
    session.commit()
    return profile(user)


@router.post("/login", deprecated=True)
@router.post("/register", deprecated=True)
def retired_credentials():
    raise HTTPException(
        410, "Use Supabase Auth; legacy password credentials are retired"
    )
