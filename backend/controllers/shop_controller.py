from flask import Blueprint, request, jsonify
from models import db, UserTable, ShopTable, ForumTable, CommentTable

shop_bp = Blueprint('shop', __name__)

@shop_bp.route('/verify-shop', methods=['POST'])
def verify_shop():
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
        if user.usertype == "shop":
            return jsonify({'isValid': True, 'usertype': user.usertype}), 200
        else:
            return jsonify({'isValid': False, 'message': 'User is not a shop.'}), 403
        
    return jsonify({'isValid': False, 'message': 'Invalid credentials.'}), 401

@shop_bp.route('/get-shop-details/<int:shopid>', methods=['GET'])
def get_shop_details(shopid):
    shop = ShopTable.query.get(shopid)
    if shop:
        return jsonify({
            'shopid': shop.shopid,
            'shopname': shop.shopname,
            'latitude': shop.latitude,
            'longtitude': shop.longtitude,
            'addressname': shop.addressname,
            'website': shop.website,
            'actiontype': shop.actiontype
        }), 200
    return jsonify({'message': 'Shop not found'}), 404

@shop_bp.route('/add-shop', methods=['POST'])
def signup_shop():
    data = request.get_json()
    shopid = data.get('userid')
    shopname = data['shopname']
    addressname = data['addressname']
    website = data.get('website')
    actiontype = data['actiontype']
    latitude = data.get('latitude')
    longtitude = data.get('longtitude')

    if latitude is None or longtitude is None:
        return jsonify({'error': 'Invalid address; unable to get coordinates.'}), 400

    existing_shop = ShopTable.query.filter_by(shopid=shopid).first()

    if existing_shop:
        existing_shop.shopname = shopname
        existing_shop.addressname = addressname
        existing_shop.website = website
        existing_shop.actiontype = actiontype
        existing_shop.latitude = latitude
        existing_shop.longtitude = longtitude

        db.session.commit()
        return jsonify({'message': 'Shop information updated successfully!'}), 200
    else:
        new_shop = ShopTable(
            shopid=shopid,
            shopname=shopname,
            addressname=addressname,
            website=website,
            actiontype=actiontype,
            latitude=latitude,
            longtitude=longtitude
        )
        
        db.session.add(new_shop)
        db.session.commit()
        return jsonify({'message': 'Shop registered successfully!'}), 201

@shop_bp.route('/remove-shop', methods=['POST'])
def remove_shop():
    data = request.get_json()
    shopid = data.get('shopid')

    if not shopid:
        return jsonify({'error': 'Shop ID is required.'}), 400

    shop_to_delete = ShopTable.query.filter_by(shopid=shopid).first()

    if not shop_to_delete:
        return jsonify({'error': 'Shop not found.'}), 404

    forums_to_delete = ForumTable.query.filter_by(shopid=shopid).all()
    for forum in forums_to_delete:
        CommentTable.query.filter_by(forumid=forum.forumid).delete()
        db.session.delete(forum)

    db.session.delete(shop_to_delete)

    db.session.commit()

    return jsonify({'message': 'Shop and its associated forums removed successfully!'}), 200
