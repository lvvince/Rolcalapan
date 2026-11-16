// frontend/src/pages/ministry/MinistryDashboard.jsx
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import api from "../../api";
import ProfilePicture from "../../components/ProfilePicture";
import DataPage, { hm } from "../../components/DataPage";
import NotificationsView from "../../components/Notifications";
import { useLang } from "../../i18n/LanguageContext";
import { getEventFields, getEventColumns } from "../secretary/StaffDashboard";
import "../../components/portal.css";

const mineLookup = { ministries: { resource: "ministries", params: { mine: 1 }, label: "name" } };
const err = (e) => e.response?.data?.error || "Something went wrong";

// Petsa ngayon sa Pilipinas (YYYY-MM-DD), kahit iba ang timezone ng device
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

/* ------------------------------------------------ Ministry Schedule */
export function LeaderSchedule() {
  const { t } = useLang();
  const minDate = today();
  return (
    <>
      <h2>{t("Ministry Schedule")}</h2>
      <DataPage
        title={t("Schedules")}
        resource="ministry_schedules"
        addLabel={t("Schedule")}
        lookups={{ ...mineLookup, members: { resource: "members", label: "full_name" } }}
        columns={[
          { key: "ministry_name", label: t("Ministry") },
          { key: "title", label: t("Title") },
          { key: "schedule_date", label: t("Date") },
          { label: t("Time"), render: (r) => `${hm(r.start_time)}-${hm(r.end_time)}` },
          { key: "location", label: t("Location") },
          { key: "volunteer_name", label: t("Volunteer") },
        ]}
        fields={[
          { key: "ministry_id", label: t("Ministry"), type: "select", lookup: "ministries", required: true },
          { key: "title", label: t("Title"), required: true },
          { key: "schedule_date", label: t("Date"), type: "date", required: true, min: minDate },
          { key: "start_time", label: t("Start time"), type: "time", required: true },
          { key: "end_time", label: t("End time"), type: "time", required: true, after: "start_time" },
          { key: "location", label: t("Location") },
          { key: "volunteer_member_id", label: t("Assign volunteer (conflict is checked)"), type: "select", lookup: "members" },
        ]}
      />
    </>
  );
}

/* ------------------------------------------------ Ministry Members */
const mmLookups = { ...mineLookup, members: { resource: "members", label: "full_name" } };
const getMmFields = (t) => [
  { key: "ministry_id", label: t("Ministry"), type: "select", lookup: "ministries", required: true },
  { key: "member_id", label: t("Member"), type: "select", lookup: "members", required: true },
  { key: "role", label: t("Role"), type: "select", required: true, options: [{ value: "member", label: t("Member") }, { value: "volunteer", label: t("Volunteer") }] },
];

const fetchRes = (name, params = {}) =>
  api.get("/resource", { params: { name, ...params } }).then((r) => (Array.isArray(r.data) ? r.data : []));

// Naka-group per ministry/group: kita ng leader kung sino ang nag-join sa kanya
function MembersByMinistry() {
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    let off = false;
    Promise.all([
      fetchRes("ministries", { mine: 1 }),
      fetchRes("ministry_members"),
      fetchRes("members").catch(() => []), // optional: para sa email/phone
    ])
      .then(([ministries, rows, members]) => !off && setData({ ministries, rows, members }))
      .catch((e) => !off && setError(err(e)));
    return () => {
      off = true;
    };
  }, []);

  if (error) return <div className="msg err">{t(error)}</div>;
  if (!data) return <p>{t("Loading...")}</p>;

  const memberById = {};
  data.members.forEach((m) => (memberById[String(m.id)] = m));

  // ministry_id ang batayan; kung wala sa row, ministry_name ang panghalili
  const belongs = (r, m) => (r.ministry_id != null ? String(r.ministry_id) === String(m.id) : r.ministry_name === m.name);
  const needle = q.trim().toLowerCase();

  if (data.ministries.length === 0) {
    return <p className="panel">{t("No ministries are assigned to you yet.")}</p>;
  }

  return (
    <>
      <div className="field" style={{ maxWidth: 360, marginBottom: 16 }}>
        <input placeholder={t("Search member...")} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {data.ministries.map((m) => {
        const all = data.rows.filter((r) => belongs(r, m));
        const list = needle ? all.filter((r) => (r.member_name || "").toLowerCase().includes(needle)) : all;
        const volunteers = all.filter((r) => r.role === "volunteer").length;

        return (
          <section className="panel" key={m.id} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h4 style={{ margin: 0 }}>
                {m.name} <span className="badge">{m.type === "small_group" ? t("Small group") : t("Ministry")}</span>
              </h4>
              <span>
                <strong>{all.length}</strong> {t(all.length === 1 ? "member" : "members")}
                {volunteers > 0 && <> · {volunteers} {t("volunteer")}</>}
              </span>
            </div>

            {list.length === 0 ? (
              <p style={{ margin: "12px 0 0", opacity: 0.7 }}>{t(all.length ? "No match found" : "No one has joined yet.")}</p>
            ) : (
              <table className="table" style={{ width: "100%", marginTop: 12 }}>
                <thead>
                  <tr>
                    <th>{t("Member")}</th>
                    <th>{t("Contact")}</th>
                    <th>{t("Role")}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r, i) => {
                    const info = memberById[String(r.member_id)] || {};
                    return (
                      <tr key={r.id ?? i}>
                        <td>{r.member_name || info.full_name || "—"}</td>
                        <td>{[info.email, info.phone].filter(Boolean).join(" · ") || "—"}</td>
                        <td>
                          <span className={`badge ${r.role === "volunteer" ? "ok" : ""}`}>{t(r.role)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        );
      })}
    </>
  );
}

export function LeaderMembers() {
  const { t } = useLang();
  const [view, setView] = useState("groups");
  return (
    <>
      <h2>{t("Ministry Members")}</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button className={`btn sm ${view === "groups" ? "" : "secondary"}`} onClick={() => setView("groups")}>
          {t("By ministry")}
        </button>
        <button className={`btn sm ${view === "manage" ? "" : "secondary"}`} onClick={() => setView("manage")}>
          {t("Manage list")}
        </button>
      </div>

      {view === "groups" ? (
        <MembersByMinistry />
      ) : (
        <DataPage
          title={t("Members")}
          resource="ministry_members"
          addLabel={t("Member")}
          lookups={mmLookups}
          defaults={{ role: "member" }}
          columns={[
            { key: "ministry_name", label: t("Ministry") },
            { key: "member_name", label: t("Member") },
            { label: t("Role"), render: (r) => <span className={`badge ${r.role === "volunteer" ? "ok" : ""}`}>{t(r.role)}</span> },
          ]}
          fields={getMmFields(t)}
        />
      )}
    </>
  );
}

/* ------------------------------------------------ Volunteers */
export function LeaderVolunteers() {
  const { t } = useLang();
  return (
    <>
      <h2>{t("Volunteers")}</h2>
      <DataPage
        title={t("Volunteers")}
        resource="ministry_members"
        addLabel={t("Volunteer")}
        lookups={mmLookups}
        defaults={{ role: "volunteer" }}
        filter={(r) => r.role === "volunteer"}
        columns={[
          { key: "ministry_name", label: t("Ministry") },
          { key: "member_name", label: t("Volunteer") },
        ]}
        fields={getMmFields(t)}
      />
    </>
  );
}

/* ------------------------------------------------ Activities */
export function LeaderActivities() {
  const { t } = useLang();
  return (
    <>
      <h2>{t("Ministry Activities")}</h2>
      <DataPage
        title={t("Activities")}
        resource="activities"
        addLabel={t("Activity")}
        lookups={mineLookup}
        defaults={{ status: "planned" }}
        columns={[
          { key: "ministry_name", label: t("Ministry") },
          { key: "title", label: t("Activity") },
          { key: "due_date", label: t("Due") },
          {
            label: t("Status"),
            render: (r) => <span className={`badge ${r.status === "done" ? "ok" : r.status === "ongoing" ? "warn" : ""}`}>{t(r.status)}</span>,
          },
        ]}
        fields={[
          { key: "ministry_id", label: t("Ministry"), type: "select", lookup: "ministries", required: true },
          { key: "title", label: t("Activity"), required: true },
          { key: "description", label: t("Description"), type: "textarea" },
          { key: "due_date", label: t("Due date"), type: "date" },
          { key: "status", label: t("Status"), type: "select", required: true, options: [{ value: "planned", label: t("Planned") }, { value: "ongoing", label: t("Ongoing") }, { value: "done", label: t("Done") }] },
        ]}
      />
    </>
  );
}

/* ------------------------------------------------ Events */
export function LeaderEvents() {
  const { t } = useLang();
  const minDate = today();
  return (
    <>
      <h2>{t("Ministry Events")}</h2>
      <DataPage
        title={t("Ministry Events")}
        resource="events"
        addLabel={t("Event")}
        lookups={mineLookup}
        filter={(r, l) => (l.ministries || []).some((m) => String(m.id) === String(r.ministry_id))}
        defaults={{ event_type: "internal", radius_m: 100 }}
        columns={getEventColumns(t)}
        fields={getEventFields(t).map((f) => {
          if (f.key === "ministry_id") return { ...f, label: t("Ministry"), required: true };
          if (f.key === "event_date") return { ...f, min: minDate }; // bawal ang nakaraang petsa
          if (f.key === "end_time") return { ...f, after: "start_time" }; // dapat mas huli sa start
          return f;
        })}
      />
    </>
  );
}

/* ------------------------------------------------ Attendance */
export function LeaderAttendance() {
  const { t } = useLang();
  return (
    <>
      <h2>{t("Ministry Attendance")}</h2>
      <DataPage
        title={t("Attendance")}
        resource="attendance"
        canCreate={false}
        canEdit={false}
        canDelete={false}
        columns={[
          { key: "service_date", label: t("Date") },
          { key: "member_name", label: t("Member") },
          { label: t("Event"), render: (r) => r.event_title || t("Sunday Service") },
          { label: t("Method"), render: (r) => <span className="badge">{t(r.method)}</span> },
        ]}
        fields={[]}
      />
    </>
  );
}

/* ------------------------------------------------ Notifications */
export function LeaderNotifications() {
  const { t } = useLang();
  const [k, setK] = useState(0);
  return (
    <>
      <h2>{t("Notifications & Conflict Alerts")}</h2>
      <NotificationsView refreshKey={k} />
      <button className="btn secondary sm" onClick={() => setK(k + 1)}>{t("Refresh")}</button>
    </>
  );
}

/* ------------------------------------------------ Ministry Leader Profile */
export function LeaderProfile() {
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
          <h3 className="pf-name">{form.full_name || t("Ministry Leader")}</h3>
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
                <input
                  type="date"
                  max={today()} // hindi pwedeng nasa hinaharap ang kapanganakan
                  value={form.birthdate || ""}
                  onChange={set("birthdate")}
                />
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