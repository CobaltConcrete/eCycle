from flask import Blueprint, request, jsonify
from models import db, UserTable, UserChecklistTable, ForumTable, CommentTable

user_bp = Blueprint('user', __name__)

@user_bp.route('/verify', methods=['POST'])
def verify_user():
    data = request.get_json()
    userid = data['userid']
    username = data['username']
    usertype = data['usertype']
    userhashedpassword = data['userhashedpassword']

    user = UserTable.query.filter_by(
        userid=userid,
        username=username,
        usertype=usertype,
        password=userhashedpassword
    ).first()

    if user:
        return jsonify({'message': 'User verified', 'isValid': True, 'points': user.points}), 200
    else:
        return jsonify({'message': 'User not verified', 'isValid': False}), 401

@user_bp.route('/register', methods=['POST'])
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

@user_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data['username']
    password = data['password']

    user = UserTable.query.filter_by(username=username).first()

    if user and user.check_password(password):
        return jsonify({'message': 'Login successful', 'usertype': user.usertype, 'userid': user.userid, 'userpassword': user.password}), 200
    else:
        return jsonify({'error': 'Invalid username or password'}), 401

@user_bp.route('/get-username/<int:userid>', methods=['GET'])
def get_username(userid):
    user = UserTable.query.filter_by(userid=userid).first()
    if user:
        return jsonify({'username': user.username}), 200
    return jsonify({'message': 'User not found'}), 404

@user_bp.route('/get-usertype/<int:userid>', methods=['GET'])
def get_usertype(userid):
    user = UserTable.query.filter_by(userid=userid).first()
    if user:
        return jsonify({'usertype': user.usertype}), 200
    return jsonify({'message': 'User not found'}), 404

@user_bp.route('/user-checklist/<int:userid>', methods=['GET'])
def get_user_checklist(userid):
    user_checklist = UserChecklistTable.query.filter_by(userid=userid).all()
    checklistoptionids = [item.checklistoptionid for item in user_checklist]
    return jsonify(checklistoptionids), 200

@user_bp.route('/update-single-user-points/<int:userid>', methods=['POST'])
def update_single_user_points(userid):
    try:
        user = UserTable.query.filter_by(userid=userid).first()

        if not user:
            return jsonify({'error': 'User not found'}), 404

        forum_count = ForumTable.query.filter_by(posterid=user.userid).count()
        comment_count = CommentTable.query.filter_by(posterid=user.userid, deleted=False).count()
        new_points = (forum_count * 10) + (comment_count * 5)

        user.points = new_points

        db.session.commit()
        return jsonify({'message': f'Points updated for user {userid}', 'points': new_points}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@user_bp.route('/update-all-user-points', methods=['POST'])
def update_user_points():
    try:
        users = UserTable.query.all()
        
        for user in users:
            forum_count = ForumTable.query.filter_by(posterid=user.userid).count()
            comment_count = CommentTable.query.filter_by(posterid=user.userid, deleted=False).count()
            new_points = (forum_count * 10) + (comment_count * 5)
            user.points = new_points

        db.session.commit()
        return jsonify({'message': 'User points updated successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
