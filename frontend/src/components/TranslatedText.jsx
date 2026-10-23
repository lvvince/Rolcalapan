import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { translateText } from "../lib/api";

export default function TranslatedText({ text }) {
  const { i18n } = useTranslation();
  const [out, setOut] = useState(text);

  useEffect(() => {
    let alive = true;
    if (i18n.language === "tl" && text) {
      translateText(text, "tl")
        .then((t) => alive && setOut(t))
        .catch(() => alive && setOut(text));
    } else {
      setOut(text);
    }
    return () => {
      alive = false;
    };
  }, [text, i18n.language]);

  return <>{out}</>;
}