from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt

db = SQLAlchemy()
bcrypt = Bcrypt()

class User(db.Model):
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

class ChecklistOption(db.Model):
    __tablename__ = 'checklistoptiontable'

    checklistoptionid = db.Column(db.Integer, primary_key=True, autoincrement=True)
    checklistoptiontype = db.Column(db.String(100), nullable=False)

class UserChecklist(db.Model):
    __tablename__ = 'userchecklisttable'

    userid = db.Column(db.Integer, db.ForeignKey('usertable.userid'), primary_key=True)
    checklistoptionid = db.Column(db.Integer, db.ForeignKey('checklistoptiontable.checklistoptionid'), primary_key=True)

    user = db.relationship('User', backref=db.backref('checklist_options', lazy=True))
    option = db.relationship('ChecklistOption', backref=db.backref('users', lazy=True))