# app/services/chat.py
import os
from typing import List, Dict

# Optional Gemini support
try:
    import google.generativeai as genai
except Exception:
    genai = None

def init_gemini(api_key: str | None):
    if api_key and genai:
        genai.configure(api_key=api_key)

def generate_reply(message: str, portfolio_summary: str = "", history: List[Dict] | None = None) -> str:
    history = history or []
    prompt = (
        "You are a friendly finance assistant.\n"
        f"Portfolio: {portfolio_summary}\n"
        f"History (last few): {history[-4:]}\n"
        f"User: {message}\nAssistant:"
    )
    if genai and os.getenv("GEMINI_API_KEY"):
        try:
            resp = genai.generate_content(prompt)
            return getattr(resp, "text", "").strip() or "Sorry, I couldn't generate a response."
        except Exception as e:
            return f"(Gemini error) {e}"
    # Fallback echo if Gemini not configured
    return f"(demo) You said: {message}"
