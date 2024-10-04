import os

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost/ecycle')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = 'password'  # Change this for production
