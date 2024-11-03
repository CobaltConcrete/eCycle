import os
from flask import Flask
from flask_cors import CORS
from config import Config
from models import db, User, UserChecklist
import csv
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask app and configure it
app = Flask(__name__)
app.config.from_object(Config)
CORS(app)
db.init_app(app)

# Path to your CSV file
csv_file_path = 'locationCSV/repair/usernames/generalusername.csv'

# List of checklistoptionid values to add for each shop
checklist_options = [9]

def add_checklist_for_matching_users(file_path):
    with open(file_path, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            shop_username = row['ShopUsername']
            
            # Find the user with the matching username in usertable
            user = User.query.filter_by(username=shop_username).first()
            
            if user:
                for option_id in checklist_options:
                    # Check if the entry already exists in userchecklisttable
                    existing_entry = UserChecklist.query.filter_by(userid=user.userid, checklistoptionid=option_id).first()
                    
                    if existing_entry is None:
                        # Create a new UserChecklist entry only if it doesn't exist
                        checklist_entry = UserChecklist(userid=user.userid, checklistoptionid=option_id)
                        
                        # Add the entry to the session
                        db.session.add(checklist_entry)
                        print(f"Added checklist option {option_id} for user: {user.username}")
                    else:
                        print(f"Checklist option {option_id} for user: {user.username} already exists. Skipping.")
    
    db.session.commit()
    print("All matching checklist options have been added to userchecklisttable where needed.")

# Run the add_checklist_for_matching_users function within the app context
if __name__ == "__main__":
    with app.app_context():
        add_checklist_for_matching_users(csv_file_path)
