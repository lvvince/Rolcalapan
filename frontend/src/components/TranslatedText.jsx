import { useLang } from "../i18n/LanguageContext";

export default function TranslatedText({ text, children }) {
  const { t } = useLang();
  const value = text ?? (typeof children === "string" ? children : "");
  return <>{t(value)}</>;
}