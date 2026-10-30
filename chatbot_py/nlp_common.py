import re

OFFTOPIC_LABEL = "__OFFTOPIC__"
PHONE = "09635903836"
FB = "https://www.facebook.com/riveroflifeintcalapan"

_TAGALOG = {
    "ano", "anong", "saan", "kailan", "sino", "paano", "bakit", "ba", "po", "opo", "ang", "ng", "mga",
    "sa", "ko", "mo", "niyo", "nyo", "namin", "kayo", "ako", "pwede", "puwede", "meron", "mayroon",
    "magkano", "oras", "simba", "nasaan", "yung", "ito", "iyan", "araw", "paki", "may", "kami",
    "tayo", "bukas", "salamat", "kumusta", "magandang", "umaga", "gusto", "pano", "kelan", "ng",
}


def normalize(text):
    """Lowercase, tanggalin ang bantas, ayusin ang spaces."""
    text = str(text).lower()
    text = re.sub(r"[^\w\s]", " ", text, flags=re.UNICODE)
    return re.sub(r"\s+", " ", text).strip()


def is_tagalog(text):
    tokens = set(normalize(text).split())
    return len(tokens & _TAGALOG) >= 1


def no_info_answer(question):
    if is_tagalog(question):
        return (
            "Pasensya na po, wala pa po akong impormasyon tungkol diyan. "
            f"Pakikontak po ang church sa {PHONE} o mag-message sa Facebook page namin: {FB}"
        )
    return (
        "Sorry, I don't have that information yet. "
        f"Please contact the church at {PHONE} or message our Facebook page: {FB}"
    )


def offtopic_answer(question):
    if is_tagalog(question):
        return (
            "Tungkol lang po sa River of Life Calapan church ang masasagot ko, tulad ng schedule, "
            "location, ministries, at giving. Ano po ang maitutulong ko tungkol doon?"
        )
    return (
        "I can only help with questions about River of Life Calapan church, like schedules, "
        "location, ministries, and giving. How can I help you with those?"
    )