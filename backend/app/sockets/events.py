"""Socket streamer: uses Finnhub when market is open; otherwise sends last close.

Falls back to periodic yfinance polling if FINNHUB_API_KEY is missing.
"""

import os
import json
import time
import threading
import logging
from threading import Lock

import websocket  # type: ignore

from ..extensions import socketio
from ..services import market

_started = False
_lock = Lock()


def _start_finnhub_ws(app, api_key: str):
    """Connect to Finnhub WebSocket and emit updates to clients.

    We subscribe to all `SUBSCRIBE_SYMBOLS` using US stocks format (e.g., AAPL).
    """
    ws_url = f"wss://ws.finnhub.io?token={api_key}"

    def on_open(ws):
        with app.app_context():
            for sym in market.SUBSCRIBE_SYMBOLS:
                ws.send(json.dumps({"type": "subscribe", "symbol": sym}))

    def on_message(ws, message):
        with app.app_context():
            try:
                payload = json.loads(message)
                if payload.get("type") != "trade":
                    return
                data = payload.get("data", [])
                batch = {}
                now = int(time.time())
                for trade in data:
                    sym = trade.get("s")
                    price = float(trade.get("p", 0.0) or 0.0)
                    if not sym:
                        continue
                    prev = market.latest_stock_data.get(sym, {})
                    change_pct = 0.0
                    old = prev.get("price")
                    if old:
                        try:
                            change_pct = ((price - float(old)) / float(old)) * 100
                        except Exception:
                            change_pct = 0.0
                    market.latest_stock_data[sym] = {
                        "symbol": sym,
                        "name": market.STOCK_METADATA.get(sym, {}).get("name", sym),
                        "price": price,
                        "change": change_pct,
                        "timestamp": now,
                    }
                    batch[sym] = {
                        "symbol": sym,
                        "price": price,
                        "change": change_pct,
                        "timestamp": now,
                        "market_open": True,
                    }
                if batch:
                    socketio.emit("stock_update", batch)
            except Exception as e:
                logging.exception("Finnhub WS on_message error")
                socketio.emit("error", {"message": str(e)})

    def on_error(ws, error):
        with app.app_context():
            logging.error(f"Finnhub WS error: {error}")
            socketio.emit("error", {"message": str(error)})

    def on_close(ws, close_status_code, close_msg):
        with app.app_context():
            logging.warning("Finnhub WS closed")
            socketio.emit("info", {"message": "Finnhub socket closed"})

    ws = websocket.WebSocketApp(
        ws_url,
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close,
    )

    def run_ws():
        logging.info("Starting Finnhub WebSocket...")
        ws.run_forever(ping_interval=20, ping_timeout=10)

    threading.Thread(target=run_ws, daemon=True).start()


def _poll_yfinance_loop(app):
    with app.app_context():
        interval = app.config.get("STREAM_INTERVAL_SEC", 2)
        while True:
            try:
                if not market.is_market_open_now():
                    # Do not poll; we will serve last close from DB via snapshot
                    time.sleep(interval)
                    continue
                quotes = market.fetch_many(market.SUBSCRIBE_SYMBOLS)
                now = int(time.time())
                batch = {}
                for q in quotes:
                    sym = q["symbol"]
                    price = float(q.get("price", 0.0) or 0.0)
                    prev = market.latest_stock_data.get(sym, {})
                    change_pct = 0.0
                    old = prev.get("price")
                    if old:
                        try:
                            change_pct = ((price - float(old)) / float(old)) * 100
                        except Exception:
                            change_pct = 0.0
                    market.latest_stock_data[sym] = {
                        "symbol": sym,
                        "name": market.STOCK_METADATA.get(sym, {}).get("name", sym),
                        "price": price,
                        "change": change_pct,
                        "timestamp": now,
                    }
                    batch[sym] = {
                        "symbol": sym,
                        "price": price,
                        "change": change_pct,
                        "timestamp": now,
                        "market_open": True,
                    }
                if batch:
                    socketio.emit("stock_update", batch)
            except Exception as e:
                logging.exception("Polling loop error")
                socketio.emit("error", {"message": str(e)})
            time.sleep(interval)


def start_streamer_once(app):
    """Start the market streamer exactly once.

    - When market is open, prefer Finnhub if API key is provided. Else poll yfinance.
    - When market is closed, do nothing; clients receive last close via `snapshot`.
    """
    global _started
    with _lock:
        if _started:
            return
        _started = True

        api_key = os.environ.get("FINNHUB_API_KEY") or app.config.get("FINNHUB_API_KEY")

        def guard_loop():
            # This guard checks market hours and starts appropriate streamers
            # It runs continuously and will reconnect next open.
            while True:
                try:
                    if market.is_market_open_now():
                        if api_key:
                            _start_finnhub_ws(app, api_key)
                        else:
                            _poll_yfinance_loop(app)
                    # Sleep a bit before re-checking
                    time.sleep(30)
                except Exception as e:
                    logging.exception("Guard loop error")
                    socketio.emit("error", {"message": str(e)})
                    time.sleep(30)

        threading.Thread(target=guard_loop, daemon=True).start()
