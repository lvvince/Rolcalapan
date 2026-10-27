import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import "./NotifToast.css";

const PATHS = {
  admin: "/admin/notifications",
  staff: "/staff/notifications",
  ministry_leader: "/ministry/notifications",
  member: "/portal/notifications",
};

const POLL_MS = 4000;
const SHOW_MS = 6000;
const MAX_TOASTS = 3;

function Item({ n, onClose, onOpen }) {
  return (
    <div className="nt-toast" role="status" onClick={onOpen}>
      <div className="nt-icon">🔔</div>
      <div className="nt-body">
        <div className="nt-top">
          <span>New notification</span>
          <span>Just now</span>
        </div>
        <div className="nt-title">{n.title || "New notification"}</div>
        {n.message && <div className="nt-msg">{n.message}</div>}
      </div>
      <button
        className="nt-x"
        aria-label="Close"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        ×
      </button>
      <div
        className="nt-bar"
        style={{ animationDuration: `${SHOW_MS}ms` }}
        onAnimationEnd={onClose}
      />
    </div>
  );
}

function Inner({ user }) {
  const navigate = useNavigate();
  const [toasts, setToasts] = useState([]);
  const seen = useRef(null);

  useEffect(() => {
    let stop = false;

    const check = async () => {
      try {
        const { data } = await api.get("/portal/notifications");
        const rows = Array.isArray(data) ? data : [];

        if (seen.current === null) {
          seen.current = new Set(rows.map((n) => String(n.id))); // unang load: walang pop-up
          return;
        }

        const fresh = rows.filter((n) => !seen.current.has(String(n.id)));
        rows.forEach((n) => seen.current.add(String(n.id)));

        if (fresh.length && !stop) {
          setToasts((prev) => [...fresh, ...prev].slice(0, MAX_TOASTS));
        }
      } catch {
        /* huwag mag-crash kapag nag-fail ang request */
      }
    };

    check();
    const id = setInterval(check, POLL_MS);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);

  const close = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="nt-wrap">
      {toasts.map((n) => (
        <Item
          key={n.id}
          n={n}
          onClose={() => close(n.id)}
          onOpen={() => {
            close(n.id);
            navigate(PATHS[user.role] || "/");
          }}
        />
      ))}
    </div>,
    document.body
  );
}

export default function NotifToast() {
  const { user } = useAuth();
  if (!user) return null;
  return <Inner key={user.id ?? user.email ?? "u"} user={user} />;
}