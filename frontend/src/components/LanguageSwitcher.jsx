import { LANGS, useLang } from '../i18n/LanguageContext';

export default function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  return (
    <select
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      className="border rounded px-2 py-1 text-sm"
      aria-label="Language"
    >
      {LANGS.map((l) => (
        <option key={l.code} value={l.code}>{l.label}</option>
      ))}
    </select>
  );
}