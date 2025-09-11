import os

# class Config:
#     SQLALCHEMY_DATABASE_URI = os.getenv('REACT_APP_DATABASE_URL', 'postgresql://postgres:password@localhost/ecycle')
#     SQLALCHEMY_TRACK_MODIFICATIONS = False
#     SECRET_KEY = os.getenv('REACT_APP_DATABASE_PASSWORD')  # Change this for production
class Config:
    # Use backend environment variables (not REACT_APP_*)
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL', 
        'postgresql://postgres:password@localhost/ecycle'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv('DATABASE_PASSWORD', 'default-secret-key')

#TEST MK4