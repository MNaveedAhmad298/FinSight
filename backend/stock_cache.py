import os
import time
import threading
import yfinance as yf
import random
import json
from datetime import datetime, timedelta
import os.path

class StockDataCache:
    def __init__(self, db, SUBSCRIBE_SYMBOLS, periods, cache_dir='./stock_cache'):
        """
        Initialize the stock data cache - fetch once per day
        
        Args:
            db: MongoDB database connection
            stock_list: List of stock symbols to track
            periods: List of time periods to cache (e.g. "1d", "5d", etc.)
            cache_dir: Directory to store file-based cache
        """
        self.db = db
        self.SUBSCRIBE_SYMBOLS = SUBSCRIBE_SYMBOLS
        self.periods = periods
        self.lock = threading.Lock()
        self.last_update = {}  # Track when each stock/period was last updated
        self.cache_dir = cache_dir
        self.running = True
        
        # Create cache directory if it doesn't exist
        if not os.path.exists(cache_dir):
            os.makedirs(cache_dir)
            
        # Load existing last_update times from file
        self._load_update_times()
        
        # Create indexes for faster lookups
        self.db.stock_cache.create_index([("symbol", 1), ("period", 1)])
    
    def _load_update_times(self):
        """Load last update times from file"""
        update_file = os.path.join(self.cache_dir, 'last_updates.json')
        if os.path.exists(update_file):
            try:
                with open(update_file, 'r') as f:
                    saved_times = json.load(f)
                    # Convert string dates back to datetime
                    for key, time_str in saved_times.items():
                        symbol, period = key.split(':')
                        self.last_update[(symbol, period)] = datetime.fromisoformat(time_str)
                print(f"Loaded {len(saved_times)} cache timestamps")
            except Exception as e:
                print(f"Error loading cache timestamps: {e}")
    
    def _save_update_times(self):
        """Save last update times to file"""
        update_file = os.path.join(self.cache_dir, 'last_updates.json')
        try:
            # Convert datetime objects to strings for JSON serialization
            times_dict = {}
            for (symbol, period), dt in self.last_update.items():
                times_dict[f"{symbol}:{period}"] = dt.isoformat()
                
            with open(update_file, 'w') as f:
                json.dump(times_dict, f)
        except Exception as e:
            print(f"Error saving cache timestamps: {e}")
    
    def start_background_updates(self):
        """Start the background thread to check for daily updates"""
        self.running = True
        thread = threading.Thread(target=self._daily_update_checker, daemon=True)
        thread.start()
        return thread
    
    def stop_background_updates(self):
        """Stop the background update thread"""
        self.running = False
    
    def _daily_update_checker(self):
        """Check once per hour if stocks need daily updates"""
        while self.running:
            try:
                self._update_outdated_stocks()
                # Sleep for 1 hour before checking again
                time.sleep(3600)
            except Exception as e:
                print(f"Error in daily update checker: {e}")
                time.sleep(300)  # Wait 5 minutes before retry
    
    def _update_outdated_stocks(self):
        """Update any stocks that haven't been updated today"""
        today = datetime.now().date()
        updated_count = 0
        
        # Process stocks in random order to avoid patterns
        stock_period_pairs = [(s, p) for s in self.stock_list for p in self.periods]
        random.shuffle(stock_period_pairs)
        
        for symbol, period in stock_period_pairs:
            last_update = self.last_update.get((symbol, period))
            
            # Check if this stock/period was updated today
            if last_update is None or last_update.date() < today:
                try:
                    # Add delay between requests to avoid rate limiting
                    time.sleep(2)  # 2 second delay between requests
                    
                    with self.lock:
                        self._fetch_and_store(symbol, period)
                        updated_count += 1
                    
                    # If we've updated 10 stocks, save progress and take a break
                    if updated_count % 10 == 0:
                        self._save_update_times()
                        print(f"Updated {updated_count} stocks, pausing to avoid rate limits")
                        time.sleep(30)  # 30 second pause after every 10 updates
                        
                except Exception as e:
                    if "Too Many Requests" in str(e):
                        # Back off significantly on rate limit
                        print(f"Rate limited, pausing updates for 5 minutes")
                        time.sleep(300)  # 5 minute pause
                    else:
                        print(f"Error updating {symbol} for period {period}: {e}")
        
        if updated_count > 0:
            print(f"Daily update complete: updated {updated_count} stocks")
            self._save_update_times()
    
    def _get_cache_file_path(self, symbol, period):
        """Get the path to the cache file for a symbol and period"""
        return os.path.join(self.cache_dir, f"{symbol}_{period}.json")
    
    def _fetch_and_store(self, symbol, period):
        """Fetch data from yfinance and store in both DB and file cache"""
        # Check if we have a file cache first
        cache_file = self._get_cache_file_path(symbol, period)
        
        try:
            # Determine appropriate interval based on period
            interval = "5m" if period == "1d" else "1d"
            
            # Fetch data from yfinance
            stock = yf.Ticker(symbol)
            history = stock.history(period=period, interval=interval)
            
            # Transform data to our format
            data = [{
                'time': str(index),
                'value': float(row['Close'])
            } for index, row in history.iterrows()]
            
            # Get latest price for current data
            info = stock.info
            current_price = info.get('currentPrice', info.get('regularMarketPrice', None))
            previous_close = info.get('previousClose', None)
            
            # Calculate change if we have both values
            change_value = None
            change_percent = None
            if current_price and previous_close:
                change_value = current_price - previous_close
                change_percent = (change_value / previous_close) * 100 if previous_close else 0
            
            # Prepare document with additional data
            document = {
                'symbol': symbol,
                'period': period,
                'data': data,
                'currentPrice': current_price,
                'changeValue': change_value,
                'changePercent': change_percent,
                'last_updated': datetime.utcnow()
            }
            
            # Update or insert the document
            self.db.stock_cache.update_one(
                {'symbol': symbol, 'period': period},
                {'$set': document},
                upsert=True
            )
            
            # Also save to file cache
            try:
                file_doc = document.copy()
                # Convert datetime to string for JSON serialization
                file_doc['last_updated'] = file_doc['last_updated'].isoformat()
                with open(cache_file, 'w') as f:
                    json.dump(file_doc, f)
            except Exception as e:
                print(f"File cache save error: {e}")
            
            # Update the last update time
            self.last_update[(symbol, period)] = datetime.utcnow()
            
            return True
            
        except Exception as e:
            # If rate limited, propagate the error
            if "Too Many Requests" in str(e):
                raise e
            print(f"Error fetching {symbol} - {period}: {e}")
            return False
    
    def get_stock_data(self, symbol, period, max_age_seconds=None):
        """
        Get stock data from cache, only update if not updated today
        
        Args:
            symbol: Stock symbol
            period: Time period
            max_age_seconds: Maximum age of cached data before refresh (optional)
            
        Returns:
            Dictionary with stock data
        """
        # Make sure symbol and period are valid
        if symbol not in self.stock_list:
            raise ValueError(f"Invalid symbol: {symbol}")
        
        if period not in self.periods:
            raise ValueError(f"Invalid period: {period}")
        
        # First check if we have DB cache
        cached_data = self.db.stock_cache.find_one({'symbol': symbol, 'period': period})
        
        # If not in DB, check file cache
        if not cached_data:
            cache_file = self._get_cache_file_path(symbol, period)
            if os.path.exists(cache_file):
                try:
                    with open(cache_file, 'r') as f:
                        cached_data = json.load(f)
                        # Convert ISO date string back to datetime
                        cached_data['last_updated'] = datetime.fromisoformat(cached_data['last_updated'])
                        print(f"Loaded {symbol}-{period} from file cache")
                except Exception as e:
                    print(f"Error loading from file cache: {e}")
        
        # Check if we need to update (hasn't been updated today)
        today = datetime.now().date()
        needs_update = False
        
        if cached_data:
            # Get the last update date
            last_updated = cached_data.get('last_updated')
            if isinstance(last_updated, str):
                last_updated = datetime.fromisoformat(last_updated)
            
            # Only update if not updated today
            if last_updated.date() < today:
                needs_update = True
        else:
            # No cached data at all
            needs_update = True
        
        # Try to update if needed - but don't block if rate limited
        if needs_update:
            try:
                with self.lock:
                    self._fetch_and_store(symbol, period)
                # Get updated data
                cached_data = self.db.stock_cache.find_one({'symbol': symbol, 'period': period})
            except Exception as e:
                # If rate limited, just use existing cache
                if "Too Many Requests" in str(e):
                    print(f"Rate limited, using existing cache for {symbol}-{period}")
                else:
                    print(f"Failed to update {symbol}-{period}: {e}")
        
        # Return the data
        if cached_data:
            # Format for API response
            return {
                'symbol': symbol,
                'period': period,
                'data': cached_data['data'],
                'currentPrice': cached_data.get('currentPrice'),
                'changeValue': cached_data.get('changeValue'),
                'changePercent': cached_data.get('changePercent')
            }
        else:
            # If we STILL don't have data, raise an error
            raise Exception(f"Could not fetch data for {symbol} - {period}")