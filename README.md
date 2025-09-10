# FinSight

## Setup Instructions

### 1. Environment Variables

Copy `.env.example` to `.env` in the project root and fill in all required values:

```sh
cp .env.example .env
```

- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `GEMINI_API_KEY`: Google Gemini API key
- `FINNHUB_API_KEY`: Finnhub API key
- `FLASK_SECRET`: Flask secret key
- `USER`/`PASS`: SMTP credentials for email
- `VITE_API_URL`: (Frontend) Base URL for backend API

### 2. Backend Setup

```sh
cd backend
pip install -r requirements.txt  # (create if missing)
python main.py
```

### 3. Frontend Setup

```sh
cd my-react-app
npm install
npm run dev
```

### 4. Running
- Ensure both backend and frontend are running.
- The frontend will use `VITE_API_URL` to connect to the backend.

--- 
