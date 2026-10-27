// frontend/src/pages/ministry/MinistryDashboard.jsx
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import api from "../../api";
import ProfilePicture from "../../components/ProfilePicture";
import DataPage, { hm } from "../../components/DataPage";
import NotificationsView from "../../components/Notifications";
import { useLang } from "../../i18n/LanguageContext";
import { eventFields, eventColumns } from "../secretary/StaffDashboard";
import "../../components/portal.css";

const mineLookup = { ministries: { resource: "ministries", params: { mine: 1 }, label: "name" } };
const err = (e) => e.response?.data?.error || "Something went wrong";

export function LeaderSchedule() {
  return (
    <>
      <h2>Ministry Schedule</h2>
      <DataPage
        title="Schedules"
        resource="ministry_schedules"
        addLabel="Schedule"
        lookups={{ ...mineLookup, members: { resource: "members", label: "full_name" } }}
        columns={[
          { key: "ministry_name", label: "Ministry" },
          { key: "title", label: "Title" },
          { key: "schedule_date", label: "Date" },
          { label: "Time", render: (r) => `${hm(r.start_time)}-${hm(r.end_time)}` },
          { key: "location", label: "Location" },
          { key: "volunteer_name", label: "Volunteer" },
        ]}
        fields={[
          { key: "ministry_id", label: "Ministry", type: "select", lookup: "ministries", required: true },
          { key: "title", label: "Title", required: true },
          { key: "schedule_date", label: "Date", type: "date", required: true },
          { key: "start_time", label: "Start time", type: "time", required: true },
          { key: "end_time", label: "End time", type: "time", required: true },
          { key: "location", label: "Location" },
          { key: "volunteer_member_id", label: "Assign volunteer (conflict is checked)", type: "select", lookup: "members" },
        ]}
      />
    </>
  );
}

const mmFields = [
  { key: "ministry_id", label: "Ministry", type: "select", lookup: "ministries", required: true },
  { key: "member_id", label: "Member", type: "select", lookup: "members", required: true },
  { key: "role", label: "Role", type: "select", required: true, options: [{ value: "member", label: "Member" }, { value: "volunteer", label: "Volunteer" }] },
];
const mmLookups = { ...mineLookup, members: { resource: "members", label: "full_name" } };

export function LeaderMembers() {
  return (
    <>
      <h2>Ministry Members</h2>
      <DataPage
        title="Members"
        resource="ministry_members"
        addLabel="Member"
        lookups={mmLookups}
        defaults={{ role: "member" }}
        columns={[
          { key: "ministry_name", label: "Ministry" },
          { key: "member_name", label: "Member" },
          { label: "Role", render: (r) => <span className={`badge ${r.role === "volunteer" ? "ok" : ""}`}>{r.role}</span> },
        ]}
        fields={mmFields}
      />
    </>
  );
}

export function LeaderVolunteers() {
  return (
    <>
      <h2>Volunteers</h2>
      <DataPage
        title="Volunteers"
        resource="ministry_members"
        addLabel="Volunteer"
        lookups={mmLookups}
        defaults={{ role: "volunteer" }}
        filter={(r) => r.role === "volunteer"}
        columns={[
          { key: "ministry_name", label: "Ministry" },
          { key: "member_name", label: "Volunteer" },
        ]}
        fields={mmFields}
      />
    </>
  );
}

export function LeaderActivities() {
  return (
    <>
      <h2>Ministry Activities</h2>
      <DataPage
        title="Activities"
        resource="activities"
        addLabel="Activity"
        lookups={mineLookup}
        defaults={{ status: "planned" }}
        columns={[
          { key: "ministry_name", label: "Ministry" },
          { key: "title", label: "Activity" },
          { key: "due_date", label: "Due" },
          {
            label: "Status",
            render: (r) => <span className={`badge ${r.status === "done" ? "ok" : r.status === "ongoing" ? "warn" : ""}`}>{r.status}</span>,
          },
        ]}
        fields={[
          { key: "ministry_id", label: "Ministry", type: "select", lookup: "ministries", required: true },
          { key: "title", label: "Activity", required: true },
          { key: "description", label: "Description", type: "textarea" },
          { key: "due_date", label: "Due date", type: "date" },
          { key: "status", label: "Status", type: "select", required: true, options: [{ value: "planned", label: "Planned" }, { value: "ongoing", label: "Ongoing" }, { value: "done", label: "Done" }] },
        ]}
      />
    </>
  );
}

export function LeaderEvents() {
  return (
    <>
      <h2>Ministry Events</h2>
      <DataPage
        title="Ministry Events"
        resource="events"
        addLabel="Event"
        lookups={mineLookup}
        filter={(r, l) => (l.ministries || []).some((m) => String(m.id) === String(r.ministry_id))}
        defaults={{ event_type: "internal", radius_m: 100 }}
        columns={eventColumns}
        fields={eventFields.map((f) => (f.key === "ministry_id" ? { ...f, label: "Ministry", required: true } : f))}
      />
    </>
  );
}

export function LeaderAttendance() {
  return (
    <>
      <h2>Ministry Attendance</h2>
      <DataPage
        title="Attendance"
        resource="attendance"
        canCreate={false}
        canEdit={false}
        canDelete={false}
        columns={[
          { key: "service_date", label: "Date" },
          { key: "member_name", label: "Member" },
          { label: "Event", render: (r) => r.event_title || "Sunday Service" },
          { label: "Method", render: (r) => <span className="badge">{r.method}</span> },
        ]}
        fields={[]}
      />
    </>
  );
}

export function LeaderNotifications() {
  const [k, setK] = useState(0);
  return (
    <>
      <h2>Notifications & Conflict Alerts</h2>
      <NotificationsView refreshKey={k} />
      <button className="btn secondary sm" onClick={() => setK(k + 1)}>Refresh</button>
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
          <h3 className="pf-name">{form.full_name || "Ministry Leader"}</h3>
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