// frontend/src/pages/RoleDashboard.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { roleMenus } from "../config/roleMenus";
import TranslatedText from "../components/TranslatedText";

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
              <span><TranslatedText text={s.label} /></span>
              <strong>{s.value}</strong>
            </div>
          ))}
        </div>
      )}

      <div className="cards">
        {menu.items.map((i) => (
          <Link key={i.path} to={`${menu.base}/${i.path}`} className="card" style={{ textDecoration: "none", color: "inherit" }}>
            <strong style={{ fontSize: 16 }}>
              {t(`menu.label.${role}.${i.path}`, { defaultValue: i.label })}
            </strong>
            <span>{t(`menu.desc.${role}.${i.path}`, { defaultValue: i.desc })}</span>
          </Link>
        ))}
      </div>
    </>
  );
}