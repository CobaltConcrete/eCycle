from flask import Flask, request, jsonify
from flask_cors import CORS
from config import Config
from models import db, User, ChecklistOption, UserChecklist

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

if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Create tables if not exist
    app.run(debug=True)