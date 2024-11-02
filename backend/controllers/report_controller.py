from flask import Blueprint, request, jsonify
from datetime import datetime
from models import db, ReportTable, UserTable, CommentTable
from sqlalchemy import func

report_bp = Blueprint('report', __name__)

@report_bp.route('/comments/report/<int:commentid>', methods=['POST'])
def report_comment(commentid):
    data = request.get_json()
    reporterid = data.get('reporterid')
    time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    if not reporterid:
        return jsonify({'message': 'Missing reporter ID'}), 400

    try:
        new_report = ReportTable(commentid=commentid, reporterid=reporterid, time=time)
        db.session.add(new_report)
        db.session.commit()

        return jsonify({'message': 'Comment reported successfully'}), 201
    
    except Exception as e:
        db.session.rollback()
        print(f'Error reporting comment: {e}')
        return jsonify({'message': 'Error reporting comment'}), 500

@report_bp.route('/comments/reported', methods=['GET'])
def get_reported_comments_summary():
    reports_summary = (
        db.session.query(
            func.min(ReportTable.reportid).label('reportid'),
            ReportTable.commentid,
            CommentTable.commenttext,
            func.count(ReportTable.commentid).label('report_count'),
            func.max(ReportTable.time).label('latest_report_time'),
            CommentTable.forumid
        )
        .join(CommentTable, ReportTable.commentid == CommentTable.commentid)
        .group_by(ReportTable.commentid, CommentTable.commenttext, CommentTable.forumid)
        .all()
    )

    response_data = [
        {
            "reportid": report.reportid,
            "commentid": report.commentid,
            "commenttext": report.commenttext,
            "report_count": report.report_count,
            "latest_report_time": report.latest_report_time,
            "forumid": report.forumid
        }
        for report in reports_summary
    ]

    return jsonify(response_data), 200

@report_bp.route('/verify-admin', methods=['POST'])
def verify_admin():
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
        if user.usertype == "admin":
            return jsonify({'isValid': True, 'usertype': user.usertype}), 200
        else:
            return jsonify({'isValid': False, 'message': 'User is not an admin.'}), 403
        
    return jsonify({'isValid': False, 'message': 'Invalid credentials.'}), 401