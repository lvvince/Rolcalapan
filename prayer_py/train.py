import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.pipeline import FeatureUnion, Pipeline

df = pd.read_excel("prayer_requests.xlsx").dropna(subset=["text", "category", "urgency"])
df["text"] = df["text"].str.lower().str.strip()


def build_pipeline():
    features = FeatureUnion([
        ("word", TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True)),
        ("char", TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), sublinear_tf=True)),
    ])
    clf = LogisticRegression(max_iter=2000, class_weight="balanced", C=5.0)
    return Pipeline([("features", features), ("clf", clf)])


models = {}
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

for target in ["category", "urgency"]:
    print(f"\n=== {target.upper()} (5-fold cross-validation) ===")
    pipe = build_pipeline()
    preds = cross_val_predict(pipe, df["text"], df[target], cv=cv)
    print(classification_report(df[target], preds, zero_division=0))
    pipe.fit(df["text"], df[target])
    models[target] = pipe

joblib.dump(models, "model.joblib")
print("\nSaved model.joblib")