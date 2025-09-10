# app/blueprints/market/routes.py
from flask import Blueprint, jsonify, request
from ...services import market

bp = Blueprint("market", __name__)

@bp.get("/symbols")
def symbols():
    return jsonify(market.SUBSCRIBE_SYMBOLS)


@bp.get("/snapshot")                 # NEW single route
def snapshot():
    """
    Returns   { "AAPL": {price, change, volume, ...}, ... }
    """
    data = market.snapshot(market.SUBSCRIBE_SYMBOLS)
    return jsonify(data)

@bp.get("/history/<symbol>/<period>")
def history(symbol, period="1d"):
    data = market.history(symbol, period)
    return jsonify(data)


@bp.get("/market-status")
def market_status():
    return jsonify(market.get_market_status())


