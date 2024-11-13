import os
from flask import Flask
from flask_cors import CORS
from config import Config
from models import db, User
import csv
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config.from_object(Config)
CORS(app)
db.init_app(app)

csv_file_path = 'locationCSV/repair/usernames/electricalusername.csv'

def add_shops_from_csv(file_path):
    with open(file_path, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            username = row['ShopUsername']
            password = username
            
            existing_user = User.query.filter_by(username=username).first()
            if existing_user:
                print(f"Username {username} already exists. Skipping this entry.")
                continue
            
            user = User.create_user(username=username, password=password, usertype='shop')
            print(f"Successfully added {username} to usertable.")
            db.session.add(user)
    
    db.session.commit()
    print("All shops from the CSV file have been added to the usertable.")

if __name__ == "__main__":
    with app.app_context():
        add_shops_from_csv(csv_file_path)
