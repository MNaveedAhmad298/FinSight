from flask import Blueprint, request, current_app, jsonify
from bson import ObjectId
import jwt
import google.generativeai as genai
from ...extensions import db

bp = Blueprint("chat", __name__)
users_collection = db["users"] 
portfoliodb= db["portfolios"]
holdingsdb = db["portfolio_holdings"]

# ---------- helper --------------------------------------------------
def _get_user():
    """Return user-doc or error-response."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return jsonify({"error": "Token missing"}), 401
    try:
        payload = jwt.decode(
            auth[7:], current_app.config["JWT_SECRET"], algorithms=["HS256"]
        )
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401
    user = users_collection.find_one({"_id": ObjectId(payload["user_id"])})
    if not user:
        return jsonify({"error": "User not found"}), 401
    return user

# ---------- routes --------------------------------------------------
@bp.post("/chat")
@bp.post("/ask")            # alias – keeps your old front-end call working
def chat():
    user = _get_user()
    if isinstance(user, tuple):          # already an error response
        return user

    data = request.get_json(silent=True) or {}
    user_msg = (data.get("message") or data.get("question") or "").strip()
    if not user_msg:
        return jsonify({"error": "Empty message"}), 400

    # ---- portfolio context ----
    portfolio = portfoliodb.find_one({"user_id": user["_id"]})
    balance   = portfolio.get("available_balance", 0) if portfolio else 0

    holdings_cursor = holdingsdb.find({"portfolio_id": portfolio["_id"]}) if portfolio else []
    holdings = [
        {"symbol": h["stock_symbol"], "qty": h["quantity"], "avg_price": h["average_price"]}
        for h in holdings_cursor
    ]

    # ---- build prompt ----
    system = (
        "You are FinSight, a friendly financial assistant. "
        "Always answer concisely in plain English. "
        "When relevant, refer to the user's portfolio below.\n\n"
        f"Current USD balance: ${balance:,.2f}\n"
        f"Holdings: {holdings or 'None'}\n\n"
    )
    prompt = f"{system}User: {user_msg}\nAssistant:"

    # ---- Gemini call ----
    try:
        genai.configure(api_key=current_app.config["GEMINI_API_KEY"])
        model = genai.GenerativeModel("gemini-2.0-flash")
        answer = model.generate_content(prompt).text
    except Exception as e:
        current_app.logger.exception("Gemini error")
        return jsonify({"error": "AI service unavailable"}), 503

    return jsonify({"reply": answer.strip()})