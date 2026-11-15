// frontend/src/components/PortalShell.jsx
// Iisang shell para sa lahat ng portal (Admin, Staff, Ministry Leader, Member).
//   - Admin / Staff / Ministry: kaliwang sidebar (itim) na may sliding na indicator, collapsible sa desktop, drawer sa mobile
//   - Member: ibang disenyo: top navigation + bottom tab bar sa phone
// Ang styles ay nasa ./portal-ui.css
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Ellipsis,
  HandHeart,
  HandHelping,
  HeartHandshake,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MapPin,
  Megaphone,
  Menu,
  Mic,
  Plus,
  QrCode,
  User,
  UsersRound,
  Wallet,
  X,
  BarChart3,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";
import { Avatar, todayLabel } from "./DashKit";
import "./portal-ui.css";

/* path (dulo ng URL) -> icon */
const ICONS = {
  "": LayoutDashboard,
  profile: User,
  users: KeyRound,
  members: UsersRound,
  ministries: HeartHandshake,
  events: CalendarDays,
  announcements: Megaphone,
  giving: Wallet,
  attendance: ClipboardCheck,
  reports: BarChart3,
  prayers: HandHeart,
  notifications: Bell,
  qr: QrCode,
  geofence: MapPin,
  schedules: Clock,
  schedule: CalendarDays,
  sermons: Mic,
  volunteers: HandHelping,
  activities: ClipboardList,
  "add-ministry": Plus,
  checkin: MapPin,
};

/* Pagpapangkat ng menu (susi = dulo ng URL). Ang hindi nakalista ay mapupunta sa "More". */
const GROUPS = {
  admin: [
    ["Overview", ["", "profile"]],
    ["People", ["users", "members", "ministries"]],
    ["Church life", ["events", "announcements", "attendance", "giving", "prayers", "reports", "notifications"]],
  ],
  staff: [
    ["Overview", ["", "profile"]],
    ["Records", ["members", "qr", "attendance", "giving"]],
    ["Church life", ["events", "announcements", "schedules", "geofence", "sermons", "reports", "notifications"]],
  ],
  ministry_leader: [
    ["Overview", ["", "profile"]],
    ["Ministry", ["schedule", "members", "volunteers", "activities", "add-ministry"]],
    ["Church life", ["events", "attendance", "notifications"]],
  ],
  member: [
    ["Overview", ["", "profile"]],
    ["Church life", ["events", "ministries", "prayers", "announcements", "sermons", "notifications"]],
    ["Check-in", ["qr", "checkin"]],
  ],
};

const lastSeg = (to, base) => to.replace(base, "").replace(/^\//, "");

const isMobile = () => typeof window !== "undefined" && window.matchMedia?.("(max-width: 900px)").matches;

/**
 * props:
 *  variant   "admin" | "staff" | "ministry_leader" | "member"
 *  base      "/admin" ...
 *  roleTitle "Admin Portal" ...
 *  items     [{ to, label, end?, badge? }]  (kasama ang Dashboard bilang una)
 *  user, photo, onLogout, unread, toast, onToast, labels{menu,close,logout,...}
 */
export default function PortalShell({ variant, base, roleTitle, items, user, photo, onLogout, unread = 0, toast, onToast, afterMain, tt = (s) => s }) {
  const location = useLocation();
  const [open, setOpen] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("pd_collapsed") === "1";
    } catch {
      return false;
    }
  });
  const [confirm, setConfirm] = useState(false);
  const [more, setMore] = useState(false);
  const navRef = useRef(null);
  const [ind, setInd] = useState({ y: 0, h: 0, on: false });
  const isMember = variant === "member";

  // pangkatin ang items
  const groups = (() => {
    const spec = GROUPS[variant] || [["Menu", []]];
    const used = new Set();
    const out = spec
      .map(([label, keys]) => {
        const its = keys
          .map((k) => {
            const it = items.find((i) => lastSeg(i.to, base) === k);
            if (it) used.add(it.to);
            return it && { ...it, key: k };
          })
          .filter(Boolean);
        return { label, items: its };
      })
      .filter((g) => g.items.length);
    const rest = items.filter((i) => !used.has(i.to)).map((i) => ({ ...i, key: lastSeg(i.to, base) }));
    if (rest.length) out.push({ label: "More", items: rest });
    return out;
  })();

  const current =
    [...items]
      .sort((a, b) => b.to.length - a.to.length)
      .find((i) => location.pathname === i.to || location.pathname.startsWith(i.to + "/")) || items[0];

  // slide ng indicator papunta sa active na link
  const measure = useCallback(() => {
    const nav = navRef.current;
    const a = nav?.querySelector("a.active");
    if (!nav || !a || a.offsetParent === null) return setInd((v) => (v.on ? { ...v, on: false } : v));
    const nr = nav.getBoundingClientRect();
    const ar = a.getBoundingClientRect();
    setInd({ y: Math.round(ar.top - nr.top + nav.scrollTop), h: Math.round(ar.height), on: true });
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [location.pathname, collapsed, open, measure, unread]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    document.fonts?.ready?.then(measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  // isara ang drawer/menus kapag lumipat ng page
  useEffect(() => {
    setOpen(false);
    setMore(false);
  }, [location.pathname]);

  // Esc + i-lock ang scroll habang bukas ang drawer
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!confirm) return undefined;
    const onKey = (e) => e.key === "Escape" && setConfirm(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirm]);

  // isara ang "More" kapag nag-click sa labas
  useEffect(() => {
    if (!more) return undefined;
    const close = (e) => !e.target.closest?.(".mb-more") && setMore(false);
    const onKey = (e) => e.key === "Escape" && setMore(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [more]);

  const toggleMenu = () => {
    if (isMobile()) return setOpen(true);
    setCollapsed((c) => {
      try {
        localStorage.setItem("pd_collapsed", c ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !c;
    });
  };

  const askLogout = () => {
    setOpen(false);
    setMore(false);
    setConfirm(true);
  };

  const notifTo = `${base}/notifications`;
  const linkClass = ({ isActive }) => (isActive ? "active" : "");

  const bell = (
    <Link to={notifTo} className="tb-bell" aria-label={unread > 0 ? `${tt("Notifications")} (${unread})` : tt("Notifications")}>
      <Bell size={18} strokeWidth={1.75} aria-hidden="true" />
      {unread > 0 && <b>{unread > 99 ? "99+" : unread}</b>}
    </Link>
  );

  /* ---------- Sidebar (drawer din ito sa mobile, kasama sa Member) ---------- */
  const sidebar = (
    <aside id="app-sidebar" className={`sb${open ? " open" : ""}`} aria-label="Main navigation">
      <div className="sb-brand">
        <img src="/logo.png" alt="River of Life Calapan logo" width={36} height={36} />
        <div className="sb-brand-text">
          <strong>River of Life</strong>
          <small>{roleTitle}</small>
        </div>
        <button type="button" className="sb-close" aria-label={tt("Close menu")} onClick={() => setOpen(false)}>
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <nav className="sb-nav" ref={navRef}>
        <i className="sb-ind" aria-hidden="true" style={{ transform: `translateY(${ind.y}px)`, height: ind.h, opacity: ind.on ? 1 : 0 }} />
        {groups.map((g) => (
          <div className="sb-group" key={g.label}>
            <p className="sb-glabel">{tt(g.label)}</p>
            {g.items.map((it) => {
              const Icon = ICONS[it.key] || LayoutDashboard;
              return (
                <NavLink key={it.to} to={it.to} end={it.end} className={linkClass} title={it.label}>
                  <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                  <span>{it.label}</span>
                  {it.badge ? <em className="sb-badge">{it.badge}</em> : null}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sb-foot">
        <div className="sb-user">
          <Avatar src={photo} name={user?.name} size={38} />
          <div className="sb-user-text">
            <strong title={user?.name}>{user?.name}</strong>
            <small title={roleTitle}>{roleTitle}</small>
          </div>
        </div>
        <button type="button" className="sb-logout" onClick={askLogout}>
          <LogOut size={16} aria-hidden="true" />
          <span>{tt("Log out")}</span>
        </button>
      </div>
    </aside>
  );

  /* ---------- Member: top navigation ---------- */
  const primaryKeys = ["", "events", "ministries", "prayers", "announcements"];
  const primary = primaryKeys.map((k) => items.find((i) => lastSeg(i.to, base) === k)).filter(Boolean);
  const overflow = items.filter((i) => !primary.includes(i));
  const tabKeys = ["", "events", "qr", "prayers"];
  const tabs = tabKeys.map((k) => items.find((i) => lastSeg(i.to, base) === k)).filter(Boolean);

  const memberTop = (
    <header className="mb-top">
      <Link to={base} className="mb-brand" aria-label="River of Life Calapan">
        <img src="/logo.png" alt="" width={34} height={34} />
        <span>
          River of Life <em>Calapan</em>
        </span>
      </Link>

      <nav className="mb-nav" aria-label="Main navigation">
        {primary.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.end} className={linkClass}>
            {it.label}
          </NavLink>
        ))}
        <div className="mb-more">
          <button type="button" aria-expanded={more} aria-haspopup="true" onClick={() => setMore((m) => !m)}>
            {tt("More")}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div className={`mb-pop${more ? " on" : ""}`} role="menu">
            {overflow.map((it) => {
              const Icon = ICONS[lastSeg(it.to, base)] || LayoutDashboard;
              return (
                <NavLink key={it.to} to={it.to} role="menuitem" tabIndex={more ? 0 : -1} className={linkClass}>
                  <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                  {it.label}
                </NavLink>
              );
            })}
            <button type="button" role="menuitem" tabIndex={more ? 0 : -1} onClick={askLogout}>
              <LogOut size={16} aria-hidden="true" />
              {tt("Log out")}
            </button>
          </div>
        </div>
      </nav>

      <div className="mb-right">
        {bell}
        <ThemeToggle />
        <LanguageSwitcher />
        <Link to={`${base}/profile`} className="mb-me" aria-label={tt("My Profile")}>
          <Avatar src={photo} name={user?.name} size={36} />
        </Link>
        <button type="button" className="menu-btn" aria-label={tt("Open menu")} aria-expanded={open} aria-controls="app-sidebar" onClick={() => setOpen(true)}>
          <Menu size={20} aria-hidden="true" />
        </button>
      </div>
    </header>
  );

  const memberTabs = (
    <nav className="mb-tabs" aria-label="Quick navigation">
      {tabs.map((it) => {
        const k = lastSeg(it.to, base);
        const Icon = ICONS[k] || LayoutDashboard;
        return (
          <NavLink key={it.to} to={it.to} end={it.end} className={`${linkClass({ isActive: location.pathname === it.to || (k && location.pathname.startsWith(it.to + "/")) })}${k === "qr" ? " is-qr" : ""}`}>
            <span className="mb-tab-ico">
              <Icon size={k === "qr" ? 22 : 20} strokeWidth={1.75} aria-hidden="true" />
            </span>
            <span className="mb-tab-lbl">{it.label}</span>
          </NavLink>
        );
      })}
      <button type="button" onClick={() => setOpen(true)} aria-label={tt("Open menu")}>
        <span className="mb-tab-ico">
          <Ellipsis size={20} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <span className="mb-tab-lbl">{tt("Menu")}</span>
      </button>
    </nav>
  );

  return (
    <div className={`shell pd-shell${collapsed ? " is-collapsed" : ""}${isMember ? " is-member" : ""}`} data-variant={variant}>
      {sidebar}
      {open && <div className="sb-overlay" onClick={() => setOpen(false)} aria-hidden="true" />}

      <div className="main">
        {isMember ? (
          memberTop
        ) : (
          <header className="tb">
            <div className="tb-left">
              <button type="button" className="menu-btn tb-menu" aria-label={tt("Menu")} aria-expanded={open} aria-controls="app-sidebar" onClick={toggleMenu}>
                <Menu size={20} aria-hidden="true" />
              </button>
              <div className="tb-title">
                <small>{roleTitle}</small>
                <p>{current?.label}</p>
              </div>
            </div>
            <div className="tb-right">
              <span className="tb-date">{todayLabel()}</span>
              {bell}
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
          </header>
        )}

        <main className="content" key={location.pathname.split("/")[2] || "home"}>
          <Outlet />
        </main>

        {afterMain}
        {toast && (
          <button type="button" className="toast pd-toast" onClick={onToast}>
            <strong>{toast.title || tt("New notification")}</strong>
            {toast.message && <p>{toast.message}</p>}
          </button>
        )}
      </div>

      {isMember && memberTabs}

      {confirm && (
        <div className="modal" onClick={() => setConfirm(false)}>
          <div className="modal-card" role="alertdialog" aria-modal="true" aria-labelledby="logout-title" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <h3 id="logout-title">{tt("Log out?")}</h3>
            <p>{tt("Are you sure you want to log out?")}</p>
            <div className="modal-actions">
              <button type="button" className="btn secondary" autoFocus onClick={() => setConfirm(false)}>
                {tt("Cancel")}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setConfirm(false);
                  onLogout();
                }}
              >
                {tt("Yes, log out")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
