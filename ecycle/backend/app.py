from flask import Flask, request, jsonify
from flask_cors import CORS
from config import Config
from models import db, User, ChecklistOption, UserChecklist
import pandas as pd
from geopy.distance import geodesic

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)
CORS(app)

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data['username']
    password = data['password']
    usertype = data.get('usertype', 'user')

    if User.query.filter_by(username=username).first() is not None:
        return jsonify({'error': 'Username already exists'}), 400

    new_user = User.create_user(username, password, usertype)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User registered successfully'}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data['username']
    password = data['password']

    user = User.query.filter_by(username=username).first()

    if user and user.check_password(password):
        return jsonify({'message': 'Login successful', 'usertype': user.usertype, 'userid': user.userid}), 200
    else:
        return jsonify({'error': 'Invalid username or password'}), 401

@app.route('/checklist-options', methods=['GET'])
def get_checklist_options():
    options = ChecklistOption.query.all()
    return jsonify([{'checklistoptionid': option.checklistoptionid, 'checklistoptiontype': option.checklistoptiontype} for option in options]), 200

@app.route('/user-checklist', methods=['POST'])
def save_user_checklist():
    data = request.get_json()
    userid = data['userid']
    checklistoptionids = data['checklistoptionids']

    # Delete existing options for this user
    UserChecklist.query.filter_by(userid=userid).delete()

    # Add new options
    for checklistoptionid in checklistoptionids:
        user_checklist = UserChecklist(userid=userid, checklistoptionid=checklistoptionid)
        db.session.add(user_checklist)

    db.session.commit()
    return jsonify({'message': 'Checklist options saved successfully'}), 201


# Load repair and disposal locations from CSV files
repair_df = pd.read_csv('./locationCSV/repairfinal.csv')
dispose_df = pd.read_csv('./locationCSV/ewastefinal.csv')

# Route for nearby repair locations
@app.route('/nearby-repair-locations', methods=['POST'])
def nearby_repair_locations():
    return get_nearby_locations(repair_df)

# Route for nearby disposal locations
@app.route('/nearby-dispose-locations', methods=['POST'])
def nearby_dispose_locations():
    return get_nearby_locations(dispose_df)

# Helper function to calculate nearby locations
def get_nearby_locations(df):
    data = request.get_json()
    user_lat = data.get('lat')
    user_lon = data.get('lon')

    if user_lat is None or user_lon is None:
        return jsonify({'error': 'User location is required'}), 400

    user_location = (user_lat, user_lon)
    df['distance'] = df.apply(lambda row: geodesic(
        user_location, (row['latitude'], row['longitude'])
    ).km, axis=1)

    nearby_locations = df.sort_values('distance').head(5)
    return jsonify(nearby_locations.to_dict(orient='records')), 200

if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Create tables if not exist
    app.run(debug=True)
