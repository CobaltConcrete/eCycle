from datetime import datetime

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from geopy.distance import geodesic

from auth import CurrentUser, require_owner
from database import Database
from models import ShopTable, UserHistoryTable
from schemas import ID, HistoryInput, Latitude, Longitude

router = APIRouter()


@router.post("/add-history", status_code=201)
def add_history(user: CurrentUser, payload: HistoryInput, session: Database):
    require_owner(user, payload.userid)
    data = payload.model_dump()
    userid = data.get("userid")
    shopid = data.get("shopid")
    if not userid or not shopid:
        return JSONResponse({"message": "Missing userid or shopid"}, status_code=400)
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    new_history = UserHistoryTable(userid=userid, shopid=shopid, time=current_time)
    try:
        existing_entry = (
            session.query(UserHistoryTable)
            .filter_by(userid=userid, shopid=shopid)
            .first()
        )
        if existing_entry:
            session.delete(existing_entry)
        user_history_count = (
            session.query(UserHistoryTable).filter_by(userid=userid).count()
        )
        if user_history_count >= 5:
            oldest_entry = (
                session.query(UserHistoryTable)
                .filter_by(userid=userid)
                .order_by(UserHistoryTable.time.asc())
                .first()
            )
            session.delete(oldest_entry)
        session.add(new_history)
        session.commit()
        return JSONResponse(
            {"message": "History entry added successfully"}, status_code=201
        )
    except Exception:
        session.rollback()
        return JSONResponse(
            {
                "message": "Failed to add history entry",
                "error": "Operation failed; please try again",
            },
            status_code=500,
        )


@router.get("/get-history")
def get_history(
    user: CurrentUser, userid: ID, lat: Latitude, lon: Longitude, session: Database
):
    require_owner(user, userid)
    user_lat = lat
    user_lon = lon
    if not userid:
        return JSONResponse({"message": "Missing userid"}, status_code=400)
    if user_lat is None or user_lon is None:
        return JSONResponse(
            {"message": "Latitude and longitude are required"}, status_code=400
        )
    try:
        history_entries = (
            session.query(UserHistoryTable, ShopTable)
            .join(ShopTable, UserHistoryTable.shopid == ShopTable.shopid)
            .filter(UserHistoryTable.userid == userid)
            .order_by(UserHistoryTable.time.desc())
            .all()
        )
        user_location = (user_lat, user_lon)
        history_data = []
        for entry in history_entries:
            shop_location = (entry.ShopTable.latitude, entry.ShopTable.longtitude)
            distance = round(geodesic(user_location, shop_location).km, 2)
            history_data.append(
                {
                    "shopid": entry.ShopTable.shopid,
                    "shopname": entry.ShopTable.shopname,
                    "addressname": entry.ShopTable.addressname,
                    "website": entry.ShopTable.website,
                    "time": entry.UserHistoryTable.time,
                    "lat": entry.ShopTable.latitude,
                    "lon": entry.ShopTable.longtitude,
                    "distance": distance,
                }
            )
        return JSONResponse({"history": history_data}, status_code=200)
    except Exception:
        return JSONResponse(
            {
                "message": "Failed to retrieve history",
                "error": "Operation failed; please try again",
            },
            status_code=500,
        )
