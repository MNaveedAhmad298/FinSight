"""Market data services: historical caching, market-hours logic, and snapshots.

Implements:
- Historical daily caching for 6 months in MongoDB (serves 1Mo/3Mo/6Mo, etc.)
- Intraday (5m) for 1D/5D via yfinance with short TTL cache
- Market hours detection (US/Eastern 09:30–16:00, Mon–Fri)
- Snapshot structure populated either from live stream (when open) or last close
"""

import json
import time
import threading
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Tuple

import yfinance as yf
from cachetools import TTLCache
import pytz

from .. import extensions

# Symbols to support (trim or expand as needed)
SUBSCRIBE_SYMBOLS: List[str] = [
    "AAPL", "MSFT", "NVDA", "AMZN", "AVGO", "META", "NFLX", "COST", "TSLA",
    "GOOGL", "GOOG", "TMUS", "PLTR", "CSCO", "LIN", "ISRG", "PEP", "INTU",
    "BKNG", "ADBE", "AMD", "AMGN", "QCOM", "TXN", "HON", "GILD", "VRTX",
    "CMCSA", "PANW", "ADP", "AMAT", "MELI", "CRWD", "ADI",
]

# Optional basic metadata
STOCK_METADATA: Dict[str, Dict[str, Any]] = {s: {"name": s} for s in SUBSCRIBE_SYMBOLS}

# In-memory latest snapshot updated by live streamer
latest_stock_data: Dict[str, Dict[str, Any]] = {}

# Intraday cache to avoid hammering yfinance for 1d/5d
_intraday_cache: TTLCache = TTLCache(maxsize=256, ttl=10 * 60)  # 10 minutes
# Cache for metadata like market cap, 52W range, avg volume
_meta_cache: TTLCache = TTLCache(maxsize=512, ttl=30 * 60)  # 30 minutes

# Supported periods/timeframes and mapping to lookback days
PERIODS = {"1d", "5d", "1mo", "3mo", "6mo"}
PERIOD_TO_DAYS: Dict[str, int] = {
    "1d": 1,
    "5d": 5,
    "1mo": 30,
    "3mo": 90,
    "6mo": 180,
}

US_EASTERN = pytz.timezone("US/Eastern")


def is_market_open_now(now_utc: datetime | None = None) -> bool:
    now_utc = now_utc or datetime.utcnow().replace(tzinfo=pytz.utc)
    now_et = now_utc.astimezone(US_EASTERN)
    # Weekday 0=Mon .. 6=Sun
    if now_et.weekday() > 4:
        return False
    open_time = now_et.replace(hour=9, minute=30, second=0, microsecond=0)
    close_time = now_et.replace(hour=16, minute=0, second=0, microsecond=0)
    return open_time <= now_et <= close_time


def _mongo():
    return getattr(extensions, "db", None)


def _historical_col():
    db = _mongo()
    return db["historical_prices"] if db is not None else None


def _upsert_daily_bars(symbol: str, bars: List[Dict[str, Any]]) -> None:
    col = _historical_col()
    if col is None:
        return
    col.update_one(
        {"symbol": symbol, "interval": "1d"},
        {
            "$set": {
                "symbol": symbol,
                "interval": "1d",
                "updated_at": datetime.utcnow(),
                "bars": bars,
            }
        },
        upsert=True,
    )


def _read_daily_bars(symbol: str) -> List[Dict[str, Any]] | None:
    col = _historical_col()
    if col is None:
        return None
    doc = col.find_one({"symbol": symbol, "interval": "1d"}, {"_id": 0, "bars": 1})
    if not doc:
        return None
    return doc.get("bars")


def _compute_avg_volume_30d(bars: List[Dict[str, Any]]) -> float:
    if not bars:
        return 0.0
    # Take up to last 30 bars
    recent = bars[-30:]
    volumes = [float(b.get("volume", 0.0) or 0.0) for b in recent]
    return sum(volumes) / len(volumes) if volumes else 0.0


def _get_symbol_meta(symbol: str) -> Dict[str, Any]:
    key = (symbol, "meta")
    if key in _meta_cache:
        return _meta_cache[key]
    meta: Dict[str, Any] = {}
    try:
        tkr = yf.Ticker(symbol)
        fi = getattr(tkr, "fast_info", None)
        if fi is not None:
            # These attributes may not always be present
            meta["market_cap"] = float(getattr(fi, "market_cap", 0.0) or 0.0)
            meta["year_high"] = float(getattr(fi, "year_high", 0.0) or 0.0)
            meta["year_low"] = float(getattr(fi, "year_low", 0.0) or 0.0)
        # Compute 30d average volume from cached daily bars if available
        bars = _read_daily_bars(symbol) or []
        meta["avg_volume_30d"] = _compute_avg_volume_30d(bars)
    except Exception:
        logging.exception(f"Failed to load metadata for {symbol}")
    _meta_cache[key] = meta
    return meta


def fetch_quote(symbol: str) -> Dict[str, Any]:
    """Fetch a lightweight quote via yfinance fast_info.

    Used as a fallback or periodic polling when Finnhub is unavailable.
    """
    tkr = yf.Ticker(symbol)
    info = getattr(tkr, "fast_info", None)
    last_price = 0.0
    currency = "USD"
    if info is not None:
        try:
            last_price = float(getattr(info, "last_price", 0.0) or 0.0)
        except Exception:
            last_price = 0.0
        try:
            currency = str(getattr(info, "currency", "USD") or "USD")
        except Exception:
            currency = "USD"
    return {"symbol": symbol, "price": last_price, "currency": currency}


def fetch_many(symbols: List[str]) -> List[Dict[str, Any]]:
    return [fetch_quote(s) for s in symbols]


def preload_historical_cache(symbols: List[str] | None = None) -> None:
    symbols = symbols or SUBSCRIBE_SYMBOLS
    for sym in symbols:
        try:
            # Fetch 6 months of daily bars
            tkr = yf.Ticker(sym)
            df = tkr.history(period="6mo", interval="1d")
            bars = [
                {
                    "time": int(idx.timestamp()),
                    "open": float(row["Open"]),
                    "high": float(row["High"]),
                    "low": float(row["Low"]),
                    "close": float(row["Close"]),
                    "volume": float(row.get("Volume", 0.0) or 0.0),
                }
                for idx, row in df.iterrows()
            ]
            _upsert_daily_bars(sym, bars)
        except Exception:
            logging.exception(f"Failed to preload daily bars for {sym}")
            continue


def refresh_historical_daily_all() -> None:
    logging.info("Refreshing historical daily bars for all symbols...")
    preload_historical_cache(SUBSCRIBE_SYMBOLS)
    logging.info("Historical refresh complete.")


def _slice_daily_bars(bars: List[Dict[str, Any]], period: str) -> List[Dict[str, Any]]:
    if not bars:
        return []
    lookback_days = PERIOD_TO_DAYS.get(period, 30)
    cutoff_ts = int((datetime.utcnow() - timedelta(days=lookback_days)).timestamp())
    return [b for b in bars if int(b.get("time", 0)) >= cutoff_ts]


def _fetch_intraday(symbol: str, period: str) -> Dict[str, Any]:
    # yfinance supports 1d/5d at 1m/2m/5m intervals; use 5m to keep arrays reasonable
    yf_period = "1d" if period == "1d" else "5d"
    interval = "5m"
    tkr = yf.Ticker(symbol)
    df = tkr.history(period=yf_period, interval=interval)
    series = [
        {
            "time": int(idx.timestamp()),
            "open": float(row["Open"]),
            "high": float(row["High"]),
            "low": float(row["Low"]),
            "close": float(row["Close"]),
            "volume": float(row.get("Volume", 0.0) or 0.0),
        }
        for idx, row in df.iterrows()
    ]
    return {"symbol": symbol, "period": period, "interval": interval, "data": series}


def history(symbol: str, period: str = "1d") -> Dict[str, Any]:
    symbol = symbol.upper()
    if period not in PERIODS:
        period = "1d"

    # Intraday: use short-lived cache
    if period in {"1d", "5d"}:
        cache_key = (symbol, period)
        if cache_key in _intraday_cache:
            return _intraday_cache[cache_key]
        payload = _fetch_intraday(symbol, period)
        _intraday_cache[cache_key] = payload
        return payload

    # Daily bars served from DB (preloaded and refreshed daily)
    bars = _read_daily_bars(symbol)
    if not bars:
        # Fallback: fetch now and persist
        try:
            tkr = yf.Ticker(symbol)
            df = tkr.history(period="6mo", interval="1d")
            bars = [
                {
                    "time": int(idx.timestamp()),
                    "open": float(row["Open"]),
                    "high": float(row["High"]),
                    "low": float(row["Low"]),
                    "close": float(row["Close"]),
                    "volume": float(row.get("Volume", 0.0) or 0.0),
                }
                for idx, row in df.iterrows()
            ]
            _upsert_daily_bars(symbol, bars)
        except Exception:
            logging.exception(f"Failed to fetch fallback 6mo daily bars for {symbol}")
            bars = []

    sliced = _slice_daily_bars(bars, period)
    return {"symbol": symbol, "period": period, "interval": "1d", "data": sliced}


def _last_close_from_daily(symbol: str) -> float:
    bars = _read_daily_bars(symbol) or []
    if not bars:
        return 0.0
    return float(bars[-1].get("close", 0.0))


def _prev_close_from_daily(symbol: str) -> float:
    bars = _read_daily_bars(symbol) or []
    if len(bars) < 2:
        return 0.0
    return float(bars[-2].get("close", 0.0) or 0.0)


def snapshot(symbols: List[str]) -> Dict[str, Dict[str, Any]]:
    # Ensure minimal fields in every entry
    market_open = is_market_open_now()
    data: Dict[str, Dict[str, Any]] = {s: dict(latest_stock_data.get(s, {})) for s in symbols}
    for sym in symbols:
        entry = data.get(sym) or {}
        entry.setdefault("symbol", sym)
        entry.setdefault("name", STOCK_METADATA.get(sym, {}).get("name", sym))
        last_close = _last_close_from_daily(sym)
        prev_close = _prev_close_from_daily(sym)
        # Price fallback: use live price when open, else last close; if live missing, fall back to last close
        price_live = float(entry.get("price", 0.0) or 0.0)
        price = price_live if (market_open and price_live > 0) else last_close
        entry["price"] = price
        # Day change vs previous close
        if prev_close > 0:
            change_abs = price - prev_close
            change_pct = (change_abs / prev_close) * 100.0
        else:
            change_abs = 0.0
            change_pct = 0.0
        entry["change"] = change_pct
        entry["change_abs"] = change_abs
        # Volume: use last daily bar, and compute change vs previous day's volume
        vol = 0.0
        prev_vol = 0.0
        try:
            bars = _read_daily_bars(sym) or []
            if bars:
                vol = float(bars[-1].get("volume", 0.0) or 0.0)
                if len(bars) >= 2:
                    prev_vol = float(bars[-2].get("volume", 0.0) or 0.0)
        except Exception:
            vol = 0.0
            prev_vol = 0.0
        entry["volume"] = vol
        entry["prevVolume"] = prev_vol
        # Relative volume vs 30-day average (using last complete daily bar)
        meta = _get_symbol_meta(sym)
        avg30 = float(meta.get("avg_volume_30d", 0.0) or 0.0)
        entry["rvol"] = (vol / avg30) if avg30 > 0 else 0.0
        entry["market_cap"] = meta.get("market_cap", 0.0)
        entry["year_high"] = meta.get("year_high", 0.0)
        entry["year_low"] = meta.get("year_low", 0.0)
        entry.setdefault("time", entry.get("time", int(time.time())))
        entry["market_open"] = market_open
        if not market_open:
            entry["status"] = "Market Closed"
        data[sym] = entry
    return data


def get_market_status() -> Dict[str, Any]:
    open_now = is_market_open_now()
    return {"market_open": open_now, "status": "Open" if open_now else "Closed"}


