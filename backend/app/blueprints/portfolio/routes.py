# app/blueprints/portfolio/routes.py
from flask import Blueprint, request, current_app, jsonify, abort
from ...extensions import db
from ...utils.responses import ok, err
from ...services.portfolio import PortfolioSvc
from ...services import market
import jwt
from bson import ObjectId
from flask import jsonify
from datetime import datetime
import yfinance as yf
from ...services.market import fetch_quote

bp = Blueprint("portfolio", __name__)
portfolio = PortfolioSvc()
users_collection = db["users"] 
portfoliodb= db["portfolios"]
holdingsdb = db["portfolio_holdings"]

# ---------- helpers -------------------------------------------------
def _get_user():
    """Return user-dict OR abort with 401."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        abort(401, description="Token missing")
    try:
        payload = jwt.decode(
            auth[7:], current_app.config["JWT_SECRET"], algorithms=["HS256"]
        )
    except jwt.InvalidTokenError:
        abort(401, description="Invalid token")

    user = current_app.db.users.find_one({"_id": ObjectId(payload["user_id"])})
    if not user:
        abort(401, description="User not found")
    return user

# ---------- routes --------------------------------------------------
@bp.get("/balance")
def get_balance():
    user = _get_user()
    if hasattr(user, "status_code"):   # already an error response
        return user

    portfolio = portfoliodb.find_one({"user_id": user["_id"]})
    if not portfolio:
        return err("Portfolio not found", 404)

    holdings = {
        h["stock_symbol"]: h["quantity"]
        for h in holdingsdb.find({"portfolio_id": portfolio["_id"]})
    }
    return ok({"usd": portfolio.get("available_balance", 0), "shares": holdings})

# --------------------------------------------------------------------
@bp.post("/trade")
def trade():
    user = _get_user()
    if hasattr(user, "status_code"):
        return user

    data = request.get_json(silent=True) or {}
    symbol = (data.get("symbol") or "").upper()
    side   = (data.get("tradeType") or data.get("side") or "").upper()
    qty    = data.get("quantity")

    # normalise qty → int
    try:
        qty = int(float(qty))
        if qty <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return err("quantity must be a positive integer", 400)

    if side not in {"BUY", "SELL"}:
        return err("tradeType must be BUY or SELL", 400)

    # current market price
    price = fetch_quote(symbol)["price"]
    total = price * qty

    portfolio = portfoliodb.find_one({"user_id": user["_id"]})
    if not portfolio:
        return err("Portfolio not found", 404)

    # ----- BUY -------------------------------------------------------
    if side == "BUY":
        if portfolio.get("available_balance", 0) < total:
            return err("Insufficient balance", 400)

        # decrement cash
        portfoliodb.update_one(
            {"_id": portfolio["_id"]},
            {"$inc": {"available_balance": -total}}
        )

        # update / insert holding
        holding = holdingsdb.find_one(
            {"portfolio_id": portfolio["_id"], "stock_symbol": symbol}
        )
        if holding:
            new_qty = holding["quantity"] + qty
            new_avg = (
                (holding["quantity"] * holding["average_price"]) + (qty * price)
            ) / new_qty
            holdingsdb.update_one(
                {"_id": holding["_id"]},
                {"$set": {"quantity": new_qty, "average_price": new_avg}}
            )
        else:
            holdingsdb.insert_one({
                "portfolio_id": portfolio["_id"],
                "stock_symbol": symbol,
                "quantity": qty,
                "average_price": price
            })

    # ----- SELL ------------------------------------------------------
    else:  # SELL
        holding = holdingsdb.find_one(
            {"portfolio_id": portfolio["_id"], "stock_symbol": symbol}
        )
        if not holding or holding["quantity"] < qty:
            return err("Insufficient shares", 400)

        new_qty = holding["quantity"] - qty
        if new_qty == 0:
            holdingsdb.delete_one({"_id": holding["_id"]})
        else:
            holdingsdb.update_one(
                {"_id": holding["_id"]},
                {"$set": {"quantity": new_qty}}
            )

        # increment cash
        portfoliodb.update_one(
            {"_id": portfolio["_id"]},
            {"$inc": {"available_balance": total}}
        )

    # ----- response --------------------------------------------------
    updated = portfoliodb.find_one({"_id": portfolio["_id"]})
    shares = {
        h["stock_symbol"]: h["quantity"]
        for h in holdingsdb.find({"portfolio_id": portfolio["_id"]})
    }
    return ok({
        "usd": updated["available_balance"],
        "shares": shares
    })

def get_stock_name(symbol):
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

def _current_price(symbol: str) -> float:
    try:
        return float(yf.Ticker(symbol).history(period="1d")["Close"].iloc[-1])
    except Exception:
        return 0.0  

@bp.get("/portfolio")
def get_portfolio():
            try:
                token = request.headers.get('Authorization')
                if not token:
                    return jsonify({'error': 'Token is missing'}), 401

                if token.startswith('Bearer '):
                    token = token[7:]

                try:
                    data = jwt.decode(token, current_app.config["JWT_SECRET"], algorithms=['HS256'])
                    current_user = users_collection.find_one({"_id": ObjectId(data['user_id'])})
                    if not current_user:
                        return jsonify({'error': 'Invalid user'}), 401
                except jwt.InvalidTokenError:
                    return jsonify({'error': 'Invalid token'}), 401

                # Get portfolio document
                portfolio = portfoliodb.find_one({"user_id": ObjectId(current_user["_id"])})
                if not portfolio:
                    # Create a new portfolio if it doesn't exist
                    portfolio = {
                        "user_id": ObjectId(current_user["_id"]),
                        "available_balance": 100000.00,
                        "created_at": datetime.now()
                    }
                    portfoliodb.insert_one(portfolio)
                    return jsonify({
                        'holdings': [],
                        'totalValue': portfolio["available_balance"],
                        'dailyProfit': 0,
                        'overallReturn': 0,
                        'availableBalance': portfolio["available_balance"]
                    })

                # Get all holdings for this portfolio
                holdings = list(holdingsdb.find({"portfolio_id": portfolio["_id"]}))
                
                formatted_holdings = []
                holdings_value = 0
                total_cost = 0
                daily_profit = 0

                for holding in holdings:
                    current_price = _current_price(holding['stock_symbol'])
                    
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
                        'stock_name': get_stock_name(holding['stock_symbol']),
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



