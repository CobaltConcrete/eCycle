from flask import Blueprint, request, jsonify
from models import db, ChecklistOptionTable, UserChecklistTable

checklist_bp = Blueprint('checklist', __name__)

@checklist_bp.route('/checklist-options', methods=['GET'])
def get_checklist_options():
    options = ChecklistOptionTable.query.all()
    return jsonify([{
        'checklistoptionid': option.checklistoptionid,
        'checklistoptiontype': option.checklistoptiontype
    } for option in options]), 200

@checklist_bp.route('/user-checklist', methods=['POST'])
def save_user_checklist():
    data = request.get_json()
    userid = data['userid']
    checklistoptionids = data['checklistoptionids']

    UserChecklistTable.query.filter_by(userid=userid).delete()

    for checklistoptionid in checklistoptionids:
        user_checklist = UserChecklistTable(userid=userid, checklistoptionid=checklistoptionid)
        db.session.add(user_checklist)

    db.session.commit()
    return jsonify({'message': 'Checklist options saved successfully'}), 201
