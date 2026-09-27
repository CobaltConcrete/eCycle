import os

import requests
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from geopy.distance import geodesic
from sqlalchemy import func, select

from auth import CurrentUser, require_owner
from database import Database
from models import ShopTable, UserChecklistTable
from routes_service import compute_route
from schemas import (
    AddressInput,
    CoordinatesInput,
    DirectionsInput,
    DirectionsResponse,
    NearbyInput,
    NearbyLocation,
)

router = APIRouter()
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")


@router.post("/nearby-locations", response_model=list[NearbyLocation])
def get_nearby_locations(user: CurrentUser, payload: NearbyInput, session: Database):
    require_owner(user, payload.userid)
    user_lat, user_lon = payload.lat, payload.lon
    action_type, user_id = payload.actiontype, payload.userid
    user_checklist_options = (
        session.query(UserChecklistTable).filter_by(userid=user_id).all()
    )
    checklist_option_ids = {
        option.checklistoptionid for option in user_checklist_options
    }
    shops = session.query(ShopTable).filter_by(actiontype=action_type)
    if checklist_option_ids:
        matching_shops = (
            select(UserChecklistTable.userid)
            .where(UserChecklistTable.checklistoptionid.in_(checklist_option_ids))
            .group_by(UserChecklistTable.userid)
            .having(func.count() == len(checklist_option_ids))
        )
        shops = shops.filter(ShopTable.shopid.in_(matching_shops))
    user_location = (user_lat, user_lon)
    shop_list = []
    for shop in shops:
        shop_location = (shop.latitude, shop.longtitude)
        distance = geodesic(user_location, shop_location).km
        shop_list.append(
            {
                "shopid": shop.shopid,
                "shopname": shop.shopname,
                "latitude": shop.latitude,
                "longitude": shop.longtitude,
                "addressname": shop.addressname,
                "website": shop.website,
                "distance": distance,
            }
        )
    # Return full-precision distances for client radius filtering. Round for display only.
    return sorted(shop_list, key=lambda x: (x["distance"], x["shopid"]))


@router.post("/get-current-coordinates", deprecated=True)
def get_current_coordinates():
    raise HTTPException(
        410,
        "Use browser geolocation or enter an address; the server cannot locate your device",
    )


@router.post("/get-coordinates")
def get_coordinates(payload: AddressInput):
    address = payload.model_dump().get("address")
    if not address:
        return JSONResponse({"error": "Address is required"}, status_code=400)
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    response = requests.get(
        url, params={"address": address, "key": GOOGLE_MAPS_API_KEY}, timeout=10
    )
    data = response.json()
    if data.get("status") == "OK" and data.get("results"):
        location = data["results"][0]["geometry"]["location"]
        return JSONResponse(
            {"lat": location["lat"], "lng": location["lng"]}, status_code=200
        )
    else:
        error_msg = data.get("error_message", "Invalid address")
        return JSONResponse({"error": error_msg}, status_code=400)


@router.post("/get-location-name")
def get_location_name(payload: CoordinatesInput):
    data = payload.model_dump()
    lat = data.get("lat")
    lon = data.get("lon")
    url = f"https://maps.googleapis.com/maps/api/geocode/json?latlng={lat},{lon}&key={GOOGLE_MAPS_API_KEY}"
    response = requests.get(url, timeout=10)
    data = response.json()
    if data["status"] == "OK":
        location_name = data["results"][0]["formatted_address"]
        return JSONResponse({"locationName": location_name}, status_code=200)
    else:
        return JSONResponse(
            {"error": "Unable to retrieve location name"}, status_code=400
        )


@router.post("/get-directions", response_model=DirectionsResponse)
def get_directions(payload: DirectionsInput):
    return compute_route(payload)
