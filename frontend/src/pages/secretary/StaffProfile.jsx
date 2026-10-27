// frontend/src/pages/secretary/StaffProfile.jsx
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import api from "../../api";
import ProfilePicture from "../../components/ProfilePicture";
import { useLang } from "../../i18n/LanguageContext";
import "../../components/portal.css";

const err = (e) => e.response?.data?.error || "Something went wrong";

export default function StaffProfile() {
  const { t } = useLang();
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get("/portal/me")
      .then((r) => setForm(r.data.member))
      .catch((e) => setMsg({ ok: false, text: err(e) }));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { profile_pic, ...payload } = form; // hindi isinasama ang pic
      await api.post("/portal/me", payload);
      setMsg({ ok: true, text: "Profile saved." });
    } catch (x) {
      setMsg({ ok: false, text: err(x) });
    } finally {
      setSaving(false);
    }
  };

  if (!form) return msg ? <div className="msg err">{t(msg.text)}</div> : <p>{t("Loading...")}</p>;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <h2>{t("My Profile")}</h2>
      <div className="pf-page">
        <aside className="panel pf-card">
          <ProfilePicture
            name={form.full_name}
            currentPic={form.profile_pic}
            onUploaded={(pic) => setForm((f) => ({ ...f, profile_pic: pic }))}
          />
          <h3 className="pf-name">{form.full_name || "Church Secretary"}</h3>
          {form.family_name && <div className="pf-family">{form.family_name} {t("family")}</div>}
        </aside>

        <div className="pf-main">
          <form className="panel" onSubmit={save}>
            <h4>{t("Personal Information")}</h4>
            <div className="pf-grid">
              <div className="field">
                <label>{t("Full name")} *</label>
                <input value={form.full_name || ""} onChange={set("full_name")} required />
              </div>
              <div className="field">
                <label>{t("Family name")}</label>
                <input value={form.family_name || ""} onChange={set("family_name")} />
              </div>
              <div className="field">
                <label>{t("Phone")}</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  pattern="[0-9]{11}"
                  title={t("11 digits (e.g. 09123456789)")}
                  placeholder="09123456789"
                  value={form.phone || ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 11) })}
                />
              </div>
              <div className="field">
                <label>{t("Birthdate")}</label>
                <input type="date" value={form.birthdate || ""} onChange={set("birthdate")} />
              </div>
              <div className="field full">
                <label>{t("Address")}</label>
                <input value={form.address || ""} onChange={set("address")} />
              </div>
            </div>

            <div className="pf-actions">
              {msg ? <div className={`msg ${msg.ok ? "ok" : "err"}`}>{t(msg.text)}</div> : <span />}
              <button className="btn" type="submit" disabled={saving}>
                <Save size={16} aria-hidden="true" /> {saving ? t("Saving...") : t("Save profile")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}