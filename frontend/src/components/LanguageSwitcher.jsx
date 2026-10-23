import { useTranslation } from "react-i18next";

const options = [
  { value: "en", label: "English" },
  { value: "tl", label: "Tagalog" },
  { value: "ceb", label: "Cebuano" },
  { value: "ilo", label: "Ilocano" },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  return (
    <select
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      className="border rounded px-2 py-1 text-sm"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}