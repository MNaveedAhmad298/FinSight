# portfolio.py
from flask import Blueprint, jsonify

class Portfolio:
    def __init__(self, db):
        # Save the shared db instance
        self.db = db
        # Create a blueprint for portfolio routes
        self.blueprint = Blueprint('portfolio', __name__)
        # Static prices mapping remains within this class
        self.STATIC_CURRENT_PRICES = {
            "AAPL": 175.84,
            "GOOGL": 181.00,
            "MSFT": 285.00,
            "AMZN": 212.71,
            "JPM": 261.34
        }
        self.register_routes()

    def register_routes(self):
        @self.blueprint.route('/portfolio', methods=['GET'])
        def get_portfolio():
            """
            Returns Bob's portfolio data.
            """
            # Hard-code Bob as the logged-in user
            user = self.db.users.find_one({"email": "bob@example.com"})
            if not user:
                return jsonify({"error": "User (Bob) not found"}), 404

            # Get Bob's portfolio document
            portfolio = self.db.portfolios.find_one({"user_id": user["_id"]})
            if not portfolio:
                return jsonify({"error": "Portfolio not found"}), 404

            # Retrieve Bob's holdings from portfolio_holdings
            holdings_cursor = self.db.portfolio_holdings.find({"portfolio_id": portfolio["_id"]})
            holdings = []
            for h in holdings_cursor:
                symbol = h.get("stock_symbol")
                stock_name = h.get("stock_name")
                if not stock_name:
                    # Fallback stock names
                    stock_names = {
                        "AAPL": "Apple Inc.",
                        "AMZN": "Amazon.com Inc.",
                        "MSFT": "Microsoft Corporation",
                        "GOOGL": "Alphabet Inc.",
                        "JPM": "JPMorgan Chase & Co."
                    }
                    stock_name = stock_names.get(symbol, symbol)
                quantity = h.get("quantity", 0)
                avg_price = h.get("average_price", 0)
                current_price = self.STATIC_CURRENT_PRICES.get(symbol, 100.0)
                total_value = current_price * quantity

                holdings.append({
                    "stock_symbol": symbol,
                    "stock_name": stock_name,
                    "quantity": quantity,
                    "average_price": avg_price,
                    "current_price": current_price,
                    "total_value": total_value
                })

            return jsonify({
                "available_balance": portfolio.get("available_balance", 0),
                "holdings": holdings
            })
