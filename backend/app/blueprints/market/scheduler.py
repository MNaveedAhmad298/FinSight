import threading, time
from flask import current_app
from ...services import market


def _daily_refresh_loop(app, interval_hours=24):
    with app.app_context():
        while True:
            try:
                # Refresh at market close policy; we run daily regardless
                market.refresh_historical_daily_all()
            except Exception:
                pass
            time.sleep(int(interval_hours * 3600))


def start_market_scheduler(app):
    t = threading.Thread(target=_daily_refresh_loop, args=(app,), daemon=True)
    t.start()