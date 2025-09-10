from flask import Blueprint

user_routes = Blueprint('user', __name__)
stock_routes = Blueprint('stock', __name__)
chat_routes = Blueprint('chat', __name__)

# Example user route
def register_user_routes(app):
    @user_routes.route('/api/signup', methods=['POST'])
    def signup():
        # TODO: Move signup logic here from main.py
        pass
    app.register_blueprint(user_routes)

# Example stock route
def register_stock_routes(app):
    @stock_routes.route('/api/stock', methods=['GET'])
    def get_stock():
        # TODO: Move stock logic here from main.py
        pass
    app.register_blueprint(stock_routes)

# Example chat route
def register_chat_routes(app):
    @chat_routes.route('/api/chat', methods=['POST'])
    def chat():
        # TODO: Move chat logic here from main.py
        pass
    app.register_blueprint(chat_routes)