from flask import Blueprint, request, jsonify
from models import UserChecklistTable, ShopTable
from geopy.distance import geodesic
import os
import requests

map_bp = Blueprint('map', __name__)

GOOGLE_MAPS_API_KEY = os.getenv("REACT_APP_GOOGLE_MAPS_API_KEY")

@map_bp.route('/nearby-locations', methods=['POST'])
def get_nearby_locations():
    data = request.get_json()
    user_lat = data.get('lat')
    user_lon = data.get('lon')
    action_type = data.get('actiontype')
    user_id = data.get('userid')

    if not user_lat or not user_lon or not action_type or not user_id:
        return jsonify({'error': 'Latitude, longitude, action type, and user ID are required'}), 400

    # Get checklist option IDs for the user
    user_checklist_options = UserChecklistTable.query.filter_by(userid=user_id).all()
    checklist_option_ids = {option.checklistoptionid for option in user_checklist_options}

    # Query shops with the specified action type
    shops = ShopTable.query.filter_by(actiontype=action_type).all()

    valid_shops = []
    for shop in shops:
        # Query to get checklist option IDs for the current shop
        shop_checklist_options = UserChecklistTable.query.filter_by(userid=shop.shopid).all()
        shop_option_ids = {option.checklistoptionid for option in shop_checklist_options}
        
        if checklist_option_ids.issubset(shop_option_ids):
            valid_shops.append(shop)

    user_location = (user_lat, user_lon)
    shop_list = []
    
    for shop in valid_shops:
        shop_location = (shop.latitude, shop.longtitude)
        distance = geodesic(user_location, shop_location).km
        shop_list.append({
            'shopid': shop.shopid,
            'shopname': shop.shopname,
            'latitude': shop.latitude,
            'longitude': shop.longtitude,
            'addressname': shop.addressname,
            'website': shop.website,
            'distance': distance
        })

    # Sort shops by distance and return top 5
    nearby_shops = sorted(shop_list, key=lambda x: x['distance'])[:5]
    
    return jsonify(nearby_shops), 200

@map_bp.route('/get-current-coordinates', methods=['POST'])
def get_current_coordinates():
    try:
        url = f'https://www.googleapis.com/geolocation/v1/geolocate?key={GOOGLE_MAPS_API_KEY}'
        
        response = requests.post(url)
        data = response.json()

        if 'location' in data:
            lat = data['location']['lat']
            lon = data['location']['lng']
            return jsonify({'lat': lat, 'lon': lon}), 200
        else:
            return jsonify({'error': 'Unable to retrieve current coordinates'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@map_bp.route('/get-coordinates', methods=['POST'])
def get_coordinates():
    address = request.json.get('address')
    if not address:
        return jsonify({'error': 'Address is required'}), 400

    url = f'https://maps.googleapis.com/maps/api/geocode/json?address={address}&key={GOOGLE_MAPS_API_KEY}'
    response = requests.get(url)
    data = response.json()

    if data['status'] == 'OK':
        location = data['results'][0]['geometry']['location']
        return jsonify({'lat': location['lat'], 'lon': location['lng']}), 200
    else:
        return jsonify({'error': 'Invalid address'}), 400

@map_bp.route('/get-location-name', methods=['POST'])
def get_location_name():
    data = request.json
    lat = data.get('lat')
    lon = data.get('lon')

    if not lat or not lon:
        return jsonify({'error': 'Latitude and longitude are required'}), 400

    url = f'https://maps.googleapis.com/maps/api/geocode/json?latlng={lat},{lon}&key={GOOGLE_MAPS_API_KEY}'
    response = requests.get(url)
    data = response.json()

    if data['status'] == 'OK':
        location_name = data['results'][0]['formatted_address']
        return jsonify({'locationName': location_name}), 200
    else:
        return jsonify({'error': 'Unable to retrieve location name'}), 400

@map_bp.route('/get-directions', methods=['POST'])
def get_directions():
    data = request.get_json()
    user_location = data.get('user_location')
    destination = data.get('destination')
    mode = data.get('mode', 'DRIVING')

    if not user_location or not destination:
        return jsonify({'error': 'User location and destination are required'}), 400

    directions_url = f'https://maps.googleapis.com/maps/api/directions/json?origin={user_location["lat"]},{user_location["lon"]}&destination={destination["lat"]},{destination["lon"]}&mode={mode}&key={GOOGLE_MAPS_API_KEY}'
    
    response = requests.get(directions_url)
    directions_data = response.json()

    if directions_data['status'] == 'OK':
        routes = directions_data['routes'][0]
        steps = routes['legs'][0]['steps']
        
        directions = []
        for step in steps:
            directions.append(step['html_instructions'])

        return jsonify({'directions': directions}), 200
    else:
        return jsonify({'error': 'Unable to get directions'}), 400
