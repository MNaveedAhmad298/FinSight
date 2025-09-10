# app/config.py
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root if present
load_dotenv()

class Config:
    JWT_SECRET = os.environ.get("JWT_SECRET")
    MONGO_URI = os.environ.get("MONGO_URI")
    DEBUG = os.environ.get("FLASK_DEBUG", "0") == "1"
    TZ = os.environ.get("TZ", "UTC")
    # Streaming / polling
    STREAM_INTERVAL_SEC = int(os.environ.get("STREAM_INTERVAL_SEC", "2"))
    # Gemini (optional)
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
    # Finnhub (optional; not required because we stream via yfinance)
    FINNHUB_API_KEY = os.environ.get("FINNHUB_API_KEY")

class Dev(Config):
    DEBUG = True
