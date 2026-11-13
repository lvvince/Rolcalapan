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

# Dagdag na off-topic (general knowledge, food, sports, tech, celebrities, math, atbp.)
OFFTOPIC += [
    # geography / science / general knowledge
    "what is the tallest mountain", "what is the tallest mountain in the world", "what is the longest river",
    "what is the biggest ocean", "how many continents are there", "what is the largest country",
    "what is the capital of france", "what is the capital of the philippines", "how far is the moon",
    "how many planets are there", "what is the speed of light", "what is the boiling point of water",
    "how does photosynthesis work", "what is gravity", "how many days in a year", "what is the smallest animal",
    "what is the fastest animal", "what is the deepest ocean", "how old is the earth", "who discovered america",
    "ano ang pinakamataas na bundok", "ano ang pinakamahabang ilog", "ilang planeta ang meron",
    "ano ang kabisera ng japan", "ano ang pinakamalaking bansa", "gaano kalayo ang buwan",
    "ano ang pinakamabilis na hayop", "ano ang pinakamalalim na dagat", "ilang araw sa isang taon",
    "ano ang gravity", "paano gumagana ang photosynthesis",
    # celebrities / people
    "who is manny pacquiao", "sino si manny pacquiao", "who is lebron james", "sino si lebron james",
    "who is cristiano ronaldo", "sino si cristiano ronaldo", "who is bill gates", "sino si bill gates",
    "who is justin bieber", "sino si justin bieber", "sino si kathryn bernardo", "sino si daniel padilla",
    "who is albert einstein", "sino si albert einstein", "who is the mayor of manila", "sino ang mayor ng manila",
    "sino ang pinakamagandang artista", "who is the most popular actor", "sino si nadine lustre",
    "who is the owner of facebook", "sino ang may-ari ng facebook",
    # food / recipes
    "how do i bake a cake", "how to bake a cake", "paano magluto ng sinigang", "how to cook fried rice",
    "how to cook pasta", "recipe for pancakes", "paano magluto ng adobo", "best pizza near me",
    "ano ang masarap na kainin ngayon", "where is the best restaurant", "magkano ang burger sa jollibee",
    "what is a healthy breakfast", "how to make coffee", "paano gumawa ng cake", "recipe ng leche flan",
    # sports / games
    "who won the nba finals", "sino nanalo sa nba", "what is the score of the game", "ano ang score ng laro",
    "how to play basketball", "paano maglaro ng chess", "best mobile games", "paano maglaro ng mobile legends",
    "who is the best football player", "when is the next boxing match", "ano ang rank ko sa ml",
    "how to level up in roblox", "tips sa valorant",
    # technology / coding / school
    "how do i fix my phone", "paano ayusin ang wifi", "my laptop is slow", "how to install windows",
    "what is python", "how to code in java", "explain machine learning", "paano gumawa ng website",
    "how to reset my facebook password", "how to download tiktok videos", "best laptop for students",
    "what is artificial intelligence", "write a poem for me", "solve this math problem", "what is 10 times 12",
    "what is the square root of 144", "help me write an essay", "summarize this article", "gawan mo ako ng essay",
    "ano ang sagot sa assignment ko", "paano mag solve ng algebra", "what is the formula of area of a circle",
    "translate hello to japanese", "i-translate mo ito sa english", "how do i learn english fast",
    # money / shopping / travel
    "how much is a plane ticket to cebu", "magkano ang pamasahe papuntang manila", "where to buy iphone",
    "best budget phone", "presyo ng gasolina ngayon", "magkano ang dollar ngayon", "how do i invest in stocks",
    "how to apply for a loan", "where can i find a job", "how to apply for a passport",
    "best place to travel in the philippines", "magandang pasyalan sa palawan", "hotel near the airport",
    "how is traffic in edsa", "what is the news today", "ano ang balita ngayon", "will it rain tomorrow",
    "may bagyo ba ngayon", "what is the date today", "anong oras na", "what time is it in japan",
    # random / chit-chat
    "tell me a joke", "magbiro ka naman", "do you have a girlfriend", "may boyfriend ka ba",
    "how old are you", "ilang taon ka na", "what is your name", "who created you", "are you a robot",
    "what is the meaning of life", "ano ang ibig sabihin ng love", "i am bored", "bored ako",
    "can you be my friend", "what is your favorite color", "ano ang paborito mong kulay",
    "recommend a good anime", "best netflix series", "ano ang magandang panoorin", "sing a song for me",
    "recommend a good book", "best kdrama", "how to get a girlfriend", "paano magka-crush sa akin",
    "how to lose belly fat", "paano pumayat", "best workout routine", "how to sleep early",
    "how to get rid of pimples", "ano ang gamot sa sipon", "i have a headache what medicine",
]

OFF_WEIGHT = 0.5  # mas mababa = mas bihira mag-"off-topic" ang bot

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
        "pwede ba mag-offering gamit ang gcash", "pwede ba mag offering sa gcash",
    ],
    "Paano po magpa-baptize?": [
        "paano magpabinyag", "paano po magpabinyag", "paano po magpa baptize", "gusto ko magpabinyag",
        "magpapabinyag po ako", "pwede po ba magpabinyag", "may baptism po ba",
        "gusto kong magpa-baptize", "gusto ko magpa baptize",
    ],
    "How can I get baptized?": [
        "i want to get baptized", "baptism schedule", "how do i get baptized", "can i be baptized",
    ],
    "Paano po kayo makokontak?": [
        "pano po kayo kontakin", "paano po kayo i contact", "paano po makipag ugnayan sa church",
        "paano ko kayo makakausap",
    ],
    "How can I contact the church?": [
        "how can i contact the church", "how do i reach the church", "how can i reach you",
        "how can i call the church", "what is the church phone number", "how do i get in touch with the church",
    ],
    "Where is the church located?": [
        "where can i find the church", "how to find your church", "church location", "where is your church",
        "what is the location of the church", "where are you located", "where is the church address",
        "how do i get to your church", "how do i get to the church", "how to get to the church",
        "directions to the church", "how can i go to your church", "how to go to your church",
        "where do i go for sunday service", "how to commute to the church", "can you give me directions",
    ],
    "Saan po ang simbahan ninyo?": [
        "saan po ang church", "san po ang simbahan", "saan po kayo matatagpuan", "address ng church",
        "san ang location ng church", "saan ang location ng church", "san po ang location ng church",
        "location ng church", "saan ang location", "nasaan ang church", "nasaan po ang simbahan",
        "saan kayo nagsisimba", "san kayo located", "saan po ang lokasyon ng simbahan",
        "paano pumunta sa church", "paano po pumunta sa simbahan ninyo", "paano pumunta sa inyo",
        "paano po mapupuntahan ang church", "paano makakarating sa church", "directions papunta sa church",
        "ano ang daan papunta sa church", "paano mag-commute papunta sa church",
    ],
    "Anong oras ang simba?": [
        "anong oras ang service tuwing linggo", "anong oras po ang worship", "ano pong oras ang simba sa linggo",
        "ano oras ang worship service sa sunday", "anong oras ang worship service sa linggo",
    ],
    "What time is the Sunday service?": [
        "what time is church on sunday", "when does church start on sunday", "sunday worship time",
        "what time does the sunday worship begin", "what time does the sunday service start",
    ],
    "Who is your pastor?": [
        "who leads the church", "who is the head pastor", "name of your pastor",
    ],
    "Sino po ang pastor ninyo?": [
        "sino pastor nyo", "sino po ang pinuno ng church", "sino ang pastor",
        "sino ang head pastor ng church nyo", "sino ang head pastor ninyo",
    ],
}

# Pang-test lang. Mga bagong pangungusap ito.
# Format: (tanong, [keywords na dapat nasa sagot]) -- None = dapat off-topic o "wala akong info"
# Keywords ang ginagamit (hindi eksaktong sagot) kasi may EN/TL na bersyon ang bawat sagot sa dataset.
TESTS = [
    ("ano oras ang worship service sa sunday", ["9:00"]),
    ("what time does the sunday worship begin", ["9:00"]),
    ("sino ang head pastor ng church nyo", ["culla"]),
    ("pwede ba mag-offering gamit ang gcash", ["gcash"]),
    ("gusto kong magpa-baptize", ["baptism", "bautismo", "binyag"]),
    ("how can i contact the church", ["09635903836"]),
    ("how do i get to your church", ["lalud"]),
    ("paano pumunta sa church nyo", ["lalud"]),
    ("how do i bake a cake", None),
    ("sino si manny pacquiao", None),
    ("what is the tallest mountain", None),
    ("what is the capital of australia", None),
    ("paano magluto ng pancit", None),
    ("sino ang pinakamagaling na artista", None),
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

    # Test sa mga bagong tanong
    print(f"\nTest sa mga bagong tanong (threshold = {THRESHOLD})")

    passed = total = 0
    for text, keywords in TESTS:
        proba = model.predict_proba([normalize(text)])[0]
        i = proba.argmax()
        got = None if proba[i] < THRESHOLD else model.classes_[i]  # None = "wala akong info"

        if keywords is None:
            ok = got is None or got == OFFTOPIC_LABEL
        else:
            ok = got is not None and got != OFFTOPIC_LABEL and any(k.lower() in got.lower() for k in keywords)

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