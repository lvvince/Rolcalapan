// frontend/src/pages/RoleDashboard.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { roleMenus } from "../config/roleMenus";
import TranslatedText from "../components/TranslatedText";
import Icon from "../components/Icon";

// path ng menu item -> icon name (components/Icon.jsx)
const menuIcons = {
  // Secretary / Staff
  members: "users",
  qr: "qr",
  "qr-codes": "qr",
  attendance: "check",
  events: "calendar",
  geofence: "pin",
  schedules: "clock",
  giving: "gift",
  reports: "chart",
  sermons: "mic",
  announcements: "message",
  notifications: "bell",

  // Ministry Leader
  schedule: "clock",
  volunteers: "heart",
  activities: "chart",

  // Member
  profile: "member",
  rsvp: "calendar",
  prayer: "heart",
  prayers: "heart",
  checkin: "pin",
  ministries: "users",
  donate: "gift",
};

// icon para sa stat cards, base sa label galing API
const statIcon = (label = "") => {
  const l = label.toLowerCase();
  if (l.includes("schedule")) return "clock";
  if (l.includes("activit")) return "chart";
  if (l.includes("volunteer")) return "heart";
  if (l.includes("member")) return "users";
  if (l.includes("ministr")) return "heart";
  if (l.includes("event")) return "calendar";
  if (l.includes("attend")) return "check";
  if (l.includes("giv") || l.includes("donat")) return "gift";
  if (l.includes("prayer")) return "heart";
  if (l.includes("notif") || l.includes("alert")) return "bell";
  return "dashboard";
};

const tile = {
  width: 40,
  height: 40,
  borderRadius: 10,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  color: "#0f7e9b",
  background: "rgba(15, 126, 155, 0.12)",
};

export default function RoleDashboard({ role }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const menu = roleMenus[role];
  const [stats, setStats] = useState([]);

  useEffect(() => {
    api.get("/portal/overview").then((r) => setStats(r.data.stats)).catch(() => {});
  }, []);

  return (
    <>
      <h2>{t("dashboard.welcome", { name: user?.name })}</h2>
      <p className="muted">{t(`menu.title.${role}`, { defaultValue: menu.title })}</p>

      {stats.length > 0 && (
        <div className="cards" style={{ marginBottom: 24 }}>
          {stats.map((s) => (
            <div className="card" key={s.label}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <span><TranslatedText text={s.label} /></span>
                <span style={tile}><Icon name={statIcon(s.label)} size={20} /></span>
              </div>
              <strong>{s.value}</strong>
            </div>
          ))}
        </div>
      )}

      <div className="cards">
        {menu.items.map((i) => (
          <Link key={i.path} to={`${menu.base}/${i.path}`} className="card" style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={tile}><Icon name={i.icon || menuIcons[i.path] || "dashboard"} size={20} /></span>
              <strong style={{ fontSize: 16 }}>
                {t(`menu.label.${role}.${i.path}`, { defaultValue: i.label })}
              </strong>
            </div>
            <span>{t(`menu.desc.${role}.${i.path}`, { defaultValue: i.desc })}</span>
          </Link>
        ))}
      </div>
    </>
  );
}