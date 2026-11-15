// frontend/src/components/RoleLayout.jsx
// Layout para sa Secretary, Ministry Leader, at Member. Ang itsura ay nasa PortalShell (Member ay may sariling disenyo).
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../i18n/LanguageContext";
import { roleMenus } from "../config/roleMenus";
import useNotifCount from "../hooks/useNotifCount";
import ChatWidget from "./ChatWidget";
import PortalShell from "./PortalShell";

// Staff menu: hiwalay na "Events & Schedules" at "Announcements".
// - kung wala pang Announcements, idinadagdag sa ilalim ng Events
// - ang Events ay may bagong translation key (events_schedules)
const buildItems = (role, items) => {
  if (role !== "staff") return items;

  const next = items.map((i) =>
    i.path === "events" ? { ...i, label: "Events & Schedules", key: "events_schedules" } : i
  );

  if (!next.some((i) => i.path === "announcements")) {
    const at = next.findIndex((i) => i.path === "events");
    next.splice(at >= 0 ? at + 1 : next.length, 0, {
      path: "announcements",
      label: "Announcements",
    });
  }
  return next;
};

export default function RoleLayout({ role }) {
  const { t } = useTranslation();
  const { t: tr } = useLang();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const menu = roleMenus[role];
  const [memberPic, setMemberPic] = useState(null);
  const { unread, markSeen } = useNotifCount(user?.id); // pop-up ay hawak ng global NotifToast

  // Kunin ang larawan galing sa /portal/me (doon naka-save ang profile_pic).
  // Nagre-refresh kapag lumipat ng page, para makita agad ang bagong upload.
  useEffect(() => {
    let cancelled = false;
    api
      .get("/portal/me")
      .then((r) => {
        if (!cancelled) setMemberPic(r.data?.member?.profile_pic || null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  // Kapag nasa Notifications page, ituring na nabasa na
  useEffect(() => {
    if (location.pathname === `${menu.base}/notifications` && unread > 0) markSeen();
  }, [location.pathname, unread, markSeen, menu.base]);

  const roleTitle = t(`menu.title.${role}`, { defaultValue: menu.title });

  const items = [
    { to: menu.base, end: true, label: t("common.dashboard") },
    ...buildItems(role, menu.items).map((i) => ({
      to: `${menu.base}/${i.path}`,
      label: t(`menu.label.${role}.${i.key || i.path}`, { defaultValue: i.label }),
      badge: i.path === "notifications" && unread > 0 ? (unread > 99 ? "99+" : unread) : null,
    })),
  ];

  return (
    <PortalShell
      variant={role}
      base={menu.base}
      roleTitle={roleTitle}
      items={items}
      user={user}
      photo={memberPic || user?.profile_pic || user?.photo}
      unread={unread}
      onLogout={() => {
        logout();
        navigate("/login", { replace: true });
      }}
      afterMain={role === "member" ? <ChatWidget userId={user?.id} /> : null}
      tt={(s) => (s === "Log out" ? t("common.logout") : tr(s))}
    />
  );
}
