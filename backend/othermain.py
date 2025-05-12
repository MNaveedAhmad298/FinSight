from flask import Flask, jsonify, request
import yfinance as yf
import threading
import time
from flask_cors import CORS
from cachetools import TTLCache
# from chatbot import FinSightAssistant
from pymongo import MongoClient
from portfolio import Portfolio
# from predictor import StockPredictor
from flask_bcrypt import Bcrypt
import jwt
import datetime
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from bson import ObjectId
import websocket
from flask_socketio import SocketIO
import google.generativeai as genai
import json
from stock_cache import StockDataCache

load_dotenv()

JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key')  # Use environment variable in production

try:
    client = MongoClient(os.getenv('MONGO_URI'))
    db = client["FinSight"]
    print("Connected to the database")
    stocks_collection = db.stocks
    users_collection = db.users  # Add users collection
    portfolio_collection=db.portfolio_holdings
except Exception as e:
    print(f"Error connecting to the database: {e}")

app = Flask(__name__)
CORS(app)  

bcrypt = Bcrypt(app)  # Initialize bcrypt for password hashing
genai.configure(
    api_key=os.getenv("GEMINI_API_KEY"),             
)

FINNHUB_TOKEN     = os.getenv("FINNHUB_API_KEY")
SUBSCRIBE_SYMBOLS = ["AAPL",  "MSFT",  
    "NVDA",  
    "AMZN",  
    "AVGO",  
    "META",   
    "NFLX",  
    "COST",  
    "TSLA",
    "GOOGL", 
    "GOOG",  
    "TMUS",
    "PLTR",
    "CSCO",  
    "LIN",
    "ISRG",  
    "PEP",   
    "INTU", 
    "BKNG",
    "ADBE",
    "AMD", 
    "AMGN",
    "QCOM", 
    "TXN",  
    "HON",  
    "GILD",
    "VRTX",
    "CMCSA",
    "PANW",  
    "ADP",   
    "AMAT", 
    "MELI",
    "CRWD",
    "ADI",  
    "SBUX",
    "LRCX", 
    "MSTR", 
    "KLAC", 
    "MDLZ",
    "MU",
    "INTC", 
    "APP",   
    "CTAS", 
    "CDNS",
    "ORLY",
    "FTNT",  
    "DASH",  
    "CEG",   
    "SNPS",  
    "PDD"  ]

# Stock metadata for better display
STOCK_METADATA = {
    "AAPL":  {"name": "Apple Inc."},
    "MSFT":  {"name": "Microsoft Corporation"},
    "NVDA":  {"name": "NVIDIA Corporation"},
    "AMZN":  {"name": "Amazon.com, Inc."},
    "AVGO":  {"name": "Broadcom Inc."},
    "META":  {"name": "Meta Platforms, Inc."},
    "NFLX":  {"name": "Netflix, Inc."},
    "COST":  {"name": "Costco Wholesale Corporation"},
    "TSLA":  {"name": "Tesla, Inc."},
    "GOOGL": {"name": "Alphabet Inc. (Class A)"},
    "GOOG":  {"name": "Alphabet Inc. (Class C)"},
    "TMUS":  {"name": "T‑Mobile US, Inc."},
    "PLTR":  {"name": "Palantir Technologies Inc."},
    "CSCO":  {"name": "Cisco Systems, Inc."},
    "LIN":   {"name": "Linde plc"},
    "ISRG":  {"name": "Intuitive Surgical, Inc."},
    "PEP":   {"name": "PepsiCo, Inc."},
    "INTU":  {"name": "Intuit, Inc."},
    "BKNG":  {"name": "Booking Holdings Inc."},
    "ADBE":  {"name": "Adobe Inc."},
    "AMD":   {"name": "Advanced Micro Devices, Inc."},
    "AMGN":  {"name": "Amgen Inc."},
    "QCOM":  {"name": "Qualcomm Incorporated"},
    "TXN":   {"name": "Texas Instruments Incorporated"},
    "HON":   {"name": "Honeywell International Inc."},
    "GILD":  {"name": "Gilead Sciences, Inc."},
    "VRTX":  {"name": "Vertex Pharmaceuticals Incorporated"},
    "CMCSA": {"name": "Comcast Corporation"},
    "PANW":  {"name": "Palo Alto Networks, Inc."},
    "ADP":   {"name": "Automatic Data Processing, Inc."},
    "AMAT":  {"name": "Applied Materials, Inc."},
    "MELI":  {"name": "MercadoLibre, Inc."},
    "CRWD":  {"name": "CrowdStrike Holdings, Inc."},
    "ADI":   {"name": "Analog Devices, Inc."},
    "SBUX":  {"name": "Starbucks Corporation"},
    "LRCX":  {"name": "Lam Research Corporation"},
    "MSTR":  {"name": "MicroStrategy Incorporated"},
    "KLAC":  {"name": "KLA Corporation"},
    "MDLZ":  {"name": "Mondelez International, Inc."},
    "MU":    {"name": "Micron Technology, Inc."},
    "INTC":  {"name": "Intel Corporation"},
    "APP":   {"name": "AppLovin Corporation"},
    "CTAS":  {"name": "Cintas Corporation"},
    "CDNS":  {"name": "Cadence Design Systems, Inc."},
    "ORLY":  {"name": "O’Reilly Automotive, Inc."},
    "FTNT":  {"name": "Fortinet, Inc."},
    "DASH":  {"name": "DoorDash, Inc."},
    "CEG":   {"name": "Constellation Energy Corporation"},
    "SNPS":  {"name": "Synopsys, Inc."},
    "PDD":   {"name": "Pinduoduo Inc."}
}

latest_stock_data = {}


socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="threading",
    logger=True,  # Enable logging for debugging
    engineio_logger=True  # Enable Engine.IO logging
)
# MongoDB
client = MongoClient(os.getenv('MONGO_URI'))
db = client["FinSightDB"]
users_collection = db["users"]
PERIODS = ["1d","5d","1mo","6mo","1y","5y"]
stock=db["Stocks"]
STOCKS= ["AAPL",  "MSFT",  
    "NVDA",  
    "AMZN",  
    "AVGO",  
    "META",   
    "NFLX",  
    "COST",  
    "TSLA",
    "GOOGL", 
    "GOOG",  
    "TMUS",
    "PLTR",
    "CSCO",  
    "LIN",
    "ISRG",  
    "PEP",   
    "INTU", 
    "BKNG",
    "ADBE",
    "AMD", 
    "AMGN",
    "QCOM", 
    "TXN",  
    "HON",  
    "GILD",
    "VRTX",
    "CMCSA",
    "PANW",  
    "ADP",   
    "AMAT", 
    "MELI",
    "CRWD",
    "ADI",  
    "SBUX",
    "LRCX", 
    "MSTR", 
    "KLAC", 
    "MDLZ",
    "MU",
    "INTC", 
    "APP",   
    "CTAS", 
    "CDNS",
    "ORLY",
    "FTNT",  
    "DASH",  
    "CEG",   
    "SNPS",  
    "PDD"  
]

def on_open(ws):
    for symbol in SUBSCRIBE_SYMBOLS:
        ws.send(json.dumps({"type": "subscribe", "symbol": symbol}))

def on_message(ws, message):
    payload = json.loads(message)
    if payload.get("type") != "trade":
        return

    # Process all incoming trades
    for t in payload["data"]:
        symbol = t["s"]
        price = round(t["p"], 2)
        volume = t["v"]
        timestamp = datetime.fromtimestamp(t["t"] / 1000).isoformat()
        
        # Calculate price change if we have previous data
        change = 0
        if symbol in latest_stock_data and latest_stock_data[symbol].get("price"):
            old_price = latest_stock_data[symbol]["price"]
            change = ((price - old_price) / old_price) * 100 if old_price else 0
        
        # Update our stored data
        if symbol not in latest_stock_data:
            latest_stock_data[symbol] = {
                "symbol": symbol,
                "name": STOCK_METADATA.get(symbol, {}).get("name", symbol),
                "price": price,
                "volume": volume,
                "change": change,
                "timestamp": timestamp
            }
        else:
            latest_stock_data[symbol]["price"] = price
            latest_stock_data[symbol]["volume"] = volume
            latest_stock_data[symbol]["change"] = change
            latest_stock_data[symbol]["timestamp"] = timestamp
        
        # Emit individual trade updates for real-time updates
        socketio.emit("stock_update", {
            "symbol": symbol,
            "price": price,
            "change": change,
            "timestamp": timestamp
        })

def on_error(ws, error):
    socketio.emit("error", {"message": str(error)})

def on_close(ws, code, reason):
    socketio.emit("disconnected", {"code": code, "reason": reason})

# --------------------------------------------------
# BACKGROUND THREAD TO RUN FINNHUB WS
# --------------------------------------------------
def start_finnhub_ws():
    url = f"wss://ws.finnhub.io?token={FINNHUB_TOKEN}"

    # Keep the loop alive forever, reconnecting on errors/close
    while True:
        ws = websocket.WebSocketApp(
            url,
            on_open=on_open,
            on_message=on_message,
            on_error=on_error,
            on_close=on_close
        )

        # run_forever takes ping args so we send a ws ping every 30s
        try:
            ws.run_forever(
                ping_interval=30,
                ping_timeout=10,
            )
        except Exception as e:
            app.logger.warning(f"WebSocket run_forever threw: {e}")

        # If we get here, the socket has closed or errored — wait and reconnect
        app.logger.info("Finnhub socket closed. Reconnecting in 5s…")
        time.sleep(5)


@app.route("/api/symbols")
def symbols():
    return jsonify(SUBSCRIBE_SYMBOLS)

@app.route("/api/stocks")
def stocks():
    # start with whatever live data you have
    data = { s: latest_stock_data.get(s, {}) for s in SUBSCRIBE_SYMBOLS }

    # ensure every entry has basic fields
    for sym, entry in data.items():
        entry.setdefault("symbol", sym)
        entry.setdefault("name", STOCK_METADATA.get(sym, {}).get("name", sym))
        entry.setdefault("price", 0)
        entry.setdefault("change", 0)
        entry.setdefault("volume", 0)
    return jsonify(list(data.values()))


def init_app():
    # Create a new collection for the cache
    stock_cache_collection = db["stock_cache"]
    
    # Initialize the cache with all your stocks and periods
    cache = StockDataCache(
        db=db,
        SUBSCRIBE_SYMBOLS=SUBSCRIBE_SYMBOLS,  # Your existing stock list
        periods=PERIODS,        # Your existing periods list
        cache_dir='./stock_cache'  # Store file cache here
    )
    
    
    # Store it on the app for access in routes
    app.config['STOCK_CACHE'] = cache
    
    # Start background updates
    cache_thread = cache.start_background_updates()
    return app


# # Background data fetching
# def fetch_all_stocks():
#     try:
#         tickers = yf.Tickers(" ".join(STOCKS))
#         data = {}
#         for symbol in STOCKS:
#             try:
#                 stock = tickers.tickers[symbol]
#                 history = stock.history(period="1d")
#                 if not history.empty:
#                     stock_info = {
#                         'symbol': symbol,
#                         'name': stock.info.get('longName', symbol),
#                         'open': history['Open'].iloc[0],
#                         'high': history['High'].max(),
#                         'low': history['Low'].min(),
#                         'close': history['Close'].iloc[-1],
#                         'change': ((history['Close'].iloc[-1] - history['Open'].iloc[0]) / 
#                                    history['Open'].iloc[0]) * 100,
#                         'volume': stock.info.get('volume', 0)
#                     }
#                     data[symbol] = stock_info
#                     stocks_collection.update_one({'symbol': symbol}, {'$set': stock_info}, upsert=True)
#             except Exception as e:
#                 print(f"Error processing {symbol}: {str(e)}")
#                 continue
        
#         cache['stocks'] = data
#     except Exception as e:
#         print(f"Global fetch error: {str(e)}")

# def update_stock_data():
#     while True:
#         fetch_all_stocks()
#         time.sleep(60)

# SMTP helper
def send_email(to_email, subject, html_body):
    host = "smtp.gmail.com"
    port = 587
    user = os.getenv('USER')
    pwd = os.getenv('PASS')

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = user
    msg['To'] = to_email
    msg.attach(MIMEText(html_body, 'html'))

    with smtplib.SMTP(host, port) as server:
        server.starttls()
        if user and pwd:
            server.login(user, pwd)
        server.send_message(msg)

# Auth middleware
def token_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            # Remove 'Bearer ' prefix if present
            if token.startswith('Bearer '):
                token = token[7:]
            payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            user_id = payload['user_id']
            current_user = users_collection.find_one({"_id": ObjectId(user_id)})
            if not current_user:
                raise Exception('User not found')
            return f(current_user, *args, **kwargs)
        except Exception as e:
            return jsonify({'message': 'Invalid token'}), 401
    return decorated

# Signup endpoint
@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')

    if users_collection.find_one({"email": email}):
        return jsonify({"message": "Email already registered"}), 400

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

    user = {
        "name": name,
        "email": email,
        "passwordHash": hashed_password,
        "role": "student",
        "emailVerified": False,
        "registeredAt": datetime.datetime.utcnow(),
        "nickname": name,  # Initialize nickname with name
        "avatar": None     # Initialize empty avatar
    }

    result = users_collection.insert_one(user)
    
    # Create an initial portfolio for the new user with some starting balance
    db.portfolios.insert_one({
        "user_id": result.inserted_id,
        "available_balance": 10000.00  # Starting with $10,000 virtual money
    })

    return jsonify({"message": "Signup successful"}), 201

# Login endpoint
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    user = users_collection.find_one({"email": email})

    if user and bcrypt.check_password_hash(user['passwordHash'], password):
        token_payload = {
            'user_id': str(user['_id']),
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }
        token = jwt.encode(token_payload, JWT_SECRET, algorithm='HS256')

        user_data = {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "nickname": user.get("nickname", user["name"]),
            "avatar": user.get("avatar")
        }

        return jsonify({"token": token, "user": user_data}), 200

    return jsonify({"message": "Invalid email or password"}), 401

# Forgot password endpoint
@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    email = request.json.get('email')
    user = users_collection.find_one({"email": email})
    if not user:
        return jsonify({"message": "If that email exists, a reset link has been sent."}), 200

    token = jwt.encode({
        'email': email,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    }, JWT_SECRET, algorithm='HS256')

    reset_link = f"http://localhost:5173/reset-password?token={token}"

    try:
        html = f"""
          <p>Hello {user['name']},</p>
          <p>Click below to reset your password (link expires in 1 hour):</p>
          <p><a href="{reset_link}">Reset your FinSight password</a></p>
          <p>If you didn't request this, just ignore.</p>
        """
        send_email(email, "FinSight Password Reset", html)
    except Exception as e:
        print("SMTP error:", e)
        return jsonify({"message": "Failed to send reset email."}), 500

    return jsonify({"message": "If that email exists, a reset link has been sent."}), 200

# Reset password endpoint
@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    data = request.json
    token = data.get('token')
    new_password = data.get('password')

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        email = payload['email']
    except jwt.ExpiredSignatureError:
        return jsonify({'message': 'Reset link expired.'}), 400
    except jwt.InvalidTokenError:
        return jsonify({'message': 'Invalid reset token.'}), 400

    hashed = bcrypt.generate_password_hash(new_password).decode('utf-8')
    result = users_collection.update_one({'email': email}, {'$set': {'passwordHash': hashed}})
    if result.matched_count == 0:
        return jsonify({'message': 'User not found.'}), 404

    return jsonify({'message': 'Password reset successful.'}), 200

# # API Endpoints
# @app.route('/api/stocks')
# def get_stocks():
#     return jsonify(list(cache.get('stocks', {}).values()))

# @app.route('/api/history/<symbol>')
# def get_history(symbol):
#     try:
#         stock = yf.Ticker(symbol)
#         history = stock.history(period="1d", interval="5m")
#         return jsonify({
#             'symbol': symbol,
#             'data': [{
#                 'time': str(index),
#                 'value': row['Close']
#             } for index, row in history.iterrows()]
#         })
#     except Exception as e:
#         return jsonify({'error': 'Data unavailable', 'details': str(e)})

@app.route('/api/history/<symbol>/<period>', methods=['GET'])
def get_history(symbol, period):
    """
    Fetch historical 'Close' price data for the given stock symbol and period.
    Uses cache to reduce API calls to Yahoo Finance.
    """
    # Normalize inputs
    symbol = symbol.upper()
    
    # Validate inputs
    if period not in PERIODS:
        period = '1d'  # Default to 1 day if invalid period
    
    try:
        # Get data from cache with a maximum age
        # Shorter-term data expires more quickly
        max_age = {
            '1d': 15 * 60,     # 15 minutes for 1-day data
            '5d': 30 * 60,     # 30 minutes for 5-day data
            '1mo': 2 * 60 * 60,  # 2 hours for 1-month data
            '6mo': 6 * 60 * 60,  # 6 hours for 6-month data
            '1y': 12 * 60 * 60,  # 12 hours for 1-year data
            '5y': 24 * 60 * 60   # 24 hours for 5-year data
        }.get(period, 6 * 60 * 60)  # Default 6 hours
        
        data = app.config['STOCK_CACHE'].get_stock_data(
            symbol, 
            period,
            max_age_seconds=max_age
        )
        
        return jsonify(data)
        
    except ValueError as e:
        # Invalid input
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        # Any other error - fall back to direct API call
        try:
            # If cache fails, try direct API call as fallback
            stock = yf.Ticker(symbol)
            interval = "5m" if period == "1d" else "1d"
            history = stock.history(period=period.lower(), interval=interval)
            data = [{
                'time': str(index),
                'value': row['Close']
            } for index, row in history.iterrows()]

            return jsonify({
                'symbol': symbol,
                'period': period,
                'data': data
            })
        except Exception as fallback_error:
            return jsonify({'error': str(fallback_error)}), 500


# Update balance endpoint to use auth
@app.route('/api/balance', methods=['GET'])
@token_required
def get_balance(current_user):
    portfolio = db.portfolios.find_one({"user_id": current_user["_id"]})
    if not portfolio:
        return jsonify({"error": "Portfolio not found"}), 404

    holdings_cursor = db.portfolio_holdings.find({"portfolio_id": portfolio["_id"]})
    holdings = {}
    for holding in holdings_cursor:
        symbol = holding.get("stock_symbol")
        quantity = holding.get("quantity", 0)
        holdings[symbol] = quantity

    return jsonify({
        "usd": portfolio.get("available_balance", 0),
        "shares": holdings
    })

# Update trade endpoint to use auth
@app.route('/api/trade', methods=['POST'])
@token_required
def trade(current_user):
    data = request.get_json()
    symbol = data.get('symbol')
    trade_type = data.get('tradeType')
    amount = data.get('amount')
    price = data.get('price')

    if not symbol or not trade_type or amount is None or price is None:
        return jsonify({'error': 'Missing required fields.'}), 400

    try:
        amount = float(amount)
        price = float(price)
    except ValueError:
        return jsonify({'error': 'Amount and price must be numeric.'}), 400

    portfolio = db.portfolios.find_one({"user_id": current_user["_id"]})
    if not portfolio:
        return jsonify({"error": "Portfolio not found"}), 404

    available_usd = portfolio.get("available_balance", 0)
    holding = db.portfolio_holdings.find_one({"portfolio_id": portfolio["_id"], "stock_symbol": symbol})
    holding_quantity = holding.get("quantity", 0) if holding else 0

    if trade_type.upper() == 'BUY':
        if available_usd < amount:
            return jsonify({'error': 'Insufficient USD balance.'}), 400
        shares_bought = amount / price
        new_usd = available_usd - amount
        new_quantity = holding_quantity + shares_bought

        db.portfolios.update_one(
            {"_id": portfolio["_id"]},
            {"$set": {"available_balance": new_usd}}
        )
        if holding:
            db.portfolio_holdings.update_one(
                {"_id": holding["_id"]},
                {"$set": {"quantity": new_quantity}}
            )
        else:
            db.portfolio_holdings.insert_one({
                "portfolio_id": portfolio["_id"],
                "stock_symbol": symbol,
                "quantity": new_quantity,
                "average_price": price
            })
        max_buy = new_usd / price if price > 0 else 0
        max_sell = new_quantity * price
        return jsonify({
            'message': f"Bought {shares_bought:.3f} shares of {symbol} for ${amount:.2f}.",
            'usd': new_usd,
            'shares': {symbol: new_quantity},
            'maxBuy': max_buy,
            'maxSell': max_sell
        })

    elif trade_type.upper() == 'SELL':
        if holding_quantity < amount:
            return jsonify({'error': 'Insufficient share balance for this stock.'}), 400
        usd_gained = amount * price
        new_quantity = holding_quantity - amount
        new_usd = available_usd + usd_gained

        db.portfolios.update_one(
            {"_id": portfolio["_id"]},
            {"$set": {"available_balance": new_usd}}
        )
        if holding:
            db.portfolio_holdings.update_one(
                {"_id": holding["_id"]},
                {"$set": {"quantity": new_quantity}}
            )
        max_buy = new_usd / price if price > 0 else 0
        max_sell = new_quantity * price
        return jsonify({
            'message': f"Sold {amount:.3f} shares of {symbol} for ${usd_gained:.2f}.",
            'usd': new_usd,
            'shares': {symbol: new_quantity},
            'maxBuy': max_buy,
            'maxSell': max_sell
        })

    else:
        return jsonify({'error': 'Invalid tradeType. Must be BUY or SELL.'}), 400



# Updated Prediction Endpoint
# @app.route("/api/predict", methods=["POST"])
# def predict_stock():
#     try:
#         data = request.get_json()
#         symbol = data.get("symbol") if data else None
#         timeframe = data.get("timeframe", "1mo") if data else "3mo"

#         if not symbol:
#             return jsonify({"error": "The 'symbol' field is required."}), 400
        
#         if symbol not in STOCKS:
#             return jsonify({"error": "Invalid stock symbol."}), 400

#         predictor = StockPredictor(cache=STOCK_CACHE)
#         prediction = predictor.predict(symbol, timeframe)
#         return jsonify(prediction)
    
#     except Exception as e:
#         return jsonify({"error": f"Error processing request: {e}"}), 500
    
@socketio.on('connect')
def handle_connect():
    print('Client connected')
    # Send current stock data on connect
    for symbol, data in latest_stock_data.items():
        socketio.emit("stock_update", {
            "symbol": data["symbol"],
            "price": data["price"],
            "change": data["change"],
            "timestamp": data["timestamp"]
        }, room=request.sid)

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')



# model = genai.GenerativeModel("gemini-2.0-flash")
# @app.route("/api/chat", methods=["POST"])
# def chat():
#     data = request.json or {}
#     user_query = data.get("message", "").strip()
#     if not user_query:
#         return jsonify({"error": "Empty message"}), 400

#     try:
#         # start a fresh chat each time (or reuse + pass history)
#         chat = model.start_chat(history=[])
#         resp = chat.send_message(user_query)
#         return jsonify({"response": resp.text})
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    user_id = get_user_id()
    history = load_history(user_id)[-4:]
    perf = compute_portfolio_performance(user_id)
    portfolio_summary = format_summary(perf)
    prompt = build_prompt(history, portfolio_summary, request.json['message'])
    try:
        resp = gemini.complete(prompt, temperature=0.7, max_tokens=512)
    except RateLimitError:
        return {"error": "Service busy—please retry in a few seconds."}, 429
    save_history(user_id, request.json['message'], resp)
    return {"reply": resp}


def get_user_id():
    # This function should return the user ID from the JWT token
    # For now, we'll just return a dummy user ID
    return "dummy_user_id"
def load_history(user_id):
    # This function should load the chat history for the user from the database
    # For now, we'll just return an empty list
    return []
def compute_portfolio_performance(user_id):
    # This function should compute the portfolio performance for the user
    # For now, we'll just return a dummy performance
    return {
        "total_value": 10000,
        "daily_return": 0.01,
        "weekly_return": 0.05,
        "monthly_return": 0.10
    }
def format_summary(perf):
    # This function should format the portfolio performance summary
    # For now, we'll just return a dummy summary
    return {
        "total_value": perf["total_value"],
        "daily_return": perf["daily_return"],
        "weekly_return": perf["weekly_return"],
        "monthly_return": perf["monthly_return"]
    }
def build_prompt(history, portfolio_summary, user_message):
    # This function should build the prompt for the generative model
    # For now, we'll just return a dummy prompt
    return f"User message: {user_message}\nPortfolio summary: {portfolio_summary}\nChat history: {history}"




if __name__ == '__main__':
    # update_thread = threading.Thread(target=update_stock_data)
    # update_thread.daemon = True
    # update_thread.start()
    app=init_app()
    threading.Thread(target=start_finnhub_ws, daemon=True).start()

    # Option 1: Use socketio.run with additional parameters
    socketio.run(
        app,
        host="0.0.0.0",
        port=5000,
        debug=False,
        use_reloader=False,
        allow_unsafe_werkzeug=True  # Add this parameter
    )
    
    app.run(debug=True)
