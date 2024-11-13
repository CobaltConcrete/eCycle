import os
from flask import Flask
from flask_cors import CORS
from config import Config
from models import db, User, UserChecklist
import csv
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config.from_object(Config)
CORS(app)
db.init_app(app)

csv_file_path = 'locationCSV/repair/usernames/generalusername.csv'

checklist_options = [9]

def add_checklist_for_matching_users(file_path):
    with open(file_path, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            shop_username = row['ShopUsername']
            
            user = User.query.filter_by(username=shop_username).first()
            
            if user:
                for option_id in checklist_options:
                    existing_entry = UserChecklist.query.filter_by(userid=user.userid, checklistoptionid=option_id).first()
                    
                    if existing_entry is None:
                        checklist_entry = UserChecklist(userid=user.userid, checklistoptionid=option_id)
                        
                        db.session.add(checklist_entry)
                        print(f"Added checklist option {option_id} for user: {user.username}")
                    else:
                        print(f"Checklist option {option_id} for user: {user.username} already exists. Skipping.")
    
    db.session.commit()
    print("All matching checklist options have been added to userchecklisttable where needed.")

if __name__ == "__main__":
    with app.app_context():
        add_checklist_for_matching_users(csv_file_path)
