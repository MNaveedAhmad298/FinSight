# import re
# import yfinance as yf
# from cachetools import TTLCache

# TICKER_REGEX = re.compile(r"\b([A-Z]{1,5})\b")

# def extract_tickers(text: str) -> list[str]:
#     return list(set(TICKER_REGEX.findall(text)))

# def is_price_query(text: str) -> bool:
#     # simple keyword check + presence of ticker
#     keywords = ["price", "quote", "value", "current", "worth"]
#     return any(kw in text.lower() for kw in keywords) and bool(extract_tickers(text))



# # cache up to 100 tickers for 60 seconds
# quote_cache = TTLCache(maxsize=100, ttl=60)

# def get_quote(ticker: str) -> float:
#     if ticker in quote_cache:
#         return quote_cache[ticker]
#     data = yf.Ticker(ticker).history(period="1d", interval="1m")
#     price = float(data["Close"].iloc[-1])
#     quote_cache[ticker] = price
#     return price

# import os
# import requests

# API_KEY    = os.getenv("GEMINI_API_KEY")

# def ask_gemini(prompt: str, user_ctx: str) -> str:
#     headers = {"Authorization": f"Bearer {API_KEY}"}
#     body = {
#       "prompt": {
#         "messages": [
#           {"author": "system", "content": "You are a helpful stock‑market assistant."},
#           {"author": "system", "content": user_ctx},
#           {"author": "user",   "content": prompt}
#         ]
#       },
#       "temperature": 0.2,f
#       "maxOutputTokens": 512
#     }
#     resp = requests.post(headers=headers, json=body, params={"key": API_KEY})
#     resp.raise_for_status()
#     return resp.json()["candidates"][0]["content"]

