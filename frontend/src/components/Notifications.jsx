// frontend/src/components/Notifications.jsx
import { useEffect, useState } from "react";
import api from "../api";
import DataPage from "./DataPage";
import "./portal.css";

export default function NotificationsView({ refreshKey = 0 }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/portal/notifications")
      .then((r) => setRows(r.data))
      .catch((e) => setError(e.response?.data?.error || "Failed to load"));
  }, [refreshKey]);

  return (
    <>
      <div className="toolbar"><h3>My Notifications</h3></div>
      {error && <div className="msg err">{error}</div>}
      {rows.length === 0 ? (
        <div className="empty">No notifications.</div>
      ) : (
        rows.map((n) => (
          <div className="item" key={n.id}>
            <h4>{n.title}</h4>
            <p>{n.message}</p>
            <small className="muted">{n.created_at}</small>
          </div>
        ))
      )}
    </>
  );
}

// Mga group na mapipili sa Recipient dropdown (value "" = everyone)
const GROUP_OPTIONS = [
  { value: "", label: "Everyone" },
  { value: "role:member", label: "All Members" },
  { value: "role:ministry_leader", label: "All Ministry Leaders" },
  { value: "role:staff", label: "All Secretary / Staff" },
  { value: "role:admin", label: "All Admins" },
];

// Staff/Admin: magpadala ng notification + makita ang sariling notifications
export function StaffNotifications() {
  const [k, setK] = useState(0);

  // Group → isang notification bawat user na may ganung role.
  // Single user / Everyone → return undefined = normal na save ng DataPage.
  const sendToGroup = async (values, { lookups }) => {
    if (!String(values.user_id).startsWith("role:")) return;

    const role = values.user_id.replace("role:", "");
    const ids = (lookups.users || []).filter((u) => u.role === role).map((u) => u.id);
    if (ids.length === 0) return { ok: false, text: "No users found for that group." };

    await Promise.all(
      ids.map((id) =>
        api.post("/resource/save", {
          name: "notifications",
          user_id: id,
          title: values.title,
          message: values.message,
        })
      )
    );
    return { ok: true, text: `Sent to ${ids.length} user(s).` };
  };

  return (
    <>
      <h2>Notifications</h2>
      <DataPage
        title="Sent Notifications"
        resource="notifications"
        addLabel="Send"
        canEdit={false}
        refreshKey={k}
        onSave={sendToGroup}
        lookups={{
          users: {
            resource: "users",
            label: (u) => `${u.full_name} (${u.role})`,
            prepend: GROUP_OPTIONS,
          },
        }}
        columns={[
          { key: "title", label: "Title" },
          { key: "message", label: "Message" },
          { label: "To", render: (r) => r.recipient_name || "Everyone" },
          { key: "created_at", label: "Sent" },
        ]}
        fields={[
          { key: "user_id", label: "Recipient", type: "select", lookup: "users", default: "" },
          { key: "title", label: "Title", required: true },
          { key: "message", label: "Message", type: "textarea", required: true },
        ]}
      />
      <NotificationsView refreshKey={k} />
      <button className="btn secondary sm" onClick={() => setK(k + 1)}>Refresh</button>
    </>
  );
}