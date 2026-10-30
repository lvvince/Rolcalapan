import os

import joblib
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

from nlp_common import OFFTOPIC_LABEL, no_info_answer, normalize, offtopic_answer

load_dotenv()

API_KEY = os.getenv("PY_API_KEY", "")
# Kung mas mababa dito ang confidence, "wala akong info" ang isasagot
THRESHOLD = float(os.getenv("NLP_THRESHOLD", "0.25"))

model = joblib.load(os.path.join(os.path.dirname(os.path.abspath(__file__)), "nlp_model.joblib"))

app = Flask(__name__)
CORS(app)


def reply(question):
    q = normalize(question)
    if not q:
        return no_info_answer(question), 0.0
    proba = model.predict_proba([q])[0]
    i = int(proba.argmax())
    conf = float(proba[i])
    label = model.classes_[i]
    if conf < THRESHOLD:
        return no_info_answer(question), conf
    if label == OFFTOPIC_LABEL:
        return offtopic_answer(question), conf
    return label, conf


@app.get("/health")
def health():
    return jsonify({"ok": True, "intents": len(model.classes_), "threshold": THRESHOLD})


@app.post("/chat")
def chat():
    if API_KEY and request.headers.get("X-API-Key", "") != API_KEY:
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    data = request.get_json(silent=True) or {}
    question = ""
    for m in reversed(data.get("messages", [])):
        if m.get("role") == "user" and str(m.get("content", "")).strip():
            question = str(m["content"]).strip()[:500]
            break

    if not question:
        return jsonify({"success": False, "message": "No question"}), 400

    answer, conf = reply(question)
    return jsonify({"success": True, "answer": answer, "confidence": round(conf, 2)})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)