import { useEffect, useState } from 'react';
import { LANGS, useLang } from '../../i18n/LanguageContext';

export default function Language() {
  const { lang, setLang, t } = useLang();
  const [selected, setSelected] = useState(lang);
  const [saved, setSaved] = useState(false);

  // i-sync kapag binago ang wika sa dropdown sa taas
  useEffect(() => {
    setSelected(lang);
  }, [lang]);

  const handleSave = () => {
    setLang(selected);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">{t('Preferred Language')}</h1>

      <div className="bg-white rounded-xl shadow-sm p-5 max-w-xl">
        <label htmlFor="lang-select" className="block text-sm text-gray-600 mb-2">
          {t('Language')}
        </label>
        <select
          id="lang-select"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full border rounded-lg px-3 py-3"
        >
          {LANGS.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>

        <p className="text-gray-500 mt-4">
          {t('Your choice changes the app language. Non-English text is translated automatically.')}
        </p>

        {saved && (
          <div className="mt-4 rounded-lg bg-green-100 text-green-800 px-4 py-3">
            {t('Preferred language saved.')}
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          className="mt-4 bg-blue-900 text-white font-semibold rounded-lg px-5 py-2.5"
        >
          {t('Save')}
        </button>
      </div>
    </div>
  );
}