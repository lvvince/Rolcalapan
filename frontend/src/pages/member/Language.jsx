// ============================================================
// frontend/src/pages/member/MemberPages.jsx
//
// 1) PALITAN ang import na ito sa taas ng file:
//      import { useTranslation } from "react-i18next";
//    ng:
//      import { useLang } from "../../i18n/LanguageContext";
//
// 2) PALITAN ang buong "Language" section (mula sa `const langs = [`
//    hanggang sa dulo ng `export function Language() { ... }`) ng code sa ibaba.
//    Huwag galawin ang MemberNotifications sa ilalim nito.
// ============================================================

const langs = [
  { value: "en", label: "English" },
  { value: "tl", label: "Filipino (Tagalog)" },
  { value: "ceb", label: "Cebuano" },
  { value: "ilo", label: "Ilocano" },
];

export function Language() {
  const { lang, setLang, t } = useLang();
  const [selected, setSelected] = useState(lang);
  const [msg, setMsg] = useState(null);

  // sumusunod sa dropdown sa header (at sa kasalukuyang wika ng app)
  useEffect(() => {
    setSelected(lang);
  }, [lang]);

  const save = async () => {
    setLang(selected); // ito ang nagpapalit ng buong app at ng header
    localStorage.setItem("language", selected);
    try {
      await api.post("/portal/me", { language: selected });
      setMsg({ ok: true, saved: true });
    } catch (x) {
      setMsg({ ok: false, text: err(x) });
    }
  };

  return (
    <>
      <h2>{t("language.title")}</h2>
      <div className="panel" style={{ maxWidth: 420 }}>
        <div className="field">
          <label>{t("language.label")}</label>
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {langs.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <p className="muted">{t("language.note")}</p>
        {msg && (
          <div className={`msg ${msg.ok ? "ok" : "err"}`}>
            {msg.saved ? t("language.saved") : msg.text}
          </div>
        )}
        <button className="btn" onClick={save}>
          <Ico icon={Save} /> {t("common.save")}
        </button>
      </div>
    </>
  );
}