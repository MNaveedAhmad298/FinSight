# config.py
import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# MongoDB Atlas Configuration
MONGODB_URI = os.environ.get('MONGODB_URI')
if not MONGODB_URI:
    raise ValueError("No MongoDB URI found. Please set the MONGODB_URI environment variable.")

# Database connection
client = MongoClient(MONGODB_URI)
db = client.finsight  # Database name

# Collections
stocks_collection = db.stocks
history_collection = db.history
portfolios_collection = db.portfolios
predictions_collection = db.predictions
queries_collection = db.queries

# Helper functions for database operations
def get_all_stocks():
    """Get all stocks from the database"""
    return list(stocks_collection.find({}, {'_id': 0}))

def get_stock_by_symbol(symbol):
    """Get a stock by its symbol"""
    return stocks_collection.find_one({'symbol': symbol}, {'_id': 0})

def get_historical_data(symbol, period):
    """Get historical data for a symbol and period"""
    result = history_collection.find_one({'symbol': symbol, 'period': period})
    if result:
        result.pop('_id', None)
    return result

def save_historical_data(symbol, period, data):
    """Save historical data to the database"""
    history_collection.update_one(
        {'symbol': symbol, 'period': period},
        {'$set': {
            'data': data,
            'last_updated': datetime.now()
        }},
        upsert=True
    )

def get_user_portfolio(user_id):
    """Get a user's portfolio"""
    portfolio = portfolios_collection.find_one({'user_id': user_id})
    if portfolio:
        portfolio.pop('_id', None)
    return portfolio

def save_user_portfolio(user_id, stocks):
    """Save a user's portfolio"""
    return portfolios_collection.update_one(
        {'user_id': user_id},
        {'$set': {
            'stocks': stocks,
            'last_updated': datetime.now()
        }},
        upsert=True
    )

def get_prediction(symbol, timeframe):
    """Get a prediction for a symbol and timeframe"""
    prediction = predictions_collection.find_one({
        'symbol': symbol,
        'timeframe': timeframe,
        'timestamp': {'$gt': datetime.now().timestamp() - 86400}  # Less than 1 day old
    })
    if prediction:
        prediction.pop('_id', None)
    return prediction

def save_prediction(prediction):
    """Save a prediction to the database"""
    return predictions_collection.insert_one(prediction)

def log_query(query, user_id=None):
    """Log a user query"""
    return queries_collection.insert_one({
        'query': query,
        'user_id': user_id,
        'timestamp': datetime.now()
    })