// frontend/src/pages/admin/AdminMembers.jsx
import { useEffect, useState } from "react";
import { UsersRound } from "lucide-react";
import api from "../../api";
import DataPage from "../../components/DataPage";
import { useLang } from "../../i18n/LanguageContext";
import "../../components/portal.css";
import "../secretary/StaffPages.css"; // para sa sp-* styles (search, card, header)

const statusBadge = (s, t) => <span className={`badge ${s === "active" ? "ok" : "warn"}`}>{t(s)}</span>;

export default function AdminMembers() {
  const { t } = useLang();
  const [families, setFamilies] = useState([]);
  const [family, setFamily] = useState("all"); // all | __none | <family name>
  const [q, setQ] = useState("");

  // Listahan ng family names para sa dropdown
  useEffect(() => {
    api.get("/resource", { params: { name: "members" } }).then((r) => {
      const names = [
        ...new Set((r.data || []).map((m) => String(m.family_name || "").trim()).filter(Boolean)),
      ];
      setFamilies(names.sort((a, b) => a.localeCompare(b)));
    });
  }, []);

  const needle = q.trim().toLowerCase();

  const filter = (m) => {
    const fam = String(m.family_name || "").trim();
    if (family === "__none" && fam !== "") return false;
    if (family !== "all" && family !== "__none" && fam !== family) return false;
    if (!needle) return true;
    return [m.member_code, m.full_name, m.family_name, m.phone, m.email].some((v) =>
      String(v ?? "").toLowerCase().includes(needle)
    );
  };

  const hasFilter = family !== "all" || needle !== "";
  const clearAll = () => {
    setFamily("all");
    setQ("");
  };

  return (
    <>
      <div className="sp-head">
        <span className="sp-head-icon"><UsersRound size={22} aria-hidden="true" /></span>
        <div>
          <h2>{t("Members & Family Records")}</h2>
          <p>{t("Add, update, and remove member records.")}</p>
        </div>
      </div>

      <div className="sp-card">
        <div className="sp-row">
          <div className="sp-field grow">
            <label htmlFor="mem-search">{t("Search")}</label>
            <input
              id="mem-search"
              type="search"
              autoComplete="off"
              value={q}
              placeholder={t("Name, code, family, phone, or email")}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="sp-field" style={{ minWidth: 220 }}>
            <label htmlFor="mem-family">{t("Filter by family")}</label>
            <select id="mem-family" value={family} onChange={(e) => setFamily(e.target.value)}>
              <option value="all">{t("All families")}</option>
              <option value="__none">{t("No family")}</option>
              {families.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          {hasFilter && (
            <div className="sp-actions">
              <button className="sp-btn" type="button" onClick={clearAll}>
                {t("Clear")}
              </button>
            </div>
          )}
        </div>
      </div>

      <DataPage
        title={t("Members")}
        resource="members"
        addLabel={t("Member")}
        canDelete
        filter={filter}
        emptyText={hasFilter ? t("No members match your search or filter.") : t("No records yet.")}
        columns={[
          { key: "member_code", label: t("Code") },
          { key: "full_name", label: t("Name") },
          { key: "family_name", label: t("Family") },
          { label: t("Sex"), render: (r) => (r.sex === "male" ? t("Male") : r.sex === "female" ? t("Female") : "—") },
          { key: "phone", label: t("Phone") },
          { key: "email", label: t("Email") },
          { label: t("Status"), render: (r) => statusBadge(r.status, t) },
        ]}
        fields={[
          { key: "full_name", label: t("Full name"), required: true },
          { key: "family_name", label: t("Family name") },
          { key: "phone", label: t("Phone") },
          { key: "email", label: t("Email"), type: "email" },
          { key: "address", label: t("Address") },
          { key: "birthdate", label: t("Birthdate"), type: "date" },
          { key: "sex", label: t("Sex"), type: "select", options: [{ value: "male", label: t("Male") }, { value: "female", label: t("Female") }] },
          { key: "status", label: t("Status"), type: "select", options: [{ value: "active", label: t("Active") }, { value: "inactive", label: t("Inactive") }] },
        ]}
      />
    </>
  );
}