from flask import Blueprint, request, jsonify
from models import db, ForumTable, CommentTable
from datetime import datetime

comment_bp = Blueprint('comment', __name__)

@comment_bp.route('/comments/<int:forumid>', methods=['GET'])
def get_comments(forumid):
    comments = CommentTable.query.filter_by(forumid=forumid).order_by(CommentTable.time.desc()).all()
    
    comment_list = [
        {
            'commentid': comment.commentid,
            'commenttext': comment.commenttext,
            'forumid': comment.forumid,
            'posterid': comment.posterid,
            'replyid': comment.replyid,
            'encodedimage': comment.encodedimage,
            'time': comment.time,
            'deleted': comment.deleted,
            'postername': comment.poster.username 
        }
        for comment in comments
    ]

    return jsonify(comment_list), 200

@comment_bp.route('/comments/add', methods=['POST'])
def add_comment():
    data = request.get_json()
    forumid = data['forumid']
    commenttext = data['commenttext']
    posterid = data['posterid']
    encodedimage = data.get('encodedimage')
    time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    new_comment = CommentTable(
        forumid=forumid,
        commenttext=commenttext,
        posterid=posterid,
        time=time,
        encodedimage=encodedimage
    )
    db.session.add(new_comment)
    db.session.commit()

    return jsonify({'message': 'Comment added successfully'}), 201

@comment_bp.route('/comments/reply/<int:commentid>', methods=['POST'])
def reply_comment(commentid):
    data = request.json
    forumid = data['forumid']
    commenttext = data['commenttext']
    posterid = data['posterid']
    encodedimage = data.get('encodedimage')
    time = data.get('time', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

    new_reply = CommentTable(forumid=forumid, commenttext=commenttext, posterid=posterid, time=time, replyid=commentid, encodedimage=encodedimage)
    db.session.add(new_reply)
    db.session.commit()

    return jsonify({'message': 'Reply added successfully'}), 201

@comment_bp.route('/comments/edit/<int:commentid>', methods=['PUT'])
def edit_comment(commentid):
    data = request.get_json()
    new_commenttext = data['commenttext']

    comment = CommentTable.query.get(commentid)
    if not comment:
        return jsonify({'error': 'Comment not found'}), 404

    comment.commenttext = new_commenttext
    db.session.commit()

    return jsonify({'message': 'Comment updated successfully'}), 200

@comment_bp.route('/comments/delete/<int:commentid>', methods=['PUT'])
def delete_comment(commentid):
    comment = CommentTable.query.get(commentid)
    if not comment:
        return jsonify({'error': 'Comment not found'}), 404

    comment.commenttext = '[deleted]'
    comment.deleted = True
    db.session.commit()

    return jsonify({'message': 'Comment marked as deleted successfully'}), 200

@comment_bp.route('/get-shopid-from-forumid/<int:forumid>', methods=['GET'])
def get_shopid(forumid):
    forum = ForumTable.query.filter_by(forumid=forumid).first()
    if forum:
        return jsonify({'shopid': forum.shopid}), 200
    else:
        return jsonify({'message': 'Forum not found'}), 404
    