from datetime import datetime

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy.orm import joinedload

from auth import CurrentUser, require_owner
from database import Database
from models import CommentTable, ForumTable, ReportTable, ShopTable
from points import refresh_points
from schemas import ID, ForumInput, ForumTextInput

router = APIRouter()


@router.get("/forums/{shopid:int}")
def get_forums(shopid: ID, session: Database):
    forums = (
        session.query(ForumTable)
        .options(joinedload(ForumTable.poster))
        .filter_by(shopid=shopid)
        .order_by(ForumTable.time.desc())
        .all()
    )
    forum_list = [
        {
            "forumid": forum.forumid,
            "forumtext": forum.forumtext,
            "shopid": forum.shopid,
            "posterid": forum.posterid,
            "time": forum.time,
            "postername": forum.poster.username,
        }
        for forum in forums
    ]
    return JSONResponse(forum_list, status_code=200)


@router.get("/forums/details/{forumid:int}")
def get_forum_details(forumid: ID, session: Database):
    try:
        forum = session.query(ForumTable).filter_by(forumid=forumid).first()
        if forum:
            forum_details = {
                "forumtext": forum.forumtext,
                "posterid": forum.posterid,
                "time": forum.time,
                "postername": forum.poster.username,
            }
            return JSONResponse(forum_details, status_code=200)
        else:
            return JSONResponse({"error": "Forum not found"}, status_code=404)
    except Exception as e:
        print("Error fetching forum details:", e)
        return JSONResponse({"error": "Server error"}, status_code=500)


@router.post("/forums/add", status_code=201)
def add_forum(user: CurrentUser, payload: ForumInput, session: Database):
    require_owner(user, payload.posterid)
    data = payload.model_dump()
    forumtext = data["forumtext"]
    shopid = data["shopid"]
    posterid = data["posterid"]
    time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    new_forum = ForumTable(
        forumtext=forumtext, shopid=shopid, posterid=posterid, time=time
    )
    session.add(new_forum)
    refresh_points(session, [user.userid])
    session.commit()
    return JSONResponse({"message": "Forum added successfully"}, status_code=201)


@router.put("/forums/edit/{forumid:int}")
def edit_forum(
    user: CurrentUser, forumid: ID, payload: ForumTextInput, session: Database
):
    data = payload.model_dump()
    new_forumtext = data["forumtext"]
    forum = session.get(ForumTable, forumid)
    if not forum:
        return JSONResponse({"error": "Forum not found"}, status_code=404)
    require_owner(user, forum.posterid, admin=False)
    forum.forumtext = new_forumtext
    session.commit()
    return JSONResponse({"message": "Forum updated successfully"}, status_code=200)


@router.delete("/forums/delete/{forumid:int}")
def delete_forum(user: CurrentUser, forumid: ID, session: Database):
    forum = session.get(ForumTable, forumid)
    if not forum:
        return JSONResponse({"error": "Forum not found"}, status_code=404)
    require_owner(user, forum.posterid, admin=True)
    comments = session.query(CommentTable).filter_by(forumid=forumid).all()
    affected_authors = [forum.posterid, *(comment.posterid for comment in comments)]
    comment_ids = [comment.commentid for comment in comments]
    session.query(ReportTable).filter(ReportTable.commentid.in_(comment_ids)).delete()
    session.query(CommentTable).filter_by(forumid=forumid).delete()
    session.delete(forum)
    refresh_points(session, affected_authors)
    session.commit()
    return JSONResponse(
        {"message": "Forum and associated comments and reports deleted successfully"},
        status_code=200,
    )


@router.get("/get-actiontype-from-shopid/{shopid:int}")
def get_actiontype(shopid: ID, session: Database):
    shop = session.query(ShopTable).filter_by(shopid=shopid).first()
    if shop:
        return JSONResponse({"actiontype": shop.actiontype}, status_code=200)
    else:
        return JSONResponse({"message": "Shop not found"}, status_code=404)
