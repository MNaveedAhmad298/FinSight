# from flask import Flask, jsonify, request
# import yfinance as yf
# import threading
# import time
# from flask_cors import CORS
# from cachetools import TTLCache
# from chatbot import FinSightAssistant
# from pymongo import MongoClient
# from portfolio import Portfolio
# from predictor import StockPredictor
# chatbot = FinSightAssistant()

# # Database connection
# connection_string = (
#     "mongodb+srv://rayanharoon:mongo123@cluster0.vg3h0.mongodb.net/test?tls=true"
# )
# try:
#     client = MongoClient(connection_string)
#     db = client.FinSight
#     print("Connected to the database")
#     stocks_collection = db.stocks
# except Exception as e:
#     print(f"Error connecting to the database: {e}")

# app = Flask(__name__)
# CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})

# portfolio_instance = Portfolio(db)
# app.register_blueprint(portfolio_instance.blueprint)

# # List of stocks to track
# STOCKS = [
#     'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'JPM',
#     'V', 'WMT', 'UNH', 'JNJ', 'MA', 'PG', 'HD', 'BAC', 'KO', 'F', 'PFE', 'CSCO'
# ]



# # In-memory caches for live data
# CACHE_DURATION = 60  # 1 minute for stock summary
# cache = TTLCache(maxsize=20, ttl=CACHE_DURATION)
# STOCK_CACHE = TTLCache(maxsize=20, ttl=3600)

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

# @app.route('/api/history/<symbol>/<period>')
# def get_history_history(symbol, period):
#     valid_periods = ['1d', '5d', '1mo', '3mo']
#     if period not in valid_periods:
#         period = '1d'
    
#     cached_data = STOCK_CACHE.get(symbol, {}).get(period, None)
#     if cached_data and len(cached_data) > 0:
#         return jsonify({
#             'symbol': symbol,
#             'period': period,
#             'data': cached_data
#         })
    
#     try:
#         stock = yf.Ticker(symbol)
#         interval = "5m" if period == "1d" else "1d"
#         history = stock.history(period=period.lower(), interval=interval)
#         data = [{
#             'time': str(index),
#             'value': row['Close']
#         } for index, row in history.iterrows()]
        
#         if symbol not in STOCK_CACHE:
#             STOCK_CACHE[symbol] = {}
#         STOCK_CACHE[symbol][period] = data
        
#         return jsonify({
#             'symbol': symbol,
#             'period': period,
#             'data': data
#         })
#     except Exception as e:
#         return jsonify({'error': 'Data unavailable', 'details': str(e)})

# @app.route('/api/balance', methods=['GET'])
# def get_balance():
#     user = db.users.find_one({"email": "bob@example.com"})
#     if not user:
#         return jsonify({"error": "User not found"}), 404

#     portfolio = db.portfolios.find_one({"user_id": user["_id"]})
#     if not portfolio:
#         return jsonify({"error": "Portfolio not found"}), 404

#     holdings_cursor = db.portfolio_holdings.find({"portfolio_id": portfolio["_id"]})
#     holdings = {}
#     for holding in holdings_cursor:
#         symbol = holding.get("stock_symbol")
#         quantity = holding.get("quantity", 0)
#         holdings[symbol] = quantity

#     return jsonify({
#         "usd": portfolio.get("available_balance", 0),
#         "shares": holdings
#     })

# @app.route('/api/trade', methods=['POST'])
# def trade():
#     data = request.get_json()
#     symbol = data.get('symbol')
#     trade_type = data.get('tradeType')
#     amount = data.get('amount')
#     price = data.get('price')

#     if not symbol or not trade_type or amount is None or price is None:
#         return jsonify({'error': 'Missing required fields.'}), 400

#     try:
#         amount = float(amount)
#         price = float(price)
#     except ValueError:
#         return jsonify({'error': 'Amount and price must be numeric.'}), 400

#     user = db.users.find_one({"email": "bob@example.com"})
#     if not user:
#         return jsonify({"error": "User not found"}), 404

#     portfolio = db.portfolios.find_one({"user_id": user["_id"]})
#     if not portfolio:
#         return jsonify({"error": "Portfolio not found"}), 404

#     available_usd = portfolio.get("available_balance", 0)
#     holding = db.portfolio_holdings.find_one({"portfolio_id": portfolio["_id"], "stock_symbol": symbol})
#     holding_quantity = holding.get("quantity", 0) if holding else 0

#     if trade_type.upper() == 'BUY':
#         if available_usd < amount:
#             return jsonify({'error': 'Insufficient USD balance.'}), 400
#         shares_bought = amount / price
#         new_usd = available_usd - amount
#         new_quantity = holding_quantity + shares_bought

#         db.portfolios.update_one(
#             {"_id": portfolio["_id"]},
#             {"$set": {"available_balance": new_usd}}
#         )
#         if holding:
#             db.portfolio_holdings.update_one(
#                 {"_id": holding["_id"]},
#                 {"$set": {"quantity": new_quantity}}
#             )
#         else:
#             db.portfolio_holdings.insert_one({
#                 "portfolio_id": portfolio["_id"],
#                 "stock_symbol": symbol,
#                 "quantity": new_quantity,
#                 "average_price": price
#             })
#         max_buy = new_usd / price if price > 0 else 0
#         max_sell = new_quantity * price
#         return jsonify({
#             'message': f"Bought {shares_bought:.3f} shares of {symbol} for ${amount:.2f}.",
#             'usd': new_usd,
#             'shares': {symbol: new_quantity},
#             'maxBuy': max_buy,
#             'maxSell': max_sell
#         })

#     elif trade_type.upper() == 'SELL':
#         if holding_quantity < amount:
#             return jsonify({'error': 'Insufficient share balance for this stock.'}), 400
#         usd_gained = amount * price
#         new_quantity = holding_quantity - amount
#         new_usd = available_usd + usd_gained

#         db.portfolios.update_one(
#             {"_id": portfolio["_id"]},
#             {"$set": {"available_balance": new_usd}}
#         )
#         if holding:
#             db.portfolio_holdings.update_one(
#                 {"_id": holding["_id"]},
#                 {"$set": {"quantity": new_quantity}}
#             )
#         max_buy = new_usd / price if price > 0 else 0
#         max_sell = new_quantity * price
#         return jsonify({
#             'message': f"Sold {amount:.3f} shares of {symbol} for ${usd_gained:.2f}.",
#             'usd': new_usd,
#             'shares': {symbol: new_quantity},
#             'maxBuy': max_buy,
#             'maxSell': max_sell
#         })

#     else:
#         return jsonify({'error': 'Invalid tradeType. Must be BUY or SELL.'}), 400

# @app.route("/api/ask", methods=["POST"])
# def ask_assistant():
#     try:
#         data = request.get_json()
#         query = data.get("query") if data else None

#         if not query:
#             return jsonify({"error": "The 'query' field is required."}), 400
        
#         response_text = chatbot.get_response(query)
#         return jsonify({"response": response_text})
    
#     except Exception as e:
#         return jsonify({"error": f"Error processing request: {e}"}), 500

# # Updated Prediction Endpoint
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

# if __name__ == '__main__':
#     update_thread = threading.Thread(target=update_stock_data)
#     update_thread.daemon = True
#     update_thread.start()
    
#     app.run(debug=True)
