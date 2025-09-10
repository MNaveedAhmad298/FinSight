# app/services/auth.py
import jwt
from datetime import datetime, timedelta, timezone

def issue_jwt(secret, payload, minutes=60):
    now = datetime.now(tz=timezone.utc)
    payload = {**payload, "iat": int(now.timestamp()), "exp": int((now + timedelta(minutes=minutes)).timestamp())}
    return jwt.encode(payload, secret, algorithm="HS256")

def verify_jwt(secret, token):
    return jwt.decode(token, secret, algorithms=["HS256"])
