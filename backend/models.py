from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt

db = SQLAlchemy()
bcrypt = Bcrypt()

class UserTable(db.Model):
    __tablename__ = 'usertable'

    userid = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    points = db.Column(db.BigInteger, default=0)
    usertype = db.Column(db.String(50), nullable=False)

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password, password)

    @classmethod
    def create_user(cls, username, password, usertype):
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        return cls(username=username, password=hashed_password, usertype=usertype)
    
class ShopTable(db.Model):
    __tablename__ = 'shoptable'

    shopid = db.Column(db.Integer, db.ForeignKey('usertable.userid'), primary_key=True, nullable=False)
    shopname = db.Column(db.String(255), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longtitude = db.Column(db.Float, nullable=False)
    addressname = db.Column(db.String(255), nullable=False)
    website = db.Column(db.String(255))
    actiontype = db.Column(db.String(255), nullable=False)

    user = db.relationship('UserTable', backref=db.backref('shop', uselist=False))

class ChecklistOptionTable(db.Model):
    __tablename__ = 'checklistoptiontable'

    checklistoptionid = db.Column(db.Integer, primary_key=True, autoincrement=True)
    checklistoptiontype = db.Column(db.String(100), nullable=False)

class UserChecklistTable(db.Model):
    __tablename__ = 'userchecklisttable'

    userid = db.Column(db.Integer, db.ForeignKey('usertable.userid'), primary_key=True)
    checklistoptionid = db.Column(db.Integer, db.ForeignKey('checklistoptiontable.checklistoptionid'), primary_key=True)

    user = db.relationship('UserTable', backref=db.backref('checklist_options', lazy=True))
    option = db.relationship('ChecklistOptionTable', backref=db.backref('users', lazy=True))

class ForumTable(db.Model):
    __tablename__ = 'forumtable'

    forumid = db.Column(db.Integer, primary_key=True, autoincrement=True)
    forumtext = db.Column(db.String(255), nullable=False)
    shopid = db.Column(db.Integer, db.ForeignKey('shoptable.shopid'), nullable=False)
    posterid = db.Column(db.Integer, db.ForeignKey('usertable.userid'), nullable=False)
    time = db.Column(db.String(50), nullable=False)

    shop = db.relationship('ShopTable', backref=db.backref('forums', lazy=True))
    poster = db.relationship('UserTable', backref=db.backref('posts', lazy=True))

class CommentTable(db.Model):
    __tablename__ = 'commenttable'

    commentid = db.Column(db.Integer, primary_key=True, autoincrement=True)
    commenttext = db.Column(db.String(255), nullable=False)
    forumid = db.Column(db.Integer, db.ForeignKey('forumtable.forumid'), nullable=False)
    posterid = db.Column(db.Integer, db.ForeignKey('usertable.userid'), nullable=False)
    replyid = db.Column(db.Integer, db.ForeignKey('commenttable.commentid'), nullable=True)
    encodedimage = db.Column(db.Text, nullable=True)
    time = db.Column(db.String(50), nullable=False)
    deleted = db.Column(db.Boolean, nullable=False, default=False)

    forum = db.relationship('ForumTable', backref=db.backref('comments', lazy=True))
    poster = db.relationship('UserTable', backref=db.backref('comments', lazy=True))
    reply = db.relationship('CommentTable', remote_side=[commentid], backref='replies')

class UserHistoryTable(db.Model):
    __tablename__ = 'userhistorytable'

    userid = db.Column(db.Integer, db.ForeignKey('usertable.userid', ondelete="CASCADE"), primary_key=True, nullable=False)
    shopid = db.Column(db.Integer, db.ForeignKey('shoptable.shopid', ondelete="CASCADE"), primary_key=True, nullable=False)
    time = db.Column(db.String(50), nullable=False)

    user = db.relationship('UserTable', backref=db.backref('history', lazy=True))
    shop = db.relationship('ShopTable', backref=db.backref('history', lazy=True))

