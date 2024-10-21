import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from config import Config
from models import db, UserTable, ShopTable, ChecklistOptionTable, UserChecklistTable, ForumTable, CommentTable
import pandas as pd
from geopy.distance import geodesic
from dotenv import load_dotenv
from datetime import datetime
import requests

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)
CORS(app)
load_dotenv()

@app.route('/verify', methods=['POST'])
def verify_user():
    data = request.get_json()
    userid = data['userid']
    username = data['username']
    usertype = data['usertype']
    userhashedpassword = data['userhashedpassword']

    # Query the database for a user matching all these details
    user = UserTable.query.filter_by(
        userid=userid,
        username=username,
        usertype=usertype,
        password=userhashedpassword  # Make sure to store a hashed password in localStorage and match it
    ).first()

    if user:
        return jsonify({'message': 'User verified', 'isValid': True}), 200
    else:
        return jsonify({'message': 'User not verified', 'isValid': False}), 401

@app.route('/verify-shop', methods=['POST'])
def verify_shop():
    data = request.get_json()
    userid = data['userid']
    username = data['username']
    usertype = data['usertype']
    userhashedpassword = data['userhashedpassword']

    # Check if the user exists in the database
    user = UserTable.query.filter_by(
        userid=userid,
        username=username,
        usertype=usertype,
        password=userhashedpassword  # Make sure to store a hashed password in localStorage and match it
    ).first()
    
    if user:
            # Check if the usertype is 'shop'
            if user.usertype == "shop":
                return jsonify({'isValid': True, 'usertype': user.usertype}), 200
            else:
                return jsonify({'isValid': False, 'message': 'User is not a shop.'}), 403
        
    return jsonify({'isValid': False, 'message': 'Invalid credentials.'}), 401

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

@app.route('/get-username/<int:userid>', methods=['GET'])
def get_username(userid):
    user = UserTable.query.filter_by(userid=userid).first()
    if user:
        return jsonify({'username': user.username}), 200
    return jsonify({'message': 'User not found'}), 404

@app.route('/get-usertype/<int:userid>', methods=['GET'])
def get_usertype(userid):
    user = UserTable.query.filter_by(userid=userid).first()
    if user:
        return jsonify({'usertype': user.usertype}), 200
    return jsonify({'message': 'User not found'}), 404

@app.route('/get-shop-details/<int:shopid>', methods=['GET'])
def get_shop_details(shopid):
    shop = ShopTable.query.get(shopid)
    if shop:
        return jsonify({
            'shopname': shop.shopname,
            'latitiude': shop.latitude,
            'longtitude': shop.longtitude,
            'addressname': shop.addressname,
            'website': shop.website,
            'actiontype': shop.actiontype
        }), 200
    return jsonify({'message': 'Shop not found'}), 404

@app.route('/add-shop', methods=['POST'])
def signup_shop():
    data = request.get_json()
    shopid = data.get('userid')  # Assuming `userid` is being passed to associate the shop
    shopname = data['shopname']
    addressname = data['addressname']
    website = data.get('website')
    actiontype = data['actiontype']
    latitude = data.get('latitude')
    longtitude = data.get('longtitude')

    # Check if latitude and longitude are provided
    if latitude is None or longtitude is None:
        return jsonify({'error': 'Invalid address; unable to get coordinates.'}), 400

    # Check if shop with the given shopid already exists
    existing_shop = ShopTable.query.filter_by(shopid=shopid).first()

    if existing_shop:
        # Update existing shop record
        existing_shop.shopname = shopname
        existing_shop.addressname = addressname
        existing_shop.website = website
        existing_shop.actiontype = actiontype
        existing_shop.latitude = latitude
        existing_shop.longtitude = longtitude

        db.session.commit()
        return jsonify({'message': 'Shop information updated successfully!'}), 200
    else:
        # Create a new shop record
        new_shop = ShopTable(
            shopid=shopid,  # Associate with the user ID as the primary key
            shopname=shopname,
            addressname=addressname,
            website=website,
            actiontype=actiontype,
            latitude=latitude,
            longtitude=longtitude
        )
        
        db.session.add(new_shop)
        db.session.commit()
        return jsonify({'message': 'Shop registered successfully!'}), 201

@app.route('/remove-shop', methods=['POST'])
def remove_shop():
    data = request.get_json()
    shopid = data.get('shopid')  # Assuming 'shopId' is passed from the frontend

    if not shopid:
        return jsonify({'error': 'Shop ID is required.'}), 400

    # Find the shop by shopid
    shop_to_delete = ShopTable.query.filter_by(shopid=shopid).first()

    if not shop_to_delete:
        return jsonify({'error': 'Shop not found.'}), 404

    # Delete the shop record
    db.session.delete(shop_to_delete)
    db.session.commit()

    return jsonify({'message': 'Shop removed successfully!'}), 200


@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data['username']
    password = data['password']

    user = UserTable.query.filter_by(username=username).first()

    if user and user.check_password(password):
        return jsonify({'message': 'Login successful', 'usertype': user.usertype, 'userid': user.userid, 'userpassword': user.password}), 200
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

GOOGLE_MAPS_API_KEY = os.getenv("REACT_APP_GOOGLE_MAPS_API_KEY")

@app.route('/get-current-coordinates', methods=['POST'])
def get_current_coordinates():
    try:
        # Use the Google Maps Geolocation API
        url = f'https://www.googleapis.com/geolocation/v1/geolocate?key={GOOGLE_MAPS_API_KEY}'
        
        # Send a POST request to the Geolocation API
        response = requests.post(url)
        data = response.json()

        # Check if the request was successful
        if 'location' in data:
            lat = data['location']['lat']
            lon = data['location']['lng']
            return jsonify({'lat': lat, 'lon': lon}), 200
        else:
            return jsonify({'error': 'Unable to retrieve current coordinates'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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

@app.route('/get-location-name', methods=['POST'])
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

@app.route('/forums/details/<int:forumid>', methods=['GET'])
def get_forum_details(forumid):
    try:
        # Assuming ForumTable is the model corresponding to forumtable in your database
        forum = ForumTable.query.filter_by(forumid=forumid).first()

        if forum:
            forum_details = {
                'forumtext': forum.forumtext,
                'posterid': forum.posterid,
                'time': forum.time,
                'postername': forum.poster.username
            }
            return jsonify(forum_details), 200
        else:
            return jsonify({'error': 'Forum not found'}), 404
    except Exception as e:
        print('Error fetching forum details:', e)
        return jsonify({'error': 'Server error'}), 500
    
@app.route('/forums/add', methods=['POST'])
def add_forum():
    data = request.get_json()
    forumtext = data['forumtext']
    shopid = data['shopid']
    posterid = data['posterid']
    time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    new_forum = ForumTable(forumtext=forumtext, shopid=shopid, posterid=posterid, time=time)
    db.session.add(new_forum)
    db.session.commit()

    return jsonify({'message': 'Forum added successfully'}), 201

@app.route('/forums/edit/<int:forumid>', methods=['PUT'])
def edit_forum(forumid):
    data = request.get_json()
    new_forumtext = data['forumtext']

    # Find the forum entry by ID
    forum = ForumTable.query.get(forumid)
    
    if not forum:
        return jsonify({'error': 'Forum not found'}), 404

    # Update the forum text
    forum.forumtext = new_forumtext
    db.session.commit()
    
    return jsonify({'message': 'Forum updated successfully'}), 200

@app.route('/forums/delete/<int:forumid>', methods=['DELETE'])
def delete_forum(forumid):
    # Find the forum entry by ID
    forum = ForumTable.query.get(forumid)
    
    if not forum:
        return jsonify({'error': 'Forum not found'}), 404

    # Delete associated comments
    CommentTable.query.filter_by(forumid=forumid).delete()

    # Delete the forum entry
    db.session.delete(forum)
    db.session.commit()
    
    return jsonify({'message': 'Forum deleted successfully'}), 200

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
            'encodedimage': comment.encodedimage,
            'time': comment.time,
            'deleted': comment.deleted,
            'postername': comment.poster.username 
        }
        for comment in comments
    ]

    return jsonify(comment_list), 200

@app.route('/comments/add', methods=['POST'])
def add_comment():
    data = request.get_json()
    forumid = data['forumid']
    commenttext = data['commenttext']
    posterid = data['posterid']
    encodedimage = data.get('encodedimage')  # Get the encoded image
    time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    new_comment = CommentTable(
        forumid=forumid,
        commenttext=commenttext,
        posterid=posterid,
        time=time,
        encodedimage=encodedimage  # Store the encoded image
    )
    db.session.add(new_comment)
    db.session.commit()

    return jsonify({'message': 'Comment added successfully'}), 201

@app.route('/comments/reply/<int:commentid>', methods=['POST'])
def reply_comment(commentid):
    data = request.json
    forumid = data['forumid']
    commenttext = data['commenttext']
    posterid = data['posterid']
    encodedimage = data.get('encodedimage')
    time = data.get('time', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

    # Logic to save the reply in the database, e.g.:
    new_reply = CommentTable(forumid=forumid, commenttext=commenttext, posterid=posterid, time=time, replyid=commentid, encodedimage=encodedimage)
    db.session.add(new_reply)
    db.session.commit()

    return jsonify({'message': 'Reply added successfully'}), 201

@app.route('/comments/edit/<int:commentid>', methods=['PUT'])
def edit_comment(commentid):
    data = request.get_json()
    new_commenttext = data['commenttext']

    comment = CommentTable.query.get(commentid)
    if not comment:
        return jsonify({'error': 'Comment not found'}), 404

    comment.commenttext = new_commenttext
    db.session.commit()

    return jsonify({'message': 'Comment updated successfully'}), 200

# @app.route('/comments/delete/<int:commentid>', methods=['DELETE'])
# def delete_comment(commentid):
#     comment = CommentTable.query.get(commentid)
#     if not comment:
#         return jsonify({'error': 'Comment not found'}), 404

#     db.session.delete(comment)
#     db.session.commit()

#     return jsonify({'message': 'Comment deleted successfully'}), 200

@app.route('/comments/delete/<int:commentid>', methods=['PUT'])
def delete_comment(commentid):
    comment = CommentTable.query.get(commentid)
    if not comment:
        return jsonify({'error': 'Comment not found'}), 404

    # Instead of deleting, mark the comment as deleted
    comment.commenttext = '[deleted]'
    comment.deleted = True
    db.session.commit()

    return jsonify({'message': 'Comment marked as deleted successfully'}), 200


if __name__ == '__main__':
    app.run(debug=True)
