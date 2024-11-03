import os
from flask import Flask
from flask_cors import CORS
from config import Config
from models import db, User, Shop
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
csv_file_path = './locationCSV./ewaste./usernames./LottaStuffusername.csv'
ACTION_TYPE = "dispose"

def add_shops_from_csv(file_path):
    with open(file_path, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            shop_username = row['ShopUsername']
            latitude = row['latitude']
            longitude = row['longitude']
            shopname = row['Name']
            addressname = row['AddressName']
            website = row['Hyperlink']
            actiontype = ACTION_TYPE
            
            # Check if the user exists in usertable
            user = User.query.filter_by(username=shop_username).first()
            
            if user:
                # Check if the shopid already exists in shoptable
                existing_shop = Shop.query.filter_by(shopid=user.userid).first()
                
                if existing_shop:
                    print(f"Shop with shopid {user.userid} already exists. Skipping this entry.")
                    continue
                
                # Create a new shop record
                shop = Shop(
                    shopid=user.userid,
                    shopname=shopname,
                    latitude=latitude,
                    longtitude=longitude,
                    addressname=addressname,
                    website=website,
                    actiontype=actiontype
                )
                db.session.add(shop)
                print(f"Successfully added {shop_username} , {shopname} to shoptable.")
            else:
                print(f"User {shop_username} not found in usertable. Skipping this entry.")
    
    db.session.commit()
    print("All shops from the CSV file have been added to the shoptable.")

# Run the add_shops_from_csv function within the app context
if __name__ == "__main__":
    with app.app_context():
        add_shops_from_csv(csv_file_path)
