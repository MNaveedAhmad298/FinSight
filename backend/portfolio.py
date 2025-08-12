# portfolio.py
from flask import Blueprint, jsonify, request
from functools import wraps
import jwt
from datetime import datetime, timedelta
from bson import ObjectId
import os
from dotenv import load_dotenv
import json
import yfinance as yf

# Load environment variables
load_dotenv()
JWT_SECRET = os.getenv('JWT_SECRET', 'FinsightDB')

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].replace('Bearer ', '')

        if not token:
            return jsonify({'error': 'Token is missing'}), 401

        try:
            data = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            current_user = args[0].db.users.find_one({"_id": data['user_id']})
            if not current_user:
                return jsonify({'error': 'Invalid user'}), 401
            return f(current_user, *args, **kwargs)
        except:
            return jsonify({'error': 'Invalid token'}), 401

    return decorated

class Portfolio:
    def __init__(self, db):
        self.db = db
        self.blueprint = Blueprint('portfolio', __name__)
        self.holdings = {}  # {symbol: {'shares': int, 'avg_price': float, 'name': str}}
        self.cached_prices = {}
        self.price_cache_time = {}
        self.cache_expiry = 300  # 5 minutes
        self.register_routes()

    def register_routes(self):
        @self.blueprint.route('/portfolio', methods=['GET'])
        def get_portfolio():
            try:
                token = request.headers.get('Authorization')
                if not token:
                    return jsonify({'error': 'Token is missing'}), 401

                if token.startswith('Bearer '):
                    token = token[7:]

                try:
                    data = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
                    current_user = self.db.users.find_one({"_id": ObjectId(data['user_id'])})
                    if not current_user:
                        return jsonify({'error': 'Invalid user'}), 401
                except jwt.InvalidTokenError:
                    return jsonify({'error': 'Invalid token'}), 401

                # Get portfolio document
                portfolio = self.db.portfolios.find_one({"user_id": ObjectId(current_user["_id"])})
                if not portfolio:
                    # Create a new portfolio if it doesn't exist
                    portfolio = {
                        "user_id": ObjectId(current_user["_id"]),
                        "available_balance": 100000.00,
                        "created_at": datetime.now()
                    }
                    self.db.portfolios.insert_one(portfolio)
                    return jsonify({
                        'holdings': [],
                        'totalValue': portfolio["available_balance"],
                        'dailyProfit': 0,
                        'overallReturn': 0,
                        'availableBalance': portfolio["available_balance"]
                    })

                # Get all holdings for this portfolio
                holdings = list(self.db.portfolio_holdings.find({"portfolio_id": portfolio["_id"]}))
                
                formatted_holdings = []
                holdings_value = 0
                total_cost = 0
                daily_profit = 0

                for holding in holdings:
                    current_price = self.get_current_price(holding['stock_symbol'])
                    
                    # Get previous day's closing price
                    stock = yf.Ticker(holding['stock_symbol'])
                    hist = stock.history(period='2d')
                    previous_close = hist['Close'].iloc[-2] if len(hist) >= 2 else current_price
                    
                    holding_value = current_price * holding['quantity']
                    holding_cost = holding['average_price'] * holding['quantity']
                    holdings_value += holding_value
                    total_cost += holding_cost

                    # Calculate daily profit for this holding
                    daily_holding_profit = (current_price - previous_close) * holding['quantity']
                    daily_profit += daily_holding_profit

                    formatted_holdings.append({
                        'stock_symbol': holding['stock_symbol'],
                        'stock_name': self.get_stock_name(holding['stock_symbol']),
                        'quantity': holding['quantity'],
                        'average_price': holding['average_price'],
                        'current_price': current_price,
                        'previous_close': previous_close,
                        'total_value': holding_value
                    })

                available_balance = portfolio.get("available_balance", 0)
                total_value = available_balance + holdings_value

                # Calculate overall return: (total_value - (available_balance + total_cost)) / (available_balance + total_cost) * 100
                initial_investment = available_balance + total_cost
                if initial_investment > 0:
                    overall_return = ((total_value - initial_investment) / initial_investment) * 100
                else:
                    overall_return = 0

                return jsonify({
                    'holdings': formatted_holdings,
                    'totalValue': total_value,
                    'dailyProfit': daily_profit,
                    'overallReturn': overall_return,
                    'availableBalance': available_balance
                })

            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @self.blueprint.route('/api/trade', methods=['POST'])
        def trade():
            try:
                token = request.headers.get('Authorization')
                if not token:
                    return jsonify({'error': 'Token is missing'}), 401

                if token.startswith('Bearer '):
                    token = token[7:]

                try:
                    data = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
                    current_user = self.db.users.find_one({"_id": ObjectId(data['user_id'])})
                    if not current_user:
                        return jsonify({'error': 'Invalid user'}), 401
                except jwt.InvalidTokenError:
                    return jsonify({'error': 'Invalid token'}), 401

                # Get trade details from request
                trade_data = request.json
                symbol = trade_data.get('symbol')
                trade_type = trade_data.get('tradeType')
                # Ensure quantity is always an integer
                try:
                    quantity = int(float(trade_data.get('quantity', 0)))
                    if quantity != float(trade_data.get('quantity', 0)):
                        return jsonify({'error': 'Quantity must be a whole number'}), 400
                except ValueError:
                    return jsonify({'error': 'Invalid quantity'}), 400
                    
                price = float(trade_data.get('price', 0))

                if not all([symbol, trade_type, quantity, price]) or quantity <= 0:
                    return jsonify({'error': 'Invalid trade parameters'}), 400

                # Get user's portfolio
                portfolio = self.db.portfolios.find_one({"user_id": ObjectId(current_user["_id"])})
                if not portfolio:
                    return jsonify({'error': 'Portfolio not found'}), 404

                # Get current holdings
                holding = self.db.portfolio_holdings.find_one({
                    "portfolio_id": portfolio["_id"],
                    "stock_symbol": symbol
                })

                current_shares = holding['quantity'] if holding else 0
                available_balance = portfolio.get('available_balance', 0)

                if trade_type == 'BUY':
                    # Check if user has enough balance
                    total_cost = quantity * price
                    if total_cost > available_balance:
                        return jsonify({'error': 'Insufficient balance'}), 400

                    # Update or create holding
                    if holding:
                        new_quantity = current_shares + quantity
                        new_avg_price = ((current_shares * holding['average_price']) + (quantity * price)) / new_quantity
                        self.db.portfolio_holdings.update_one(
                            {"_id": holding["_id"]},
                            {"$set": {
                                "quantity": new_quantity,
                                "average_price": new_avg_price
                            }}
                        )
                    else:
                        self.db.portfolio_holdings.insert_one({
                            "portfolio_id": portfolio["_id"],
                            "stock_symbol": symbol,
                            "quantity": quantity,
                            "average_price": price
                        })

                    # Update available balance
                    self.db.portfolios.update_one(
                        {"_id": portfolio["_id"]},
                        {"$inc": {"available_balance": -total_cost}}
                    )

                elif trade_type == 'SELL':
                    # Check if user has enough shares
                    if not holding or quantity > current_shares:
                        return jsonify({'error': 'Insufficient shares'}), 400

                    # Calculate sale proceeds
                    sale_proceeds = quantity * price

                    # Update holding
                    new_quantity = current_shares - quantity
                    if new_quantity > 0:
                        self.db.portfolio_holdings.update_one(
                            {"_id": holding["_id"]},
                            {"$set": {"quantity": new_quantity}}
                        )
                    else:
                        # Remove holding if all shares are sold
                        self.db.portfolio_holdings.delete_one({"_id": holding["_id"]})

                    # Update available balance
                    self.db.portfolios.update_one(
                        {"_id": portfolio["_id"]},
                        {"$inc": {"available_balance": sale_proceeds}}
                    )

                # Get updated portfolio data
                updated_portfolio = self.db.portfolios.find_one({"_id": portfolio["_id"]})
                holdings = list(self.db.portfolio_holdings.find({"portfolio_id": portfolio["_id"]}))
                
                # Format holdings for response
                shares_data = {}
                for h in holdings:
                    shares_data[h['stock_symbol']] = h['quantity']

                return jsonify({
                    'usd': updated_portfolio['available_balance'],
                    'shares': shares_data
                })

            except Exception as e:
                return jsonify({'error': str(e)}), 500

    def get_stock_name(self, symbol):
        stock_names = {
            "AAPL": "Apple Inc.",
            "AMZN": "Amazon.com Inc.",
            "MSFT": "Microsoft Corporation",
            "GOOGL": "Alphabet Inc.",
            "JPM": "JPMorgan Chase & Co.",
            "META": "Meta Platforms Inc.",
            "NVDA": "NVIDIA Corporation",
            "TSLA": "Tesla Inc.",
            "V": "Visa Inc.",
            "WMT": "Walmart Inc.",
            "UNH": "UnitedHealth Group Inc.",
            "JNJ": "Johnson & Johnson",
            "MA": "Mastercard Inc.",
            "PG": "Procter & Gamble Co.",
            "HD": "The Home Depot Inc.",
            "BAC": "Bank of America Corp.",
            "KO": "The Coca-Cola Co.",
            "PFE": "Pfizer Inc.",
            "CSCO": "Cisco Systems Inc."
        }
        return stock_names.get(symbol, symbol)

    def add_trade(self, symbol: str, shares: int, price: float):
        if symbol not in self.holdings:
            stock = yf.Ticker(symbol)
            self.holdings[symbol] = {
                'shares': shares,
                'avg_price': price,
                'name': stock.info.get('longName', symbol)
            }
        else:
            current_shares = self.holdings[symbol]['shares']
            current_avg_price = self.holdings[symbol]['avg_price']
            
            # Calculate new average price
            total_shares = current_shares + shares
            if total_shares > 0:
                new_avg_price = ((current_shares * current_avg_price) + (shares * price)) / total_shares
                self.holdings[symbol]['shares'] = total_shares
                self.holdings[symbol]['avg_price'] = new_avg_price
            else:
                # If all shares are sold, remove the holding
                del self.holdings[symbol]

    def get_current_price(self, symbol: str) -> float:
        now = datetime.now()
        if (symbol in self.cached_prices and symbol in self.price_cache_time and 
            (now - self.price_cache_time[symbol]).total_seconds() < self.cache_expiry):
            return self.cached_prices[symbol]
        
        try:
            stock = yf.Ticker(symbol)
            current_price = stock.history(period='1d')['Close'].iloc[-1]
            self.cached_prices[symbol] = current_price
            self.price_cache_time[symbol] = now
            return current_price
        except Exception as e:
            print(f"Error fetching price for {symbol}: {e}")
            return self.cached_prices.get(symbol, 0.0)

    def get_portfolio_summary(self):
        total_value = 0
        daily_profit = 0
        total_cost = 0
        holdings_data = []

        for symbol, data in self.holdings.items():
            current_price = self.get_current_price(symbol)
            shares = data['shares']
            avg_price = data['avg_price']
            
            position_value = shares * current_price
            position_cost = shares * avg_price
            
            # Calculate change percentage
            change_percent = ((current_price - avg_price) / avg_price) * 100
            
            total_value += position_value
            total_cost += position_cost
            
            # Get yesterday's closing price for daily profit calculation
            stock = yf.Ticker(symbol)
            hist = stock.history(period='2d')
            if len(hist) >= 2:
                yesterday_price = hist['Close'].iloc[-2]
                daily_profit += shares * (current_price - yesterday_price)
            
            holdings_data.append({
                'symbol': symbol,
                'name': data['name'],
                'shares': shares,
                'avgPrice': avg_price,
                'currentPrice': current_price,
                'change': change_percent,
                'totalValue': position_value
            })

        # Calculate overall return percentage
        overall_return = ((total_value - total_cost) / total_cost * 100) if total_cost > 0 else 0

        return {
            'totalValue': total_value,
            'dailyProfit': daily_profit,
            'overallReturn': overall_return,
            'holdings': sorted(holdings_data, key=lambda x: x['totalValue'], reverse=True)
        }

    def save_to_file(self, filename='portfolio_data.json'):
        with open(filename, 'w') as f:
            json.dump(self.holdings, f)

    def load_from_file(self, filename='portfolio_data.json'):
        try:
            with open(filename, 'r') as f:
                self.holdings = json.load(f)
        except FileNotFoundError:
            self.holdings = {}
