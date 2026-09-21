"""Supabase establishes identity; database roles and ownership grant permissions."""

from typing import Annotated
from uuid import UUID

import requests
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from config import Config
from database import Database
from models import AuthIdentity, UserTable

bearer = HTTPBearer(auto_error=False)


def authenticated_subject(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> str:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            401, "Sign in required", headers={"WWW-Authenticate": "Bearer"}
        )
    if (
        not Config.SUPABASE_URL.startswith("https://")
        or not Config.SUPABASE_PUBLISHABLE_KEY
    ):
        raise HTTPException(503, "Authentication is not configured")
    try:
        response = requests.get(
            f"{Config.SUPABASE_URL}/auth/v1/user",
            headers={
                "apikey": Config.SUPABASE_PUBLISHABLE_KEY,
                "Authorization": f"Bearer {credentials.credentials}",
            },
            timeout=(3, 5),
            allow_redirects=False,
        )
        if response.status_code in (401, 403):
            raise HTTPException(
                401,
                "Session is invalid or expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if response.status_code != 200:
            raise HTTPException(503, "Authentication service unavailable")
        user = response.json()
        if not user.get("email_confirmed_at") or user.get("is_anonymous", False):
            raise HTTPException(403, "Confirm your email before continuing")
        return str(UUID(user["id"]))
    except (requests.RequestException, ValueError, KeyError, TypeError, AttributeError):
        # Never include tokens, upstream bodies or credentials in errors.
        raise HTTPException(503, "Authentication service unavailable") from None


Subject = Annotated[str, Depends(authenticated_subject)]


def current_user(subject: Subject, session: Database) -> UserTable:
    row = (
        session.query(AuthIdentity, UserTable)
        .join(UserTable, UserTable.userid == AuthIdentity.userid)
        .filter(AuthIdentity.auth_user_id == subject)
        .first()
    )
    if not row:
        raise HTTPException(403, "profile_required")
    identity, user = row
    if identity.disabled:
        raise HTTPException(403, "Account disabled")
    return user


CurrentUser = Annotated[UserTable, Depends(current_user)]


def require_role(user: UserTable, *roles: str):
    if user.usertype not in roles:
        raise HTTPException(403, "Permission denied")


def require_owner(user: UserTable, userid: int, *, admin: bool = False):
    if user.userid != userid and not (admin and user.usertype == "admin"):
        raise HTTPException(403, "Permission denied")


def profile(user: UserTable):
    return {
        "userid": user.userid,
        "username": user.username,
        "usertype": user.usertype,
        "points": user.points,
    }
