# app.py
from flask import Flask, Blueprint, request, jsonify
from flask_cors import CORS
import os
import requests

# Import your ORM models
from backend.models import ForumTable  # Adjust according to your project structure

# Create Flask app
app = Flask(__name__)
CORS(app)  # allow all origins for local dev

# ---------------------------
# Google Maps Blueprint
# ---------------------------
GOOGLE_MAPS_API_KEY = "AIzaSyBhnHVzbbHB1QJXw1EW5PSMBIqbuyQ8RrM"
map_bp = Blueprint('map', __name__)

@map_bp.route('/get-coordinates', methods=['POST'])
def get_coordinates():
    data = request.get_json()
    address = data.get('address')
    if not address:
        return jsonify({'error': 'Address is required'}), 400

    url = f'https://maps.googleapis.com/maps/api/geocode/json?address={address}&key={GOOGLE_MAPS_API_KEY}'
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        return jsonify({'error': f'Failed to call Google Maps API: {str(e)}'}), 500

    if data.get('status') == 'OK' and data.get('results'):
        location = data['results'][0]['geometry']['location']
        return jsonify({'lat': location['lat'], 'lng': location['lng']}), 200
    else:
        error_msg = data.get('error_message', 'Invalid address')
        return jsonify({'error': error_msg}), 400

# Register Google Maps blueprint
app.register_blueprint(map_bp, url_prefix='/map')


# ---------------------------
# Forum Blueprint
# ---------------------------
forum_bp = Blueprint('forum', __name__)

@forum_bp.route('/forums/<int:shopid>', methods=['GET'])
def get_forums(shopid):
    forums = ForumTable.query.filter_by(shopid=shopid).order_by(ForumTable.time.desc()).all()
    
    forum_list = [
        {
            'forumid': forum.forumid,
            'forumtext': forum.forumtext,
            'shopid': forum.shopid,
            'posterid': forum.posterid,
            'time': forum.time,
            'postername': forum.poster.username
        } 
        for forum in forums
    ]

    return jsonify(forum_list), 200

# Register forum blueprint
app.register_blueprint(forum_bp, url_prefix='/forum')


# ---------------------------
# Run locally
# ---------------------------
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
