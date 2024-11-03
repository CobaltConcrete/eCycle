from flask import Blueprint, request, jsonify
from models import db, ShopTable, ForumTable, CommentTable, ReportTable
from datetime import datetime

forum_bp = Blueprint('forum', __name__)

@forum_bp.route('/forums/<int:shopid>', methods=['GET'])
def get_forums(shopid):
    forums = ForumTable.query.filter_by(shopid=shopid).order_by(ForumTable.time.desc()).all()
    
    forum_list = [
        {
            'forumid': forum.forumid,
            'forumtext': forum.forumtext,
            'shopid': forum.shopid,
            'posterid': forum.posterid,
            'time': forum.time,
            'postername': forum.poster.username
        } 
        for forum in forums
    ]

    return jsonify(forum_list), 200

@forum_bp.route('/forums/details/<int:forumid>', methods=['GET'])
def get_forum_details(forumid):
    try:
        forum = ForumTable.query.filter_by(forumid=forumid).first()

        if forum:
            forum_details = {
                'forumtext': forum.forumtext,
                'posterid': forum.posterid,
                'time': forum.time,
                'postername': forum.poster.username
            }
            return jsonify(forum_details), 200
        else:
            return jsonify({'error': 'Forum not found'}), 404
    except Exception as e:
        print('Error fetching forum details:', e)
        return jsonify({'error': 'Server error'}), 500

@forum_bp.route('/forums/add', methods=['POST'])
def add_forum():
    data = request.get_json()
    forumtext = data['forumtext']
    shopid = data['shopid']
    posterid = data['posterid']
    time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    new_forum = ForumTable(forumtext=forumtext, shopid=shopid, posterid=posterid, time=time)
    db.session.add(new_forum)
    db.session.commit()

    return jsonify({'message': 'Forum added successfully'}), 201

@forum_bp.route('/forums/edit/<int:forumid>', methods=['PUT'])
def edit_forum(forumid):
    data = request.get_json()
    new_forumtext = data['forumtext']

    forum = ForumTable.query.get(forumid)
    
    if not forum:
        return jsonify({'error': 'Forum not found'}), 404

    forum.forumtext = new_forumtext
    db.session.commit()
    
    return jsonify({'message': 'Forum updated successfully'}), 200

@forum_bp.route('/forums/delete/<int:forumid>', methods=['DELETE'])
def delete_forum(forumid):
    forum = ForumTable.query.get(forumid)
    
    if not forum:
        return jsonify({'error': 'Forum not found'}), 404

    comments = CommentTable.query.filter_by(forumid=forumid).all()
    comment_ids = [comment.commentid for comment in comments]

    ReportTable.query.filter(ReportTable.commentid.in_(comment_ids)).delete()
    CommentTable.query.filter_by(forumid=forumid).delete()

    db.session.delete(forum)
    db.session.commit()

    return jsonify({'message': 'Forum and associated comments and reports deleted successfully'}), 200


@forum_bp.route('/get-actiontype-from-shopid/<int:shopid>', methods=['GET'])
def get_actiontype(shopid):
    shop = ShopTable.query.filter_by(shopid=shopid).first()
    
    if shop:
        return jsonify({'actiontype': shop.actiontype}), 200
    else:
        return jsonify({'message': 'Shop not found'}), 404