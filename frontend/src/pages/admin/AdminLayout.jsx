import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../i18n/LanguageContext";
import useNotifCount from "../../hooks/useNotifCount";
import PortalShell from "../../components/PortalShell";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const links = [
  { to: "/admin", key: "nav.dashboard", end: true },
  { to: "/admin/profile", key: "nav.profile", fallback: "My Profile" },
  { to: "/admin/users", key: "nav.users" },
  { to: "/admin/members", key: "nav.members" },
  { to: "/admin/ministries", key: "nav.ministries" },
  { to: "/admin/events", key: "nav.events" },
  { to: "/admin/announcements", key: "nav.announcements", fallback: "Announcements" },
  { to: "/admin/giving", key: "nav.giving" },
  { to: "/admin/attendance", key: "nav.attendanceRecording", fallback: "Attendance" },
  { to: "/admin/reports", key: "nav.reportsAnalytics", fallback: "Reports & Analytics" },
  { to: "/admin/prayers", key: "nav.prayers" },
  { to: "/admin/notifications", key: "nav.notifications", fallback: "Notifications" },
];

export default function AdminLayout() {
  const { t } = useTranslation();
  const { t: tr } = useLang();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { unread, toast, dismiss, markSeen } = useNotifCount(user?.id);

  // Kapag nasa Notifications page, ituring na nabasa na
  useEffect(() => {
    if (location.pathname === "/admin/notifications" && unread > 0) markSeen();
  }, [location.pathname, unread, markSeen]);

  const items = links.map((l) => ({
    to: l.to,
    end: l.end,
    label: l.fallback ? t(l.key, l.fallback) : t(l.key),
    badge: l.to === "/admin/notifications" && unread > 0 ? (unread > 99 ? "99+" : unread) : null,
  }));

  return (
    <PortalShell
      variant="admin"
      base="/admin"
      roleTitle={t("menu.title.admin", { defaultValue: "Admin Portal" })}
      items={items}
      user={user}
      photo={user?.photo ? `${API_BASE}/avatar?f=${encodeURIComponent(user.photo)}` : ""}
      unread={unread}
      toast={toast}
      onToast={() => {
        dismiss();
        navigate("/admin/notifications");
      }}
      onLogout={() => {
        logout();
        navigate("/login", { replace: true });
      }}
      tt={(s) => (s === "Log out" ? t("common.logout") : tr(s))}
    />
  );
}
