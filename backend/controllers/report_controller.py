from flask import Blueprint, request, jsonify
from datetime import datetime
from models import db, ReportTable, UserTable, CommentTable
from sqlalchemy import func
import openai
import os
import json
import ast
import requests

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
            CommentTable.forumid,
            func.max(ReportTable.dangerscore).label('dangerscore')
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
            "forumid": report.forumid,
            "dangerscore": report.dangerscore
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

@report_bp.route('/classify-comment-GPT', methods=['POST'])
def classify_comment_GPT():
    openai.api_key = os.getenv("REACT_APP_OPENAI_KEY")
    data = request.get_json()
    comment_text = data.get('commenttext')

    if not comment_text:
        return jsonify({'message': 'Comment text is required'}), 400

    try:
        messages = [
            {"role": "system", "content": "You are a content moderation assistant."},
            {
                "role": "user",
                "content": (
                    "Analyze the following comment and determine if it contains hate-speech, violence, racism, illegal content, "
                    "self-harm, pornographic content, offensive language, bullying, harassment, spam, or abuse. "
                    "Return a danger score based on the analysis: "
                    "1 - Low (No harmful content), 2 - Medium (Mildly harmful), 3 - High (Clearly harmful).\n\n"
                    f"Comment: \"{comment_text}\"\n"
                    "Return answer in JSON format:\n"
                    "{'danger_score': _} // '1', '2', or '3'\n"
                )
            }
        ]

        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            max_tokens=20,
            temperature=0.2
        )

        response_text = response.choices[0].text.strip()

        try:
            result = json.loads(response_text)
            danger_score = result.get('danger_score')

            if danger_score in ['1', '2', '3']:
                return jsonify({'danger_score': int(danger_score)}), 200
            else:
                print(f"Invalid danger score received: {danger_score}")
                return jsonify({'danger_score': 1}), 200

        except json.JSONDecodeError:
            print(f"Failed to decode JSON response: {response_text}")
            return jsonify({'danger_score': 1}), 200

    except Exception as e:
        print(f"Error during comment classification: {e}")
        return jsonify({'message': 'Error classifying comment'}), 500

@report_bp.route('/classify-comment-AZURE', methods=['POST'])
def classify_comment_AZURE():
    # Azure OpenAI Configuration
    API_KEY = os.getenv("REACT_APP_AZURE_KEY")
    ENDPOINT = "https://gradingv3.openai.azure.com/openai/deployments/gradinv3/chat/completions?api-version=2024-02-15-preview"

    headers = {
        "Content-Type": "application/json",
        "api-key": API_KEY,
    }

    data = request.get_json()
    comment_text = data.get('commenttext')

    if not comment_text:
        return jsonify({'message': 'Comment text is required'}), 400

    try:
        # Construct the payload for Azure OpenAI
        payload = {
            "messages": [
                {"role": "system", "content": "You are a content moderation assistant."},
                {
                    "role": "user",
                    "content": (
                        "Analyze the following comment and determine if it contains hate-speech, violence, racism, illegal content, "
                        "self-harm, pornographic content, offensive language, bullying, harassment, spam, or abuse. "
                        "Return a danger score based on the analysis: "
                        "1 - Low (No harmful content), 2 - Medium (Mildly harmful), 3 - High (Clearly harmful).\n\n"
                        f"Comment: \"{comment_text}\"\n"
                        "Return answer in JSON format:\n"
                        "{'danger_score': _} // '1', '2', or '3'\n"
                    )
                }
            ],
            "temperature": 0.2,
            "top_p": 0.95,
            "max_tokens": 20
        }

        response = requests.post(ENDPOINT, headers=headers, json=payload)
        response.raise_for_status()

        response_data = response.json()

        response_text = response_data['choices'][0]['message']['content'].strip()

        if response_text.startswith("```json"):
            response_text = response_text.replace("```json", "").replace("```", "").strip()

        try:
            result = ast.literal_eval(response_text)
            danger_score = result.get('danger_score')

            if danger_score in ['1', '2', '3']:
                return jsonify({'danger_score': int(danger_score)}), 200
            else:
                print(f"Invalid danger score received: {danger_score}")
                return jsonify({'danger_score': 1}), 200

        except (ValueError, SyntaxError) as parse_error:
            print(f"Failed to parse JSON response after cleanup: {response_text}, Error: {parse_error}")
            return jsonify({'danger_score': 1}), 200

    except Exception as e:
        print(f"Error during comment classification: {e}")
        return jsonify({'message': 'Error classifying comment'}), 500
    
@report_bp.route('/comments/report-gpt/<int:commentid>', methods=['POST'])
def report_comment_GPT(commentid):
    data = request.get_json()
    reporterid = data.get('reporterid')
    time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    if not reporterid:
        return jsonify({'message': 'Missing reporter ID'}), 400

    try:
        comment = CommentTable.query.get(commentid)
        if not comment:
            return jsonify({'message': 'Comment not found'}), 404

        existing_report = ReportTable.query.filter_by(commentid=commentid).first()
        if existing_report:
            danger_score = existing_report.dangerscore
        else:
            comment_text = comment.commenttext
            danger_score = classify_comment_GPT_from_route(comment_text)

        new_report = ReportTable(
            commentid=commentid, 
            reporterid=reporterid, 
            time=time, 
            dangerscore=danger_score
        )
        db.session.add(new_report)
        db.session.commit()

        return jsonify({'message': 'Comment reported successfully'}), 201

    except Exception as e:
        db.session.rollback()
        print(f'Error reporting comment: {e}')
        return jsonify({'message': 'Error reporting comment'}), 500

def classify_comment_GPT_from_route(comment_text):
    openai.api_key = os.getenv("REACT_APP_OPENAI_KEY")

    messages = [
        {"role": "system", "content": "You are a content moderation assistant."},
        {
            "role": "user",
            "content": (
                "Analyze the following comment and determine if it contains hate-speech, violence, racism, illicit content, "
                "self-harm, pornographic content, offensive language, bullying, harassment, spam, or abuse. "
                "Return a danger score based on the analysis: "
                "1 - Low (No harmful content), 2 - Medium (Mildly harmful), 3 - High (Clearly harmful).\n\n"
                f"Comment: \"{comment_text}\"\n"
                "Return answer in JSON format:\n"
                "{'danger_score': _} // '1', '2', or '3'\n"
            )
        }
    ]

    try:
        response = openai.chat.completions.create(
            model="babbage-002",
            messages=messages,
            max_tokens=20,
            temperature=0.2
        )

        response_text = response.choices[0].text.strip()
        result = json.loads(response_text)

        danger_score = result.get('danger_score')
        if danger_score in ['1', '2', '3']:
            return int(danger_score)
        else:
            print(f"Invalid danger score received: {danger_score}")
            return 1

    except Exception as e:
        print(f"Error during GPT classification: {e}")
        return 1
    
@report_bp.route('/comments/report-azure/<int:commentid>', methods=['POST'])
def report_comment_AZURE(commentid):
    data = request.get_json()
    reporterid = data.get('reporterid')
    time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    if not reporterid:
        return jsonify({'message': 'Missing reporter ID'}), 400

    try:
        comment = CommentTable.query.get(commentid)
        if not comment:
            return jsonify({'message': 'Comment not found'}), 404

        existing_report = ReportTable.query.filter_by(commentid=commentid).first()
        if existing_report:
            danger_score = existing_report.dangerscore
        else:
            comment_text = comment.commenttext
            classify_response = classify_comment_AZURE_from_route(comment_text)
            danger_score = classify_response.get('danger_score', 1)

        new_report = ReportTable(
            commentid=commentid, 
            reporterid=reporterid, 
            time=time, 
            dangerscore=danger_score
        )
        db.session.add(new_report)

        db.session.commit()
        return jsonify({'message': 'Comment reported successfully'}), 201

    except Exception as e:
        db.session.rollback()
        print(f'Error reporting comment: {e}')
        return jsonify({'message': 'Error reporting comment'}), 500

def classify_comment_AZURE_from_route(comment_text):
    API_KEY = os.getenv("REACT_APP_AZURE_KEY")
    ENDPOINT = "https://gradingv3.openai.azure.com/openai/deployments/gradinv3/chat/completions?api-version=2024-02-15-preview"

    headers = {
        "Content-Type": "application/json",
        "api-key": API_KEY,
    }

    payload = {
        "messages": [
            {"role": "system", "content": "You are a content moderation assistant."},
            {
                "role": "user",
                "content": (
                    "Analyze the following comment and determine if it contains hate-speech, violence, racism, illegal content, "
                    "self-harm, pornographic content, offensive language, bullying, harassment, spam, or abuse. "
                    "Return a danger score based on the analysis: "
                    "1 - Low (No harmful content), 2 - Medium (Mildly harmful), 3 - High (Clearly harmful).\n\n"
                    f"Comment: \"{comment_text}\"\n"
                    "Return answer in JSON format:\n"
                    "{'danger_score': _} // '1', '2', or '3'\n"
                )
            }
        ],
        "temperature": 0.2,
        "top_p": 0.95,
        "max_tokens": 20
    }

    response = requests.post(ENDPOINT, headers=headers, json=payload)
    response.raise_for_status()

    response_data = response.json()
    response_text = response_data['choices'][0]['message']['content'].strip()

    if response_text.startswith("```json"):
        response_text = response_text.replace("```json", "").replace("```", "").strip()

    try:
        result = ast.literal_eval(response_text)
        return result
    except (ValueError, SyntaxError) as parse_error:
        print(f"Failed to parse JSON response after cleanup: {response_text}, Error: {parse_error}")
        return {'danger_score': 1}
