import os
import json
import threading
from datetime import datetime
from flask import Flask, jsonify, render_template, request
from flask_socketio import SocketIO
from flask_cors import CORS  # Added for CORS support
import websocket
import time

# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------
FINNHUB_TOKEN     = "d0gicf1r01qhao4trdqgd0gicf1r01qhao4trdr0"
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


# Store latest prices and volumes
latest_stock_data = {}

# --------------------------------------------------
# FLASK + SOCKET.IO SETUP (threading mode, no reloader)
# --------------------------------------------------
app = Flask(__name__, static_folder="static", template_folder="templates")
app.config['SECRET_KEY'] = os.getenv("FLASK_SECRET", "secret!")
CORS(app)  # Enable CORS for all routes

# Initialize Socket.IO with the correct async mode
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="threading",
    logger=True,  # Enable logging for debugging
    engineio_logger=True  # Enable Engine.IO logging
)

# --------------------------------------------------
# FINNHUB WEBSOCKET CALLBACKS
# --------------------------------------------------
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
    if not FINNHUB_TOKEN:
        app.logger.error("FINNHUB_API_KEY environment variable not set. WebSocket will not connect.")
        return

    app.logger.info(f"Attempting to connect to Finnhub WebSocket with token: {'*' * (len(FINNHUB_TOKEN) - 4) + FINNHUB_TOKEN[-4:] if FINNHUB_TOKEN and len(FINNHUB_TOKEN) > 4 else 'Token too short or None'}")
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


# --------------------------------------------------
# ROUTES
# --------------------------------------------------
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/symbols")
def symbols():
    return jsonify(SUBSCRIBE_SYMBOLS)

@app.route("/api/stocks")
def stocks():
    # Return all current stock data
    return jsonify(list(latest_stock_data.values()))

# Register Socket.IO events if needed
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

# --------------------------------------------------
# MAIN
# --------------------------------------------------
if __name__ == "__main__":
    # start the Finnhub listener thread
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