# app/extensions.py
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_socketio import SocketIO
from pymongo import MongoClient

cors = CORS()
bcrypt = Bcrypt()
socketio = SocketIO(cors_allowed_origins="*", async_mode="threading", logger=True)
mongo = None  # we’ll set it in init_app
