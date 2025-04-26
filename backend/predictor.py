import os
import pandas as pd
import numpy as np
import joblib
import tensorflow as tf
import yfinance as yf

class StockPredictor:
    def __init__(self, cache=None):
        self.model = tf.keras.models.load_model('./models/stock_model.keras')
        self.scalers = joblib.load('./models/scalers.joblib')
        self.lookback = 60  # Must match the training window
        self.cache = cache

    def fetch_historical_data(self, ticker, period='6mo'):
        key = f"historical_{ticker}"
        # Check the shared cache first.
        if self.cache:
            data = self.cache.get(key)
            if data is not None:
                return data

        # Try reading from a JSON file in ./data
        json_path = f'./data/{ticker}_historical.json'
        if os.path.exists(json_path):
            try:
                data = pd.read_json(json_path, orient='records', convert_dates=True)
                if 'Date' in data.columns:
                    data.set_index('Date', inplace=True)
                    data.index = pd.to_datetime(data.index)
                if self.cache:
                    self.cache[key] = data
                return data
            except Exception as e:
                print(f"Error reading JSON for {ticker}: {e}")

        # Fallback: fetch via yfinance
        data = yf.Ticker(ticker).history(period=period)
        if data.empty:
            raise ValueError(f"No historical data fetched for {ticker}")
        try:
            data_reset = data.reset_index()
            data_reset.to_json(json_path, orient='records', date_format='iso')
        except Exception as e:
            print(f"Error saving JSON for {ticker}: {e}")
        if self.cache:
            self.cache[key] = data
        return data

    def _get_features(self, data):
        df = data.copy()
        df['SMA_20'] = df['Close'].rolling(20).mean().ffill()
        delta = df['Close'].diff()
        gain = delta.where(delta > 0, 0)
        loss = -delta.where(delta < 0, 0)
        df['RSI'] = 100 - (100 / (1 + (gain.rolling(14).mean() / loss.rolling(14).mean())))
        df['Volatility'] = df['Close'].pct_change().rolling(20).std() * np.sqrt(252)
        return df[['Close', 'SMA_20', 'RSI', 'Volatility']].dropna()

    def predict(self, ticker, period='6mo'):
        # Fetch historical data with the given period (default 6mo for sufficient history)
        data = self.fetch_historical_data(ticker, period)
        if len(data) < self.lookback:
            raise ValueError(f"Need at least {self.lookback} days of data for {ticker}")
        features = self._get_features(data)
        scaler = self.scalers.get(ticker)
        if not scaler:
            raise ValueError(f"No scaler found for {ticker}")
        scaled = scaler.transform(features[-self.lookback:])
        prediction = self.model.predict(scaled.reshape(1, self.lookback, -1))
        dummy = np.zeros((prediction.shape[1], 4))
        dummy[:, 0] = prediction[0]
        predicted_prices = scaler.inverse_transform(dummy)[:, 0]
        
        # Prepare historical dates and prices for the response.
        historical_dates = data.index.strftime("%Y-%m-%d").tolist()
        historical_prices = data["Close"].tolist()
        
        # Map predicted prices to fixed future intervals:
        # next_day (1d), one_week (5d), one_month (1mo), three_months (3mo)
        predictions = {
            "next_day": float(predicted_prices[0]),
            "one_week": float(predicted_prices[5]) if len(predicted_prices) > 5 else None,
            "one_month": float(predicted_prices[20]) if len(predicted_prices) > 20 else None,
            "three_months": float(predicted_prices[60]) if len(predicted_prices) > 60 else None
        }
        
        # Extra info: current price and percent change.
        current_price = historical_prices[-1]
        previous_price = historical_prices[-2] if len(historical_prices) >= 2 else current_price
        percent_change = ((current_price - previous_price) / previous_price * 100) if previous_price != 0 else 0
        extra_info = {
            "current_price": current_price,
            "percent_change": percent_change,
            "ticker": ticker
        }
        
        return {
            "historical_dates": historical_dates,
            "historical_prices": historical_prices,
            "predictions": predictions,
            "extra_info": extra_info
        }
