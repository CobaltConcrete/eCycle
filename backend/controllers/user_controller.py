from fastapi import APIRouter
from fastapi.responses import JSONResponse

from auth import CurrentUser, profile, require_owner, require_role
from database import Database
from models import CommentTable, ForumTable, UserChecklistTable, UserTable
from schemas import ID, UsernameInput

router = APIRouter()


@router.post("/verify")
def verify_user(user: CurrentUser):
    return {"isValid": True, **profile(user)}


@router.post("/check-username")
def check_username(payload: UsernameInput, session: Database):
    return {
        "exists": session.query(UserTable).filter_by(username=payload.username).first()
        is not None
    }


@router.get("/get-username/{userid:int}")
def get_username(userid: ID, session: Database):
    user = session.query(UserTable).filter_by(userid=userid).first()
    if user:
        return JSONResponse({"username": user.username}, status_code=200)
    return JSONResponse({"message": "User not found"}, status_code=404)


@router.get("/get-usertype/{userid:int}")
def get_usertype(userid: ID, session: Database):
    user = session.query(UserTable).filter_by(userid=userid).first()
    if user:
        return JSONResponse({"usertype": user.usertype}, status_code=200)
    return JSONResponse({"message": "User not found"}, status_code=404)


@router.get("/user-checklist/{userid:int}")
def get_user_checklist(user: CurrentUser, userid: ID, session: Database):
    require_owner(user, userid)
    user_checklist = session.query(UserChecklistTable).filter_by(userid=userid).all()
    checklistoptionids = [item.checklistoptionid for item in user_checklist]
    return JSONResponse(checklistoptionids, status_code=200)


@router.post("/update-single-user-points/{userid:int}")
def update_single_user_points(user: CurrentUser, userid: ID, session: Database):
    require_owner(user, userid)
    try:
        user = session.query(UserTable).filter_by(userid=userid).first()
        if not user:
            return JSONResponse({"error": "User not found"}, status_code=404)
        forum_count = session.query(ForumTable).filter_by(posterid=user.userid).count()
        comment_count = (
            session.query(CommentTable)
            .filter_by(posterid=user.userid, deleted=False)
            .count()
        )
        new_points = forum_count * 10 + comment_count * 5
        user.points = new_points
        session.commit()
        return JSONResponse(
            {"message": f"Points updated for user {userid}", "points": new_points},
            status_code=200,
        )
    except Exception:
        session.rollback()
        return JSONResponse(
            {"error": "Operation failed; please try again"}, status_code=500
        )


@router.post("/update-all-user-points")
def update_user_points(user: CurrentUser, session: Database):
    require_role(user, "admin")
    try:
        users = session.query(UserTable).all()
        for user in users:
            forum_count = (
                session.query(ForumTable).filter_by(posterid=user.userid).count()
            )
            comment_count = (
                session.query(CommentTable)
                .filter_by(posterid=user.userid, deleted=False)
                .count()
            )
            new_points = forum_count * 10 + comment_count * 5
            user.points = new_points
        session.commit()
        return JSONResponse(
            {"message": "User points updated successfully"}, status_code=200
        )
    except Exception:
        session.rollback()
        return JSONResponse(
            {"error": "Operation failed; please try again"}, status_code=500
        )
