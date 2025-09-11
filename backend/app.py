from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from controllers.user_controller import user_bp
from controllers.checklist_controller import checklist_bp
from controllers.map_controller import map_bp
from controllers.shop_controller import shop_bp
from controllers.forum_controller import forum_bp
from controllers.comment_controller import comment_bp
from controllers.history_controller import history_bp
from controllers.report_controller import report_bp
from config import Config
from models import db

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

CORS(app, resources={r"/*": {"origins": "https://ecycle-1.onrender.com/"}})
load_dotenv()

# Register Blueprints
app.register_blueprint(user_bp)
app.register_blueprint(checklist_bp)
app.register_blueprint(map_bp)
app.register_blueprint(shop_bp)
app.register_blueprint(forum_bp)
app.register_blueprint(comment_bp)
app.register_blueprint(history_bp)
app.register_blueprint(report_bp)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)