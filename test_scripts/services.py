# services.py
# Business logic for users, stocks, and chat
@app.route('/api/signup', methods=['POST'])
def signup_user(data, db):
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

def get_stock_data(symbol, db):
    

def handle_chat(message, db):
    # TODO: Move chat logic here from main.py
    pass