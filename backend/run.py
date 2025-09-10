# run.py
from app import create_app
from app.extensions import socketio
from flask import Flask
from flask_cors import CORS

app = create_app()

CORS(app, origins="http://localhost:5173", supports_credentials=True)

if __name__ == "__main__":
    # Werkzeug is fine for local dev with Socket.IO in thread mode
    socketio.run(app, host="0.0.0.0", port=5008, allow_unsafe_werkzeug=True)
