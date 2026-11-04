import os
from collections import Counter

import joblib
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.svm import LinearSVC

from nlp_common import OFFTOPIC_LABEL, normalize

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "dataset.xlsx")
MODEL_PATH = os.path.join(BASE_DIR, "nlp_model.joblib")

# Dapat pareho ito sa NLP_THRESHOLD ng app.py
THRESHOLD = float(os.getenv("NLP_THRESHOLD", "0.25"))

PREFIXES = ["", "hi ", "hello po ", "pwede po magtanong ", "excuse me ", "tanong ko lang po "]

STOP = set(
    "po ang ng sa na ay mga ba ko mo nyo niyo namin kayo ako the a an is are of to in at do you your we i can me my it".split()
)

# Mga tanong na walang kinalaman sa church (para matutong tumanggi ang bot)
OFFTOPIC = [
    "what is the weather today", "who is the president", "tell me a story",
    "what is the capital of japan", "can you write code for me", "help me with my assignment",
    "what is the best phone", "recommend a movie", "who won the game last night", "what is 2 plus 2",
    "translate this sentence", "how do i lose weight", "what is the price of rice", "chicken adobo recipe",
    "my computer is broken", "presyo ng bigas ngayon", "exchange rate ng dollar",
    "tips sa pag aaral", "i want to buy a laptop", "where can i buy shoes", "sing me a song",
    "what is love", "who is the richest man", "how are the stocks today",
    "what is the exchange rate of dollar", "write a program for me", "what is your favorite food",
    "tell me something funny", "who is the best basketball player",
    "how do i study for exams", "what should i eat for lunch", "can you play music",
    "ano ang lagay ng panahon", "magluto tayo ng adobo", "sino ang presidente", "magkwento ka naman",
    "ano ang pinakamagandang cellphone", "tulungan mo ako sa homework", "saan pwede bumili ng sapatos",
    "kumanta ka", "anong magandang movie", "sino nanalo sa laro", "ano ang sagot sa math",
    "gawan mo ako ng code", "ano ang paborito mong pagkain", "anong ulam ang masarap",
    "pwede mo ba akong patawanin",
    "sino si jose rizal", "who is jose rizal", "sino si elon musk", "who is elon musk",
    "sino ang pinakamayaman", "sino ang artista", "who is the best singer",
    "sino ang nag-imbento ng bumbilya", "who invented the telephone",
    "sino si andres bonifacio", "who is taylor swift", "sino ang pinakamagaling na singer",
]

OFF_WEIGHT = 0.3  # mas mababa = mas bihira mag-"off-topic" ang bot

# Dagdag na paraphrase ng mahahalagang tanong. Ang sagot ay kinukuha sa dataset.xlsx.
PARAPHRASES = {
    "How can I give or donate?": [
        "how to give offering", "how can i give my tithes", "where can i send my offering",
        "how do i donate to the church", "can i give online", "ways to give tithes and offerings",
        "how can i support the church financially", "how do i give my tithes",
    ],
    "Paano po mag-give o mag-donate?": [
        "paano mag offering", "paano magbigay ng tithes", "saan po pwede magbigay ng offering",
        "paano po magdonate sa church", "pwede po ba mag online giving", "magkano po ang tithes",
        "paano po mag tithes", "magkano ang tithes", "paano po magbigay ng offering",
    ],
    "Can I give through GCash?": [
        "can i donate via gcash", "can i send offering through gcash", "do you have gcash",
        "can i give via paymaya", "is gcash accepted", "can i give through paymaya",
    ],
    "Pwede po ba mag-GCash para sa offering?": [
        "pwede po ba mag gcash", "may gcash po ba kayo", "pwede po ba sa paymaya",
        "pwede po ba online ang offering", "pwede po ba mag paymaya",
    ],
    "Paano po magpa-baptize?": [
        "paano magpabinyag", "paano po magpabinyag", "paano po magpa baptize", "gusto ko magpabinyag",
        "magpapabinyag po ako", "pwede po ba magpabinyag", "may baptism po ba",
    ],
    "How can I get baptized?": [
        "i want to get baptized", "baptism schedule", "how do i get baptized", "can i be baptized",
    ],
    "Paano po kayo makokontak?": [
        "pano po kayo kontakin", "paano po kayo i contact", "paano po makipag ugnayan sa church",
        "paano ko kayo makakausap",
    ],
    "Where is the church located?": [
        "where can i find the church", "how to find your church", "church location", "where is your church",
        "what is the location of the church", "where are you located", "where is the church address",
    ],
    "Saan po ang simbahan ninyo?": [
        "saan po ang church", "san po ang simbahan", "saan po kayo matatagpuan", "address ng church",
        "san ang location ng church", "saan ang location ng church", "san po ang location ng church",
        "location ng church", "saan ang location", "nasaan ang church", "nasaan po ang simbahan",
        "saan kayo nagsisimba", "san kayo located", "saan po ang lokasyon ng simbahan",
    ],
    "Anong oras ang simba?": [
        "anong oras ang service tuwing linggo", "anong oras po ang worship", "ano pong oras ang simba sa linggo",
    ],
    "What time is the Sunday service?": [
        "what time is church on sunday", "when does church start on sunday", "sunday worship time",
    ],
    "Who is your pastor?": [
        "who leads the church", "who is the head pastor", "name of your pastor",
    ],
    "Sino po ang pastor ninyo?": [
        "sino pastor nyo", "sino po ang pinuno ng church", "sino ang pastor",
    ],
}

# Pang-test lang. Mga bagong pangungusap ito na WALA sa PARAPHRASES o sa training.
# Format: (tanong, tanong sa dataset na dapat ang sagot) -- None = dapat off-topic o "wala akong info"
TESTS = [
    ("ano oras ang worship service sa sunday", "Anong oras ang simba?"),
    ("what time does the sunday worship begin", "What time is the Sunday service?"),
    ("sino ang head pastor ng church nyo", "Sino po ang pastor ninyo?"),
    ("pwede ba mag-offering gamit ang gcash", "Pwede po ba mag-GCash para sa offering?"),
    ("gusto kong magpa-baptize", "Paano po magpa-baptize?"),
    ("how can i contact the church", "Paano po kayo makokontak?"),
    ("how do i get to your church", "Where is the church located?"),
    ("how do i bake a cake", None),
    ("sino si manny pacquiao", None),
    ("what is the tallest mountain", None),
]


def load_dataset():
    if not os.path.exists(DATASET_PATH):
        raise SystemExit(f"Hindi makita ang dataset: {DATASET_PATH}")

    df = pd.read_excel(DATASET_PATH)
    missing = {"question", "answer"} - set(df.columns)
    if missing:
        raise SystemExit(f"Kulang ang column sa dataset.xlsx: {', '.join(sorted(missing))}")

    df = df.dropna(subset=["question", "answer"]).copy()
    df["question"] = df["question"].astype(str).str.strip()
    df["answer"] = df["answer"].astype(str).str.strip()
    df = df[(df["question"] != "") & (df["answer"] != "")]
    if df.empty:
        raise SystemExit("Walang laman ang dataset.xlsx (question/answer).")

    # Babala kung may parehong tanong pero magkaibang sagot
    conflicts = df.groupby("question")["answer"].nunique()
    for q in conflicts[conflicts > 1].index:
        print("WARNING: magkaibang sagot para sa iisang tanong:", q)

    return df.reset_index(drop=True)


def build_examples(df):
    X, y, W = [], [], []

    for _, r in df.iterrows():
        ans = r["answer"]
        question = r["question"]

        for p in PREFIXES:
            X.append(normalize(p + question))
            y.append(ans)
            W.append(1.0)

        keywords = " ".join(w for w in normalize(question).split() if w not in STOP)
        if keywords:
            for _ in range(2):
                X.append(keywords)
                y.append(ans)
                W.append(1.0)

    ans_by_q = dict(zip(df["question"], df["answer"]))
    for seed, variants in PARAPHRASES.items():
        if seed not in ans_by_q:
            print("WARNING: wala sa dataset ang tanong:", seed)
            continue
        for v in variants:
            for p in ("", "hi ", "hello po "):
                X.append(normalize(p + v))
                y.append(ans_by_q[seed])
                W.append(1.0)

    for q in OFFTOPIC:
        for p in ("", "hi ", "hello po "):
            X.append(normalize(p + q))
            y.append(OFFTOPIC_LABEL)
            W.append(OFF_WEIGHT)

    return X, y, W


def main():
    df = load_dataset()
    X, y, W = build_examples(df)
    print(len(df), "rows +", len(OFFTOPIC), "off-topic ->", len(X), "examples,", len(set(y)), "intents")

    # Hindi pwedeng mas marami ang cv folds kaysa sa pinakakaunting example ng isang sagot
    cv = max(2, min(3, min(Counter(y).values())))

    # LinearSVC walang predict_proba, kaya nilagyan ng calibration para magamit ang THRESHOLD
    model = Pipeline([
        ("features", FeatureUnion([
            ("word", TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True)),
            ("char", TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), sublinear_tf=True)),
        ])),
        ("clf", CalibratedClassifierCV(LinearSVC(C=1.0), method="sigmoid", cv=cv)),
    ])
    model.fit(X, y, clf__sample_weight=W)

    joblib.dump(model, MODEL_PATH)
    print("Saved ->", MODEL_PATH)

    # Test sa mga bagong tanong (wala sa training)
    ans_by_q = dict(zip(df["question"], df["answer"]))
    print(f"\nTest sa mga bagong tanong (threshold = {THRESHOLD})")

    passed = total = 0
    for text, seed in TESTS:
        if seed is not None and seed not in ans_by_q:
            print(f"SKIP (wala sa dataset ang '{seed}'): {text}")
            continue

        expected = OFFTOPIC_LABEL if seed is None else ans_by_q[seed]
        proba = model.predict_proba([normalize(text)])[0]
        i = proba.argmax()
        got = None if proba[i] < THRESHOLD else model.classes_[i]  # None = "wala akong info"

        ok = got == expected or (seed is None and got is None)
        total += 1
        passed += ok

        print(f"[{'OK' if ok else 'X '}] [{proba[i]:.2f}] {text}")
        if not ok:
            shown = "(wala akong info)" if got is None else ("(off-topic)" if got == OFFTOPIC_LABEL else got[:70])
            print(f"       nakuha: {shown}")

    if total:
        print(f"\nTest accuracy: {passed}/{total} ({passed / total:.0%})")


if __name__ == "__main__":
    main()