# import os
# import smtplib
# from email.mime.text import MIMEText
# from email.mime.multipart import MIMEMultipart

# from flask import Flask, request, jsonify
# from pymongo import MongoClient
# from flask_cors import CORS
# from flask_bcrypt import Bcrypt
# import jwt            # PyJWT
# import datetime
# from dotenv import load_dotenv

# load_dotenv()
# app = Flask(__name__)
# CORS(app)
# bcrypt = Bcrypt(app)

# # MongoDB
# client = MongoClient(os.getenv('MONGO_URI'))
# db = client["FinSightDB"]
# users_collection = db["users"]

# # JWT secret
# JWT_SECRET = os.getenv('JWT_SECRET')
# # Signup API
# @app.route('/api/signup', methods=['POST'])
# def signup():
#     data = request.json
#     name = data.get('name')
#     email = data.get('email')
#     password = data.get('password')

#     if users_collection.find_one({"email": email}):
#         return jsonify({"message": "Email already registered"}), 400

#     hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

#     user = {
#         "name": name,
#         "email": email,
#         "passwordHash": hashed_password,
#         "role": "student",
#         "emailVerified": False,
#         "registeredAt": datetime.datetime.utcnow()
#     }

#     users_collection.insert_one(user)

#     return jsonify({"message": "Signup successful"}), 201

# # Login API
# @app.route('/api/login', methods=['POST'])
# def login():
#     data = request.json
#     email = data.get('email')
#     password = data.get('password')

#     user = users_collection.find_one({"email": email})

#     if user and bcrypt.check_password_hash(user['passwordHash'], password):
#         token_payload = {
#             'user_id': str(user['_id']),
#             'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
#         }
#         token = jwt.encode(token_payload, JWT_SECRET, algorithm='HS256')

#         user_data = {
#             "id": str(user["_id"]),
#             "name": user["name"],
#             "email": user["email"],
#             "role": user["role"]
#         }

#         return jsonify({"token": token, "user": user_data}), 200

#     return jsonify({"message": "Invalid email or password"}), 401

# # SMTP helper
# def send_email(to_email, subject, html_body):
#     host = "smtp.gmail.com"
#     port = 587
#     user = os.getenv('USER')
#     pwd  = os.getenv('PASS')

#     msg = MIMEMultipart('alternative')
#     msg['Subject'] = subject
#     msg['From']    = user
#     msg['To']      = to_email
#     msg.attach(MIMEText(html_body, 'html'))

#     with smtplib.SMTP(host, port) as server:
#         server.starttls()
#         if user and pwd:
#             server.login(user, pwd)
#         server.send_message(msg)

# # Forgot-password endpoint
# @app.route('/api/forgot-password', methods=['POST'])
# def forgot_password():
#     email = request.json.get('email')
#     user = users_collection.find_one({"email": email})
#     if not user:
#         # we can respond 200 here to avoid email-enumeration
#         return jsonify({"message": "If that email exists, a reset link has been sent."}), 200

#     # Create reset token
#     token = jwt.encode({
#         'email': email,
#         'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
#     }, JWT_SECRET, algorithm='HS256')

#     # Link into your React app
#     reset_link = f"http://localhost:5173/reset-password?token={token}"

#     # Send the email
#     try:
#         html = f"""
#           <p>Hello {user['name']},</p>
#           <p>Click below to reset your password (link expires in 1 hour):</p>
#           <p><a href="{reset_link}">Reset your FinSight password</a></p>
#           <p>If you didn’t request this, just ignore.</p>
#         """
#         send_email(email, "FinSight Password Reset", html)
#     except Exception as e:
#         # log this in real life!
#         print("SMTP error:", e)
#         return jsonify({"message": "Failed to send reset email."}), 500

#     return jsonify({"message": "If that email exists, a reset link has been sent."}), 200

# # Reset-password endpoint remains the same...
# @app.route('/api/reset-password', methods=['POST'])
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

# if __name__ == '__main__':
#     app.run(debug=True)
