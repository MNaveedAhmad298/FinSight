# app/utils/responses.py
from flask import jsonify

def ok(data=None, **extra):
    payload = {} if data is None else data
    if extra:
        payload |= extra
    return jsonify(payload)

def err(message, status=400, **extra):
    payload = {"error": message} | extra
    return jsonify(payload), status
