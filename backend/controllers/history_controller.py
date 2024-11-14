from flask import Blueprint, request, jsonify
from datetime import datetime
from models import db, UserHistoryTable, ShopTable
from geopy.distance import geodesic

history_bp = Blueprint('history', __name__)

@history_bp.route('/add-history', methods=['POST'])
def add_history():
    data = request.get_json()
    userid = data.get('userid')
    shopid = data.get('shopid')

    if not userid or not shopid:
        return jsonify({'message': 'Missing userid or shopid'}), 400

    current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    new_history = UserHistoryTable(userid=userid, shopid=shopid, time=current_time)

    try:
        existing_entry = db.session.query(UserHistoryTable).filter_by(userid=userid, shopid=shopid).first()

        if existing_entry:
            db.session.delete(existing_entry)

        user_history_count = db.session.query(UserHistoryTable).filter_by(userid=userid).count()

        if user_history_count >= 5:
            oldest_entry = db.session.query(UserHistoryTable).filter_by(userid=userid).order_by(UserHistoryTable.time.asc()).first()
            db.session.delete(oldest_entry)

        db.session.add(new_history)
        db.session.commit()
        return jsonify({'message': 'History entry added successfully'}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Failed to add history entry', 'error': str(e)}), 500

from flask import jsonify, request
from geopy.distance import geodesic

@history_bp.route('/get-history', methods=['GET'])
def get_history():
    userid = request.args.get('userid')
    user_lat = request.args.get('lat', type=float)
    user_lon = request.args.get('lon', type=float)

    if not userid:
        return jsonify({'message': 'Missing userid'}), 400

    if user_lat is None or user_lon is None:
        return jsonify({'message': 'Latitude and longitude are required'}), 400

    try:
        history_entries = db.session.query(UserHistoryTable, ShopTable).join(
            ShopTable, UserHistoryTable.shopid == ShopTable.shopid
        ).filter(UserHistoryTable.userid == userid).order_by(UserHistoryTable.time.desc()).all()

        user_location = (user_lat, user_lon)
        history_data = []

        for entry in history_entries:
            shop_location = (entry.ShopTable.latitude, entry.ShopTable.longtitude)
            distance = round(geodesic(user_location, shop_location).km, 2)

            history_data.append({
                'shopid': entry.ShopTable.shopid,
                'shopname': entry.ShopTable.shopname,
                'addressname': entry.ShopTable.addressname,
                'website': entry.ShopTable.website,
                'time': entry.UserHistoryTable.time,
                'lat': entry.ShopTable.latitude,
                'lon': entry.ShopTable.longtitude,
                'distance': distance
            })

        return jsonify({'history': history_data}), 200
    except Exception as e:
        return jsonify({'message': 'Failed to retrieve history', 'error': str(e)}), 500

