from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt

db = SQLAlchemy()
bcrypt = Bcrypt()

class User(db.Model):
    __tablename__ = 'usertable'  # Ensure this matches your actual table name

    userid = db.Column(db.Integer, primary_key=True, autoincrement=True)  # Keep this line
    username = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    points = db.Column(db.BigInteger, default=0)

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password, password)

    @classmethod
    def create_user(cls, username, password):
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        return cls(username=username, password=hashed_password)
