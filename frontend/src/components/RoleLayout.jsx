// frontend/src/components/RoleLayout.jsx
// Layout para sa Secretary, Ministry Leader, at Member. May chatbot widget ang Member.
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, X, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { roleMenus } from "../config/roleMenus";
import Icon from "./Icon";
import ChatWidget from "./ChatWidget";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";

// path ng menu item -> pangalan ng icon sa components/Icon.jsx
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
  schedule: "calendar",
  volunteers: "heart",
  activities: "check",

  // Member
  profile: "member",
  rsvp: "calendar",
  prayer: "heart",
  prayers: "heart",
  checkin: "pin",
  ministries: "users",
  donate: "gift",
};

const getMenuIcon = (item) => item.icon || menuIcons[item.path] || "dashboard";

const initialsOf = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";

// Mga posibleng pangalan ng photo field (dagdagan kung iba ang gamit ng banner mo)
const PHOTO_KEYS = [
  "photo",
  "photo_url",
  "photoUrl",
  "avatar",
  "avatar_url",
  "avatarUrl",
  "profile_picture",
  "profilePicture",
  "profile_photo",
  "profilePhoto",
  "picture",
  "image",
  "image_url",
  "imageUrl",
];

// Hanapin ang larawan sa user mismo at sa mga nested object (member / profile)
const pickPhoto = (user) => {
  if (!user) return null;
  const sources = [user, user.member, user.profile, user.user];
  for (const src of sources) {
    if (!src || typeof src !== "object") continue;
    for (const key of PHOTO_KEYS) {
      const val = src[key];
      if (typeof val === "string" && val.trim()) return val;
    }
  }
  return null;
};

// Avatar na may fallback sa initials kapag walang larawan o hindi ma-load
function UserAvatar({ user }) {
  const photo = pickPhoto(user);
  const [failed, setFailed] = useState(false);

  // i-reset ang error kapag nagbago ang larawan
  useEffect(() => {
    setFailed(false);
  }, [photo]);

  return (
    <span className="sb-avatar" aria-hidden="true">
      {photo && !failed ? (
        <img
          src={photo}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
        />
      ) : (
        initialsOf(user?.name)
      )}
    </span>
  );
}

export default function RoleLayout({ role }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const menu = roleMenus[role];
  const [open, setOpen] = useState(false); // mobile drawer

  const doLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const linkClass = ({ isActive }) => (isActive ? "active" : "");

  // isara ang drawer kapag lumipat ng page
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Escape para isara + i-lock ang scroll ng page habang bukas ang drawer
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const roleTitle = t(`menu.title.${role}`, { defaultValue: menu.title });

  return (
    <div className="shell">
      <aside id="app-sidebar" className={`sidebar${open ? " open" : ""}`} aria-label="Main navigation">
        <div className="brand">
          <img src="/logo.png" alt="River of Life Calapan logo" width={36} height={36} />
          <span>River of Life</span>
          <button
            type="button"
            className="sb-close"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav>
          <NavLink to={menu.base} end className={linkClass}>
            <Icon name="dashboard" />
            <span>{t("common.dashboard")}</span>
          </NavLink>

          {menu.items.map((i) => (
            <NavLink key={i.path} to={`${menu.base}/${i.path}`} className={linkClass}>
              <Icon name={getMenuIcon(i)} />
              <span>{t(`menu.label.${role}.${i.path}`, { defaultValue: i.label })}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sb-footer">
          <div className="sb-user">
            <UserAvatar user={user} />
            <div className="sb-user-text">
              <strong title={user?.name}>{user?.name}</strong>
              <small title={roleTitle}>{roleTitle}</small>
            </div>
          </div>
          <button type="button" className="sb-logout" onClick={doLogout}>
            <LogOut size={16} aria-hidden="true" />
            <span>{t("common.logout")}</span>
          </button>
        </div>
      </aside>

      {open && <div className="sb-overlay" onClick={() => setOpen(false)} aria-hidden="true" />}

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="menu-btn"
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="app-sidebar"
              onClick={() => setOpen(true)}
            >
              <Menu size={20} aria-hidden="true" />
            </button>
            <span className="topbar-title">{roleTitle}</span>
          </div>
          <div className="topbar-right">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>

      {role === "member" && <ChatWidget userId={user?.id} />}
    </div>
  );
}