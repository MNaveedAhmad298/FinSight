"""
Pure domain logic – NO Flask, NO JWT, NO request.
Keep here anything that does **not** need the request context.
"""
import yfinance as yf
from datetime import datetime

class PortfolioSvc:
    """ Stateless helper – instantiated once and shared. """
    def __init__(self):
        self._cache = {}          # optional in-memory price cache
        self._ttl  = 300          # 5 min

    # ---------- public ------------------------------------------------
    def total_value(self, cash: float, holdings: dict) -> float:
        """holdings: {symbol: qty}"""
        return cash + sum(q * self.current_price(s) for s, q in holdings.items())

    def daily_pnl(self, holdings: dict) -> float:
        pnl = 0.0
        for sym, qty in holdings.items():
            prev = self.prev_close(sym)
            now  = self.current_price(sym)
            pnl += (now - prev) * qty
        return pnl

    # ---------- helpers ----------------------------------------------
    def current_price(self, symbol: str) -> float:
        now = datetime.now()
        key = (symbol, "price")
        if key in self._cache:
            ts, px = self._cache[key]
            if (now - ts).total_seconds() < self._ttl:
                return px
        px = float(yf.Ticker(symbol).history(period="1d")["Close"].iloc[-1])
        self._cache[key] = (now, px)
        return px

    def prev_close(self, symbol: str) -> float:
        hist = yf.Ticker(symbol).history(period="2d")
        return float(hist["Close"].iloc[-2]) if len(hist) >= 2 else self.current_price(symbol)