from datetime import datetime

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import joinedload

from auth import CurrentUser, require_owner
from database import Database
from models import CommentTable, ForumTable, ReportTable
from points import refresh_points
from schemas import ID, CommentInput, CommentTextInput

router = APIRouter()


@router.get("/comments/{forumid:int}")
def get_comments(forumid: ID, session: Database):
    comments = (
        session.query(CommentTable)
        .options(joinedload(CommentTable.poster))
        .filter_by(forumid=forumid)
        .order_by(CommentTable.time.desc())
        .all()
    )
    comment_list = [
        {
            "commentid": comment.commentid,
            "commenttext": comment.commenttext,
            "forumid": comment.forumid,
            "posterid": comment.posterid,
            "replyid": comment.replyid,
            "encodedimage": comment.encodedimage,
            "time": comment.time,
            "deleted": comment.deleted,
            "postername": comment.poster.username,
            "userpoints": comment.poster.points,
        }
        for comment in comments
    ]
    return JSONResponse(comment_list, status_code=200)


@router.post("/comments/add", status_code=201)
def add_comment(user: CurrentUser, payload: CommentInput, session: Database):
    require_owner(user, payload.posterid)
    data = payload.model_dump()
    forumid = data["forumid"]
    commenttext = data["commenttext"]
    posterid = data["posterid"]
    encodedimage = data.get("encodedimage")
    time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    new_comment = CommentTable(
        forumid=forumid,
        commenttext=commenttext,
        posterid=posterid,
        time=time,
        encodedimage=encodedimage,
    )
    session.add(new_comment)
    refresh_points(session, [user.userid])
    session.commit()
    return JSONResponse({"message": "Comment added successfully"}, status_code=201)


@router.post("/comments/reply/{commentid:int}", status_code=201)
def reply_comment(
    user: CurrentUser, commentid: ID, payload: CommentInput, session: Database
):
    require_owner(user, payload.posterid)
    data = payload.model_dump()
    forumid = data["forumid"]
    commenttext = data["commenttext"]
    posterid = data["posterid"]
    encodedimage = data.get("encodedimage")
    time = data.get("time", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    parent = session.get(CommentTable, commentid)
    if not parent or parent.forumid != forumid or parent.deleted:
        raise HTTPException(400, "Reply must belong to the same active discussion")
    new_reply = CommentTable(
        forumid=forumid,
        commenttext=commenttext,
        posterid=posterid,
        time=time,
        replyid=commentid,
        encodedimage=encodedimage,
    )
    session.add(new_reply)
    refresh_points(session, [user.userid])
    session.commit()
    return JSONResponse({"message": "Reply added successfully"}, status_code=201)


@router.put("/comments/edit/{commentid:int}")
def edit_comment(
    user: CurrentUser, commentid: ID, payload: CommentTextInput, session: Database
):
    data = payload.model_dump()
    new_commenttext = data["commenttext"]
    comment = session.get(CommentTable, commentid)
    if not comment:
        return JSONResponse({"error": "Comment not found"}, status_code=404)
    require_owner(user, comment.posterid, admin=False)
    comment.commenttext = new_commenttext
    session.commit()
    return JSONResponse({"message": "Comment updated successfully"}, status_code=200)


@router.put("/comments/delete/{commentid:int}")
def delete_comment(user: CurrentUser, commentid: ID, session: Database):
    comment = session.get(CommentTable, commentid)
    if not comment:
        return JSONResponse({"error": "Comment not found"}, status_code=404)
    require_owner(user, comment.posterid, admin=True)
    comment.commenttext = "[deleted]"
    comment.deleted = True
    comment.encodedimage = None
    refresh_points(session, [comment.posterid])
    session.query(ReportTable).filter_by(commentid=commentid).delete()
    session.commit()
    return JSONResponse(
        {
            "message": "Comment marked as deleted and associated reports removed successfully"
        },
        status_code=200,
    )


@router.get("/get-shopid-from-forumid/{forumid:int}")
def get_shopid(forumid: ID, session: Database):
    forum = session.query(ForumTable).filter_by(forumid=forumid).first()
    if forum:
        return JSONResponse({"shopid": forum.shopid}, status_code=200)
    else:
        return JSONResponse({"message": "Forum not found"}, status_code=404)
