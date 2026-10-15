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

// Staff: magpadala ng notification + makita ang sariling notifications
export function StaffNotifications() {
  const [k, setK] = useState(0);
  return (
    <>
      <h2>Notifications</h2>
      <DataPage
        title="Sent Notifications"
        resource="notifications"
        addLabel="Send"
        canEdit={false}
        refreshKey={k}
        lookups={{ users: { resource: "users", label: (u) => `${u.full_name} (${u.role})` } }}
        columns={[
          { key: "title", label: "Title" },
          { key: "message", label: "Message" },
          { label: "To", render: (r) => r.recipient_name || "Everyone" },
          { key: "created_at", label: "Sent" },
        ]}
        fields={[
          { key: "user_id", label: "Recipient (blank = everyone)", type: "select", lookup: "users" },
          { key: "title", label: "Title", required: true },
          { key: "message", label: "Message", type: "textarea", required: true },
        ]}
      />
      <NotificationsView refreshKey={k} />
      <button className="btn secondary sm" onClick={() => setK(k + 1)}>Refresh</button>
    </>
  );
}