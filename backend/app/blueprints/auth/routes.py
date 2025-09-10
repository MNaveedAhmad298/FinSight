# app/blueprints/auth/routes.py
from flask import Blueprint, request, current_app
from ...extensions import bcrypt, db
from ...utils.responses import ok, err
from ...services.auth import issue_jwt, verify_jwt
from pymongo.errors import ServerSelectionTimeoutError
from datetime import datetime, timedelta
import pytz
import jwt
from flask import jsonify


bp = Blueprint("auth", __name__)
users_collection = lambda: db["users"]
users_collection = db["users"] 

@bp.post("/signup")
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
        "registeredAt": datetime.now(pytz.utc),
        "nickname": name,  # Initialize nickname with name
        "avatar": None     # Initialize empty avatar
    }

    result = users_collection.insert_one(user)
    
    # Create an initial portfolio for the new user with some starting balance
    db.portfolios.insert_one({
        "user_id": result.inserted_id,
        "available_balance": 10000.00  # Starting with $10,000 virtual money
    })

    return jsonify({"message": "Signup successful"}), 201


@bp.post("/login")
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    user = users_collection.find_one({"email": email})

    if user and bcrypt.check_password_hash(user['passwordHash'], password):
        token_payload = {
            'user_id': str(user['_id']),
            "exp": datetime.now(pytz.utc) + timedelta(hours=1)
        }
        token = jwt.encode(token_payload, current_app.config['JWT_SECRET'], algorithm='HS256')

        user_data = {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "nickname": user.get("nickname", user["name"]),
            "avatar": user.get("avatar")
        }

        return jsonify({"token": token, "user": user_data}), 200

    return jsonify({"message": "Invalid email or password"}), 401

# Forgot password endpoint
@bp.route('/api/forgot-password', methods=['POST'])
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
@bp.route('/api/reset-password', methods=['POST'])
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



# Forgot password endpoint
# @bp.route('/api/forgot-password', methods=['POST'])
# def forgot_password():
#     email = request.json.get('email')
#     user = users_collection.find_one({"email": email})
#     if not user:
#         return jsonify({"message": "If that email exists, a reset link has been sent."}), 200

#     token = jwt.encode({
#         'email': email,
#         'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
#     }, JWT_SECRET, algorithm='HS256')

#     reset_link = f"http://localhost:5173/reset-password?token={token}"

#     try:
#         html = f"""
#           <p>Hello {user['name']},</p>
#           <p>Click below to reset your password (link expires in 1 hour):</p>
#           <p><a href="{reset_link}">Reset your FinSight password</a></p>
#           <p>If you didn't request this, just ignore.</p>
#         """
#         send_email(email, "FinSight Password Reset", html)
#     except Exception as e:
#         print("SMTP error:", e)
#         return jsonify({"message": "Failed to send reset email."}), 500

#     return jsonify({"message": "If that email exists, a reset link has been sent."}), 200

# Reset password endpoint
# @bp.route('/api/reset-password', methods=['POST'])
# def reset_password():
#     data = request.json
#     token = data.get('token')
#     new_password = data.get('password')

#     try:
#         payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
#         email = payload['email']
#     except jwt.ExpiredSignatureError:
#         return jsonify({'message': 'Reset link expired.'}), 400
#     except jwt.InvalidTokenError:
#         return jsonify({'message': 'Invalid reset token.'}), 400

#     hashed = bcrypt.generate_password_hash(new_password).decode('utf-8')
#     result = users_collection.update_one({'email': email}, {'$set': {'passwordHash': hashed}})
#     if result.matched_count == 0:
#         return jsonify({'message': 'User not found.'}), 404

#     return jsonify({'message': 'Password reset successful.'}), 200
