import { useEffect, useRef, useState } from "react";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../i18n/LanguageContext";
import "../../components/portal.css";
import "./AdminProfile.css";

const MAX_SIZE = 2 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const API_BASE = import.meta.env.VITE_API_URL || "/api";

/* ---------- Icons (inline SVG) ---------- */
const Svg = ({ children, size = 18, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
);

const IconCamera = (p) => (
  <Svg {...p}>
    <path d="M14.5 4h-5L7.5 6.5H4a1 1 0 0 0-1 1V18a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7.5a1 1 0 0 0-1-1h-3.5L14.5 4z" />
    <circle cx="12" cy="12.5" r="3.5" />
  </Svg>
);
const IconEye = (p) => (
  <Svg {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);
const IconEyeOff = (p) => (
  <Svg {...p}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 4.06-5.06M9.9 4.24A9.12 9.12 0 0 1 12 5c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
  </Svg>
);
const IconTrash = (p) => (
  <Svg {...p}>
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6M10 11v6M14 11v6" />
  </Svg>
);
const IconUser = (p) => (
  <Svg {...p}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Svg>
);
const IconMail = (p) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </Svg>
);
const IconPhone = (p) => (
  <Svg {...p}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
  </Svg>
);
const IconLock = (p) => (
  <Svg {...p}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Svg>
);
const IconShield = (p) => (
  <Svg {...p}>
    <path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3z" />
    <path d="m9 12 2 2 4-4" />
  </Svg>
);
const IconCheck = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.5 2.5 2.5 4.5-5" />
  </Svg>
);
const IconAlert = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v5M12 16.5v.01" />
  </Svg>
);
const IconClose = (p) => (
  <Svg {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);

/* ---------- Reusable field with left icon ---------- */
function Field({ label, icon, children }) {
  return (
    <label className="prf-field">
      <span className="prf-label">{label}</span>
      <span className="prf-input-wrap">
        <span className="prf-input-icon">{icon}</span>
        {children}
      </span>
    </label>
  );
}

function PasswordField({ label, value, onChange, minLength, autoComplete }) {
  const { t } = useLang();
  const [show, setShow] = useState(false);
  return (
    <Field label={label} icon={<IconLock size={16} />}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        minLength={minLength}
        autoComplete={autoComplete}
        required
      />
      <button
        type="button"
        className="prf-eye"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? t("Hide password") : t("Show password")}
      >
        {show ? <IconEyeOff size={17} /> : <IconEye size={17} />}
      </button>
    </Field>
  );
}

function strength(pw) {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}
const STRENGTH_LABEL = ["Too short", "Weak", "Fair", "Good", "Strong"];

export default function AdminProfile() {
  const { t } = useLang();
  const { user, setUser } = useAuth();
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    full_name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [photo, setPhoto] = useState(user?.photo || null);
  const [role, setRole] = useState(user?.role || "admin");
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // Kunin ang pinakabagong data galing sa server (para hindi mawala pagka-refresh)
  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => {
        const me = res.data?.user;
        if (!me) return;
        setPhoto(me.photo || null);
        setRole(me.role || "admin");
        setForm({
          full_name: me.name || "",
          email: me.email || "",
          phone: me.phone || "",
        });
        setUser?.((u) => ({ ...u, ...me }));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-hide ng alerts
  useEffect(() => {
    if (!msg && !err) return;
    const timer = setTimeout(() => { setMsg(""); setErr(""); }, 4500);
    return () => clearTimeout(timer);
  }, [msg, err]);

  const run = async (fn, okMsg) => {
    setMsg(""); setErr("");
    try { await fn(); setMsg(okMsg); }
    catch (e) { setErr(e.response?.data?.error || e.message || "Something went wrong"); }
  };

  const initials = (form.full_name || "?")
    .split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const photoSrc =
    preview || (photo ? `${API_BASE}/avatar?f=${encodeURIComponent(photo)}` : "");
  const roleLabel = (role || "admin").replace(/^\w/, (c) => c.toUpperCase());

  const saveProfile = (e) => {
    e.preventDefault();
    if (form.phone && !/^\d{11}$/.test(form.phone)) {
      setMsg(""); setErr("Phone must be exactly 11 digits"); return;
    }
    run(async () => {
      await api.put("/auth/me", form);
      setUser?.((u) => ({ ...u, name: form.full_name, email: form.email, phone: form.phone }));
    }, "Profile updated");
  };

  const changePassword = (e) => {
    e.preventDefault();
    if (pw.next !== pw.confirm) { setMsg(""); setErr("New password and confirm password do not match"); return; }
    if (pw.next === pw.current) { setMsg(""); setErr("New password must be different from the current one"); return; }
    run(async () => {
      await api.put("/auth/me/password", {
        current_password: pw.current,
        new_password: pw.next,
      });
      setPw({ current: "", next: "", confirm: "" });
    }, "Password changed");
  };

  const onPickPhoto = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!TYPES.includes(file.type)) { setMsg(""); setErr("JPG, PNG or WEBP only."); return; }
    if (file.size > MAX_SIZE) { setMsg(""); setErr("Max 2MB only."); return; }

    setPreview(URL.createObjectURL(file));
    setBusy(true);
    run(async () => {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await api.post("/auth/me/photo", fd);
      setPhoto(res.data.photo);
      setPreview("");
      setUser?.((u) => ({ ...u, photo: res.data.photo }));
    }, "Photo updated").finally(() => setBusy(false));
  };

  const removePhoto = () => {
    setBusy(true);
    run(async () => {
      await api.delete("/auth/me/photo");
      setPhoto(null);
      setPreview("");
      setUser?.((u) => ({ ...u, photo: null }));
    }, "Photo removed").finally(() => setBusy(false));
  };

  const score = strength(pw.next);
  const mismatch = pw.confirm && pw.next !== pw.confirm;

  return (
    <div className="prf">
      <header className="prf-head">
        <h2>{t("My Profile")}</h2>
        <p>{t("Manage your personal information and account security.")}</p>
      </header>

      {(msg || err) && (
        <div className={`prf-alert ${err ? "bad" : "ok"}`} role="status">
          {err ? <IconAlert size={18} /> : <IconCheck size={18} />}
          <span>{t(err || msg)}</span>
          <button type="button" onClick={() => { setMsg(""); setErr(""); }} aria-label={t("Dismiss")}>
            <IconClose size={16} />
          </button>
        </div>
      )}

      <div className="prf-grid">
        {/* ---------- LEFT: profile card ---------- */}
        <aside className="prf-card prf-side">
          <div className="prf-ring">
            <div className="prf-ring-inner">
              {photoSrc ? <img src={photoSrc} alt={form.full_name} /> : <span>{initials}</span>}
            </div>
            <button
              type="button"
              className="prf-badge"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              aria-label={t("Change photo")}
            >
              <IconCamera size={18} />
            </button>
          </div>

          <input ref={fileRef} type="file" accept={TYPES.join(",")} hidden onChange={onPickPhoto} />

          <h3 className="prf-name">{form.full_name || "—"}</h3>
          <span className="prf-role"><IconShield size={14} /> {t(roleLabel)}</span>
          <p className="prf-email">{form.email}</p>

          <div className="prf-actions">
            <button type="button" className="prf-outline" onClick={() => fileRef.current?.click()} disabled={busy}>
              <IconCamera size={16} /> {busy ? t("Please wait...") : t("Change Photo")}
            </button>
            {photoSrc && !busy && (
              <button type="button" className="prf-remove" onClick={removePhoto}>
                <IconTrash size={15} /> {t("Remove photo")}
              </button>
            )}
          </div>
          <small className="prf-hint">{t("JPG, PNG or WEBP. Max 2MB.")}</small>
        </aside>

        {/* ---------- RIGHT: forms ---------- */}
        <div className="prf-main">
          <form onSubmit={saveProfile} className="prf-card">
            <div className="prf-card-head">
              <span className="prf-card-icon"><IconUser size={18} /></span>
              <div>
                <h3>{t("Personal Information")}</h3>
                <p>{t("Update your name, email and phone number.")}</p>
              </div>
            </div>

            <Field label={t("Full name")} icon={<IconUser size={16} />}>
              <input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </Field>

            <div className="prf-row">
              <Field label={t("Email")} icon={<IconMail size={16} />}>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </Field>
              <Field label={t("Phone")} icon={<IconPhone size={16} />}>
                <input
                  inputMode="numeric"
                  maxLength={11}
                  placeholder="09XXXXXXXXX"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })}
                />
              </Field>
            </div>

            <div className="prf-foot">
              <button className="prf-btn" type="submit">{t("Save changes")}</button>
            </div>
          </form>

          <form onSubmit={changePassword} className="prf-card">
            <div className="prf-card-head">
              <span className="prf-card-icon"><IconLock size={18} /></span>
              <div>
                <h3>{t("Change password")}</h3>
                <p>{t("Use a strong password that you do not use anywhere else.")}</p>
              </div>
            </div>

            <PasswordField
              label={t("Current password")}
              autoComplete="current-password"
              value={pw.current}
              onChange={(e) => setPw({ ...pw, current: e.target.value })}
            />

            <div className="prf-row">
              <div>
                <PasswordField
                  label={t("New password")}
                  autoComplete="new-password"
                  minLength={6}
                  value={pw.next}
                  onChange={(e) => setPw({ ...pw, next: e.target.value })}
                />
                {pw.next && (
                  <div className="prf-meter" data-score={score}>
                    <div className="prf-meter-bars">
                      {[1, 2, 3, 4].map((i) => (
                        <span key={i} className={i <= score ? "on" : ""} />
                      ))}
                    </div>
                    <small>{t(STRENGTH_LABEL[score])}</small>
                  </div>
                )}
              </div>
              <div>
                <PasswordField
                  label={t("Confirm new password")}
                  autoComplete="new-password"
                  minLength={6}
                  value={pw.confirm}
                  onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                />
                {mismatch && <small className="prf-error">{t("Passwords do not match.")}</small>}
              </div>
            </div>

            <div className="prf-foot">
              <button className="prf-btn" type="submit">{t("Update password")}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}