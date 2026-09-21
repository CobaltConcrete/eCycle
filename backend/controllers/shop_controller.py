from fastapi import APIRouter
from fastapi.responses import JSONResponse

from auth import CurrentUser, profile, require_owner, require_role
from database import Database
from models import CommentTable, ForumTable, ReportTable, ShopTable, UserHistoryTable
from points import refresh_points
from schemas import ID, ShopIdInput, ShopInput

router = APIRouter()


@router.post("/verify-shop")
def verify_shop(user: CurrentUser):
    require_role(user, "shop")
    return {"isValid": True, **profile(user)}


@router.get("/get-shop-details/{shopid:int}")
def get_shop_details(shopid: ID, session: Database):
    shop = session.get(ShopTable, shopid)
    if shop:
        return JSONResponse(
            {
                "shopid": shop.shopid,
                "shopname": shop.shopname,
                "latitude": shop.latitude,
                "longtitude": shop.longtitude,
                "addressname": shop.addressname,
                "website": shop.website,
                "actiontype": shop.actiontype,
            },
            status_code=200,
        )
    return JSONResponse({"message": "Shop not found"}, status_code=404)


@router.post("/add-shop")
def signup_shop(user: CurrentUser, payload: ShopInput, session: Database):
    require_role(user, "shop")
    require_owner(user, payload.userid)
    data = payload.model_dump()
    shopid = data.get("userid")
    shopname = data["shopname"]
    addressname = data["addressname"]
    website = data.get("website")
    actiontype = data["actiontype"]
    latitude = data.get("latitude")
    longtitude = data.get("longtitude")
    if latitude is None or longtitude is None:
        return JSONResponse(
            {"error": "Invalid address; unable to get coordinates."}, status_code=400
        )
    existing_shop = session.query(ShopTable).filter_by(shopid=shopid).first()
    if existing_shop:
        existing_shop.shopname = shopname
        existing_shop.addressname = addressname
        existing_shop.website = website
        existing_shop.actiontype = actiontype
        existing_shop.latitude = latitude
        existing_shop.longtitude = longtitude
        session.commit()
        return JSONResponse(
            {"message": "Shop information updated successfully!"}, status_code=200
        )
    else:
        new_shop = ShopTable(
            shopid=shopid,
            shopname=shopname,
            addressname=addressname,
            website=website,
            actiontype=actiontype,
            latitude=latitude,
            longtitude=longtitude,
        )
        session.add(new_shop)
        session.commit()
        return JSONResponse(
            {"message": "Shop registered successfully!"}, status_code=201
        )


@router.post("/remove-shop")
def remove_shop(user: CurrentUser, payload: ShopIdInput, session: Database):
    require_role(user, "shop", "admin")
    require_owner(user, payload.shopid, admin=True)
    data = payload.model_dump()
    shopid = data.get("shopid")
    if not shopid:
        return JSONResponse({"error": "Shop ID is required."}, status_code=400)
    shop_to_delete = session.query(ShopTable).filter_by(shopid=shopid).first()
    if not shop_to_delete:
        return JSONResponse({"error": "Shop not found."}, status_code=404)
    forums_to_delete = session.query(ForumTable).filter_by(shopid=shopid).all()
    affected_authors = set()
    for forum in forums_to_delete:
        affected_authors.add(forum.posterid)
        affected_authors.update(
            row[0]
            for row in session.query(CommentTable.posterid).filter_by(
                forumid=forum.forumid
            )
        )
        comment_ids = session.query(CommentTable.commentid).filter_by(
            forumid=forum.forumid
        )
        session.query(ReportTable).filter(
            ReportTable.commentid.in_(comment_ids)
        ).delete(synchronize_session=False)
        session.query(CommentTable).filter_by(forumid=forum.forumid).delete()
        session.delete(forum)
    session.query(UserHistoryTable).filter_by(shopid=shopid).delete()
    session.delete(shop_to_delete)
    refresh_points(session, affected_authors)
    session.commit()
    return JSONResponse(
        {
            "message": "Shop, its associated forums, and user history entries removed successfully!"
        },
        status_code=200,
    )
