import os

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv('REACT_APP_DATABASE_URL', 'postgresql://postgres:password@localhost/ecycle')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv('REACT_APP_DATABASE_PASSWORD')  # Change this for production

#TEST MK4