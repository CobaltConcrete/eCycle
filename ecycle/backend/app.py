import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from config import Config
from models import db, UserTable, ShopTable, ChecklistOptionTable, UserChecklistTable, ForumTable, CommentTable
import pandas as pd
from geopy.distance import geodesic
from dotenv import load_dotenv
import requests

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)
CORS(app)
load_dotenv()

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data['username']
    password = data['password']
    usertype = data.get('usertype', 'user')

    if UserTable.query.filter_by(username=username).first() is not None:
        return jsonify({'error': 'Username already exists'}), 400

    new_user = UserTable.create_user(username, password, usertype)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User registered successfully'}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data['username']
    password = data['password']

    user = UserTable.query.filter_by(username=username).first()

    if user and user.check_password(password):
        return jsonify({'message': 'Login successful', 'usertype': user.usertype, 'userid': user.userid}), 200
    else:
        return jsonify({'error': 'Invalid username or password'}), 401

@app.route('/checklist-options', methods=['GET'])
def get_checklist_options():
    options = ChecklistOptionTable.query.all()
    return jsonify([{'checklistoptionid': option.checklistoptionid, 'checklistoptiontype': option.checklistoptiontype} for option in options]), 200

@app.route('/user-checklist', methods=['POST'])
def save_user_checklist():
    data = request.get_json()
    userid = data['userid']
    checklistoptionids = data['checklistoptionids']

    # Delete existing options for this user
    UserChecklistTable.query.filter_by(userid=userid).delete()

    # Add new options
    for checklistoptionid in checklistoptionids:
        user_checklist = UserChecklistTable(userid=userid, checklistoptionid=checklistoptionid)
        db.session.add(user_checklist)

    db.session.commit()
    return jsonify({'message': 'Checklist options saved successfully'}), 201

# # Load repair and disposal locations from CSV files
# repair_df = pd.read_csv('./locationCSV/repair/repair.csv')
# dispose_df = pd.read_csv('./locationCSV/ewaste/ewaste.csv')

# # Route for nearby repair locations
# @app.route('/nearby-repair-locations', methods=['POST'])
# def nearby_repair_locations():
#     return get_nearby_locations(repair_df)

# # Route for nearby disposal locations
# @app.route('/nearby-dispose-locations', methods=['POST'])
# def nearby_dispose_locations():
#     return get_nearby_locations(dispose_df)

# # Helper function to calculate nearby locations
# def get_nearby_locations(df):
#     data = request.get_json()
#     user_lat = data.get('lat')
#     user_lon = data.get('lon')

#     if user_lat is None or user_lon is None:
#         return jsonify({'error': 'User location is required'}), 400

#     user_location = (user_lat, user_lon)
#     df['distance'] = df.apply(lambda row: geodesic(
#         user_location, (row['latitude'], row['longitude'])
#     ).km, axis=1)

#     nearby_locations = df.sort_values('distance').head(5)
#     return jsonify(nearby_locations.to_dict(orient='records')), 200

# @app.route('/nearby-locations', methods=['POST'])
# def get_nearby_locations():
#     data = request.get_json()
#     user_lat = data.get('lat')
#     user_lon = data.get('lon')
#     action_type = data.get('actiontype')

#     if not user_lat or not user_lon or not action_type:
#         return jsonify({'error': 'Latitude, longitude, and action type are required'}), 400

#     # Query shops with the specified action type
#     shops = ShopTable.query.filter_by(actiontype=action_type).all()

#     # Calculate distance from user location and sort by distance
#     user_location = (user_lat, user_lon)
#     shop_list = []
    
#     for shop in shops:
#         shop_location = (shop.latitude, shop.longtitude)
#         distance = geodesic(user_location, shop_location).km
#         shop_list.append({
#             'shopid': shop.shopid,
#             'shopname': shop.shopname,
#             'latitude': shop.latitude,
#             'longitude': shop.longtitude,
#             'addressname': shop.addressname,
#             'website': shop.website,
#             'distance': distance
#         })

#     # Sort shops by distance and return top 5
#     nearby_shops = sorted(shop_list, key=lambda x: x['distance'])[:5]
    
#     return jsonify(nearby_shops), 200

@app.route('/nearby-locations', methods=['POST'])
def get_nearby_locations():
    data = request.get_json()
    user_lat = data.get('lat')
    user_lon = data.get('lon')
    action_type = data.get('actiontype')
    user_id = data.get('userid')  # Assuming you also send userid in the request

    if not user_lat or not user_lon or not action_type or not user_id:
        return jsonify({'error': 'Latitude, longitude, action type, and user ID are required'}), 400

    # Get checklist option IDs for the user
    user_checklist_options = UserChecklistTable.query.filter_by(userid=user_id).all()
    checklist_option_ids = {option.checklistoptionid for option in user_checklist_options}

    # Query shops with the specified action type
    shops = ShopTable.query.filter_by(actiontype=action_type).all()

    # Filter shops to keep only those that have all the checklist option IDs
    valid_shops = []
    for shop in shops:
        # Query to get checklist option IDs for the current shop
        shop_checklist_options = UserChecklistTable.query.filter_by(userid=shop.shopid).all()
        shop_option_ids = {option.checklistoptionid for option in shop_checklist_options}
        
        # Check if shop_option_ids contains all checklist_option_ids
        if checklist_option_ids.issubset(shop_option_ids):
            valid_shops.append(shop)

    # Calculate distance from user location and sort by distance
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


GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

@app.route('/get-coordinates', methods=['POST'])
def get_coordinates():
    address = request.json.get('address')
    if not address:
        return jsonify({'error': 'Address is required'}), 400

    url = f'https://maps.googleapis.com/maps/api/geocode/json?address={address}&key={GOOGLE_MAPS_API_KEY}'
    response = requests.get(url)
    data = response.json()

    if data['status'] == 'OK':
        location = data['results'][0]['geometry']['location']
        print(location)
        return jsonify({'lat': location['lat'], 'lon': location['lng']}), 200
    else:
        return jsonify({'error': 'Invalid address'}), 400

# @app.route('/get-directions', methods=['POST'])
# def get_directions():
#     data = request.get_json()
#     user_location = data.get('user_location')
#     destination = data.get('destination')

#     if not user_location or not destination:
#         return jsonify({'error': 'User location and destination are required'}), 400

#     directions_url = f'https://maps.googleapis.com/maps/api/directions/json?origin={user_location["lat"]},{user_location["lon"]}&destination={destination["lat"]},{destination["lon"]}&key={GOOGLE_MAPS_API_KEY}'
    
#     response = requests.get(directions_url)
#     directions_data = response.json()

#     if directions_data['status'] == 'OK':
#         routes = directions_data['routes'][0]
#         steps = routes['legs'][0]['steps']
        
#         directions = []
#         for step in steps:
#             directions.append(step['html_instructions'])  # Get HTML instructions for directions

#         return jsonify({'directions': directions}), 200
#     else:
#         return jsonify({'error': 'Unable to get directions'}), 400

@app.route('/get-directions', methods=['POST'])
def get_directions():
    data = request.get_json()
    user_location = data.get('user_location')
    destination = data.get('destination')
    mode = data.get('mode', 'DRIVING')  # Default mode is DRIVING

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
            directions.append(step['html_instructions'])  # Get HTML instructions for directions

        return jsonify({'directions': directions}), 200
    else:
        return jsonify({'error': 'Unable to get directions'}), 400

@app.route('/forums/<int:shopid>', methods=['GET'])
def get_forums(shopid):
    forums = ForumTable.query.filter_by(shopid=shopid).order_by(ForumTable.time.desc()).all()
    
    forum_list = [
        {
            'forumid': forum.forumid,
            'forumtext': forum.forumtext,
            'shopid': forum.shopid,
            'posterid': forum.posterid,
            'time': forum.time,
            'postername': forum.poster.username  # Access the username from the UserTable relationship
        } 
        for forum in forums
    ]

    return jsonify(forum_list), 200

@app.route('/comments/<int:forumid>', methods=['GET'])
def get_comments(forumid):
    comments = CommentTable.query.filter_by(forumid=forumid).order_by(CommentTable.time.desc()).all()
    
    comment_list = [
        {
            'commentid': comment.commentid,
            'commenttext': comment.commenttext,
            'forumid': comment.forumid,
            'posterid': comment.posterid,
            'replyid': comment.replyid,
            'time': comment.time,
            'postername': comment.poster.username  # Assuming postername is available in UserTable
        }
        for comment in comments
    ]

    return jsonify(comment_list), 200



if __name__ == '__main__':
    app.run(debug=True)
