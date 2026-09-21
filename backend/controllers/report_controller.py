from datetime import datetime

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import func

from auth import CurrentUser, profile, require_owner, require_role
from database import Database
from models import CommentTable, ReportTable
from schemas import ID, ReportInput

router = APIRouter()


@router.post("/comments/report/{commentid:int}", status_code=201)
def report_comment(
    commentid: ID, payload: ReportInput, session: Database, user: CurrentUser
):
    require_owner(user, payload.reporterid)
    comment = session.get(CommentTable, commentid)
    if not comment or comment.deleted:
        raise HTTPException(404, "Active comment not found")
    if (
        session.query(ReportTable)
        .filter_by(commentid=commentid, reporterid=user.userid)
        .first()
    ):
        return JSONResponse({"message": "Already reported"}, status_code=200)
    session.add(
        ReportTable(
            commentid=commentid,
            reporterid=user.userid,
            time=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        )
    )
    session.commit()
    return {"message": "Comment reported for moderator review"}


@router.get("/comments/reported")
def get_reported_comments_summary(session: Database, user: CurrentUser):
    require_role(user, "admin")
    reports = (
        session.query(
            func.min(ReportTable.reportid).label("reportid"),
            ReportTable.commentid,
            CommentTable.commenttext,
            func.count(ReportTable.commentid).label("report_count"),
            func.max(ReportTable.time).label("latest_report_time"),
            CommentTable.forumid,
            func.max(ReportTable.dangerscore).label("dangerscore"),
        )
        .join(CommentTable, ReportTable.commentid == CommentTable.commentid)
        .group_by(ReportTable.commentid, CommentTable.commenttext, CommentTable.forumid)
        .all()
    )
    return [dict(row._mapping) for row in reports]


@router.post("/verify-admin")
def verify_admin(user: CurrentUser):
    require_role(user, "admin")
    return {"isValid": True, **profile(user)}


@router.post("/classify-comment-GPT", deprecated=True)
@router.post("/classify-comment-AZURE", deprecated=True)
@router.post("/comments/report-gpt/{commentid:int}", deprecated=True)
@router.post("/comments/report-azure/{commentid:int}", deprecated=True)
def retired_classification(user: CurrentUser):
    require_role(user, "admin")
    raise HTTPException(
        410,
        "Legacy AI classification retired; use manual reporting and moderator review",
    )
