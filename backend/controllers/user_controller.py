from flask import Blueprint, request, jsonify
from models import UserTable, UserChecklistTable, db

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
        return jsonify({'message': 'User verified', 'isValid': True}), 200
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
