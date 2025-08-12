# forecast.py

import json
from datetime import timedelta, datetime
import yfinance as yf
from openai import OpenAI

# Make sure you've already done: openai.api_key = os.getenv("OPENAI_API_KEY") in othermain.py

def get_stock_forecast(openai_key: str, ticker_symbol: str, forecast_period: str):
    """
    Fetch last 60 days of closes and ask GPT-4 to predict the next 3/7/15/30 days,
    returning a JSON object with historical data and predictions.
    """
    print(f"Starting forecast for {ticker_symbol} with period {forecast_period}")  # Debug log
    
    # Map shortcuts to days
    period_map = {"3d": 3, "7d": 7, "15d": 15, "1m": 30}
    days = period_map.get(forecast_period.lower())
    if days is None:
        print(f"Invalid forecast period: {forecast_period}")  # Debug log
        raise ValueError("forecast_period must be one of: " + ", ".join(period_map.keys()))

    # Download history
    try:
        print(f"Fetching history for {ticker_symbol}")  # Debug log
        stock = yf.Ticker(ticker_symbol)
        hist = stock.history(period="60d", interval="1d")["Close"]
        if hist.empty:
            print(f"No historical data found for {ticker_symbol}")  # Debug log
            return {"error": f"No historical data for {ticker_symbol}"}
        print(f"Successfully fetched {len(hist)} days of history")  # Debug log
    except Exception as e:
        print(f"Error fetching history: {str(e)}")  # Debug log
        return {"error": f"Error fetching data: {str(e)}"}

    # Build dates and context
    last_date = hist.index[-1].date()
    future_dates = [(last_date + timedelta(days=i)).isoformat() for i in range(1, days+1)]
    context = "\n".join(f"{d.date().isoformat()}: {p:.2f}" for d, p in zip(hist.index, hist.values))

    # Build prompt
    prompt = (
        f"Here are the last 60 days of {ticker_symbol} closing prices:\n"
        f"{context}\n\n"
        f"Predict the closing price for these upcoming dates:\n"
        f"{future_dates}\n\n"
        "Respond **only** with a JSON array in this exact format:\n"
        "[\n"
        "  {\"date\": \"YYYY-MM-DD\", \"predicted_close\": 123.45},\n"
        "  ...\n"
        "]\n"
        "Do not include any other text."
    )

    # Call OpenAI
    try:
        print("Calling OpenAI API")  # Debug log
        OpenAI.api_key = openai_key
        client = OpenAI()
        resp = client.chat.completions.create(
            model="gpt-4",
            temperature=0.0,
            messages=[
                {"role": "system", "content": "You are a financial forecasting assistant. Output valid JSON and nothing else."},
                {"role": "user", "content": prompt}
            ]
        )
        raw = resp.choices[0].message.content.strip()
        print("Received response from OpenAI")  # Debug log
    except Exception as e:
        print(f"Error calling OpenAI: {str(e)}")  # Debug log
        return {"error": f"Error getting prediction: {str(e)}"}

    # Parse JSON
    try:
        predictions = json.loads(raw)
        print(f"Successfully parsed {len(predictions)} predictions")  # Debug log
        
        # Format response for frontend (return all predicted points)
        response = {
            "historical_dates": [d.date().isoformat() for d in hist.index],
            "historical_prices": hist.values.tolist(),
            "predicted_dates": [p["date"] for p in predictions],
            "predicted_prices": [p["predicted_close"] for p in predictions],
            "extra_info": {
                "last_updated": datetime.now().isoformat(),
                "confidence": "High",  # You could make this dynamic based on model confidence
                "model": "GPT-4"
            }
        }
        print("Successfully formatted response")  # Debug log
        print(f"Response: {response}")  # Debug log
        return response
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {str(e)}")  # Debug log
        print(f"Raw response: {raw}")  # Debug log
        return {"error": "Failed to parse JSON", "raw_response": raw}
    except Exception as e:
        print(f"Unexpected error: {str(e)}")  # Debug log
        return {"error": f"Unexpected error: {str(e)}"}
