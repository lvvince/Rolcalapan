import os

import joblib
from fastapi import FastAPI
from pydantic import BaseModel

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = FastAPI(title="Prayer Request Classifier")
models = joblib.load(os.path.join(BASE_DIR, "model.joblib"))

MIN_CONFIDENCE = 0.40

# Safety rule: these always get flagged as high urgency for pastoral follow-up.
CRISIS_KEYWORDS = [
    "suicide", "magpakamatay", "kill myself", "end my life",
    "patayin ang sarili", "ayoko nang mabuhay", "self-harm", "saktan ang sarili",
]


class PrayerInput(BaseModel):
    text: str


def predict(target: str, text: str):
    pipe = models[target]
    probs = pipe.predict_proba([text])[0]
    idx = probs.argmax()
    return pipe.classes_[idx], float(probs[idx])


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/classify")
def classify(body: PrayerInput):
    text = body.text.lower().strip()

    category, cat_conf = predict("category", text)
    urgency, urg_conf = predict("urgency", text)

    crisis = any(k in text for k in CRISIS_KEYWORDS)
    if crisis:
        urgency, urg_conf = "high", 1.0

    needs_review = crisis or cat_conf < MIN_CONFIDENCE

    return {
        "category": category,
        "category_confidence": round(cat_conf, 3),
        "urgency": urgency,
        "urgency_confidence": round(urg_conf, 3),
        "needs_review": needs_review,
    }