



from flask import Flask, jsonify, request
import yfinance as yf
import threading
import time
from flask_cors import CORS
from cachetools import TTLCache
from chatbot import FinSightAssistant
from pymongo import MongoClient
from portfolio import Portfolio
from predictor import StockPredictor
from flask_bcrypt import Bcrypt
import jwt
import datetime
import os
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from bson import ObjectId


load_dotenv()
chatbot = FinSightAssistant()

# JWT Configuration
JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key')  # Use environment variable in production

# Database connection
connection_string = (
    "mongodb+srv://rayanharoon:mongo123@cluster0.vg3h0.mongodb.net/test?tls=true"
)
try:
    client = MongoClient(connection_string)
    db = client.FinSight
    print("Connected to the database")
    stocks_collection = db.stocks
    users_collection = db.users  # Add users collection
except Exception as e:
    print(f"Error connecting to the database: {e}")

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {"origins": "http://localhost:5173"},
    r"/portfolio": {"origins": "http://localhost:5173"}  # Add this line to allow /portfolio endpoint
})
bcrypt = Bcrypt(app)  # Initialize bcrypt for password hashing

portfolio_instance = Portfolio(db)
app.register_blueprint(portfolio_instance.blueprint)

# List of stocks to track
STOCKS = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'JPM',
    'V', 'WMT', 'UNH', 'JNJ', 'MA', 'PG', 'HD', 'BAC', 'KO', 'F', 'PFE', 'CSCO'
]

# In-memory caches for live data
CACHE_DURATION = 60  # 1 minute for stock summary
cache = TTLCache(maxsize=20, ttl=CACHE_DURATION)
STOCK_CACHE = TTLCache(maxsize=20, ttl=3600)

# Background data fetching
def fetch_all_stocks():
    try:
        tickers = yf.Tickers(" ".join(STOCKS))
        data = {}
        for symbol in STOCKS:
            try:
                stock = tickers.tickers[symbol]
                history = stock.history(period="1d")
                if not history.empty:
                    stock_info = {
                        'symbol': symbol,
                        'name': stock.info.get('longName', symbol),
                        'open': history['Open'].iloc[0],
                        'high': history['High'].max(),
                        'low': history['Low'].min(),
                        'close': history['Close'].iloc[-1],
                        'change': ((history['Close'].iloc[-1] - history['Open'].iloc[0]) / 
                                   history['Open'].iloc[0]) * 100,
                        'volume': stock.info.get('volume', 0)
                    }
                    data[symbol] = stock_info
                    stocks_collection.update_one({'symbol': symbol}, {'$set': stock_info}, upsert=True)
            except Exception as e:
                print(f"Error processing {symbol}: {str(e)}")
                continue
        
        cache['stocks'] = data
    except Exception as e:
        print(f"Global fetch error: {str(e)}")

def update_stock_data():
    while True:
        fetch_all_stocks()
        time.sleep(60)

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
        "registeredAt": datetime.datetime.utcnow()
    }

    users_collection.insert_one(user)
    
    # Create an initial portfolio for the new user with some starting balance
    db.portfolios.insert_one({
        "user_id": user["_id"],
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
            "role": user["role"]
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

# API Endpoints
@app.route('/api/stocks')
def get_stocks():
    return jsonify(list(cache.get('stocks', {}).values()))

@app.route('/api/history/<symbol>')
def get_history(symbol):
    try:
        stock = yf.Ticker(symbol)
        history = stock.history(period="1d", interval="5m")
        return jsonify({
            'symbol': symbol,
            'data': [{
                'time': str(index),
                'value': row['Close']
            } for index, row in history.iterrows()]
        })
    except Exception as e:
        return jsonify({'error': 'Data unavailable', 'details': str(e)})

@app.route('/api/history/<symbol>/<period>')
def get_history_history(symbol, period):
    valid_periods = ['1d', '5d', '1mo', '3mo']
    if period not in valid_periods:
        period = '1d'
    
    cached_data = STOCK_CACHE.get(symbol, {}).get(period, None)
    if cached_data and len(cached_data) > 0:
        return jsonify({
            'symbol': symbol,
            'period': period,
            'data': cached_data
        })
    
    try:
        stock = yf.Ticker(symbol)
        interval = "5m" if period == "1d" else "1d"
        history = stock.history(period=period.lower(), interval=interval)
        data = [{
            'time': str(index),
            'value': row['Close']
        } for index, row in history.iterrows()]
        
        if symbol not in STOCK_CACHE:
            STOCK_CACHE[symbol] = {}
        STOCK_CACHE[symbol][period] = data
        
        return jsonify({
            'symbol': symbol,
            'period': period,
            'data': data
        })
    except Exception as e:
        return jsonify({'error': 'Data unavailable', 'details': str(e)})

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

@app.route("/api/ask", methods=["POST"])
def ask_assistant():
    try:
        data = request.get_json()
        query = data.get("query") if data else None

        if not query:
            return jsonify({"error": "The 'query' field is required."}), 400
        
        response_text = chatbot.get_response(query)
        return jsonify({"response": response_text})
    
    except Exception as e:
        return jsonify({"error": f"Error processing request: {e}"}), 500

# Updated Prediction Endpoint
@app.route("/api/predict", methods=["POST"])
def predict_stock():
    try:
        data = request.get_json()
        symbol = data.get("symbol") if data else None
        timeframe = data.get("timeframe", "1mo") if data else "3mo"

        if not symbol:
            return jsonify({"error": "The 'symbol' field is required."}), 400
        
        if symbol not in STOCKS:
            return jsonify({"error": "Invalid stock symbol."}), 400

        predictor = StockPredictor(cache=STOCK_CACHE)
        prediction = predictor.predict(symbol, timeframe)
        return jsonify(prediction)
    
    except Exception as e:
        return jsonify({"error": f"Error processing request: {e}"}), 500

if __name__ == '__main__':
    update_thread = threading.Thread(target=update_stock_data)
    update_thread.daemon = True
    update_thread.start()
    
    app.run(debug=True)
