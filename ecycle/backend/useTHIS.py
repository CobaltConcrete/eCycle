import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from config import Config
from models import db, UserTable, ShopTable, ChecklistOptionTable, UserChecklistTable, ForumTable, CommentTable
import pandas as pd
from geopy.distance import geodesic
from dotenv import load_dotenv
from datetime import datetime
import requests

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)
CORS(app)
load_dotenv()












if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

