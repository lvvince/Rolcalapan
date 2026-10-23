import { useLang } from './LanguageContext';

export function useTranslation() {
  const { t, lang, setLang } = useLang();
  return { t, i18n: { language: lang, changeLanguage: setLang } };
}

export const Trans = ({ children }) => children;