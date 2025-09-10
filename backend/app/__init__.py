from flask import Flask
import logging
from .config import Dev
from .extensions import cors, bcrypt, socketio
from . import extensions
from .errors import register_error_handlers
from pymongo import MongoClient
from .services.chat import init_gemini 
from .sockets.events import start_streamer_once
from dotenv import load_dotenv
from .blueprints.market.scheduler import start_market_scheduler
from .services.market import preload_historical_cache


load_dotenv()

def create_app(config_class=Dev):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # --- Logging configuration
    log_level = app.config.get("LOG_LEVEL", "INFO")
    logging.basicConfig(
        level=getattr(logging, str(log_level).upper(), logging.INFO),
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )
    app.logger.setLevel(getattr(logging, str(log_level).upper(), logging.INFO))

    # --- CORS: allow your frontend origin on /api/*
    frontend = app.config.get("FRONTEND_ORIGIN", "http://localhost:5173")
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": [frontend]}},
        supports_credentials=app.config.get("CORS_SUPPORTS_CREDENTIALS", False),
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        expose_headers=["Content-Type", "Authorization"],
    )

    bcrypt.init_app(app)

    try:
        # Initialize extensions
        client = MongoClient(app.config["MONGO_URI"])
        print(f"MongoDB connected to {app.config['MONGO_URI']}")
        extensions.mongo_client = client
        extensions.db = client["FinSightDB"]
    except Exception as e:
        app.logger.error(f"Failed to initialize extensions: {e}")
        raise

    # Optional Gemini
    init_gemini(app.config.get("GEMINI_API_KEY"))

    # Blueprints
    from .blueprints.auth.routes import bp as auth_bp
    from .blueprints.market.routes import bp as market_bp
    from .blueprints.portfolio.routes import bp as portfolio_bp
    from .blueprints.chat.routes import bp as chat_bp
    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(market_bp, url_prefix="/api")
    app.register_blueprint(portfolio_bp, url_prefix="/api")
    app.register_blueprint(chat_bp, url_prefix="/api")

    register_error_handlers(app)

    # Socket.IO (match CORS with your frontend)
    socketio.init_app(app, cors_allowed_origins=[frontend])

    # Preload historical daily bars for frequently used symbols
    try:
        preload_historical_cache()
    except Exception:
        pass

    # Start background streamer and schedulers
    start_streamer_once(app)
    start_market_scheduler(app)

    # (Optional) catch-all preflight for /api/*
    @app.route("/api/<path:_unused>", methods=["OPTIONS"])
    def _cors_preflight(_unused):
        return ("", 204)

    # (Optional) quick health check
    @app.get("/api/health")
    def health():
        return {"ok": True}

    return app
