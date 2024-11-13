from flask import Blueprint, request, jsonify
from datetime import datetime
from models import db, UserHistoryTable, ShopTable

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

@history_bp.route('/get-history', methods=['GET'])
def get_history():
    userid = request.args.get('userid')

    if not userid:
        return jsonify({'message': 'Missing userid'}), 400

    try:
        history_entries = db.session.query(UserHistoryTable, ShopTable).join(
            ShopTable, UserHistoryTable.shopid == ShopTable.shopid
        ).filter(UserHistoryTable.userid == userid).order_by(UserHistoryTable.time.desc()).all()

        history_data = [
            {
                'shopid': entry.ShopTable.shopid,
                'shopname': entry.ShopTable.shopname,
                'addressname': entry.ShopTable.addressname,
                'website': entry.ShopTable.website,
                'time': entry.UserHistoryTable.time,
                'lat' : entry.ShopTable.latitude,
                'lon' : entry.ShopTable.longtitude
            }
            for entry in history_entries
        ]

        return jsonify({'history': history_data}), 200
    except Exception as e:
        return jsonify({'message': 'Failed to retrieve history', 'error': str(e)}), 500

