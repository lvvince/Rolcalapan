import { useState } from "react";
import DataPage from "../../components/DataPage";
import NotificationsView from "../../components/Notifications";
import { useLang } from "../../i18n/LanguageContext";
import "../../components/portal.css";

export function AdminMinistries() {
  const { t } = useLang();
  return (
    <>
      <h2>{t("Ministries & Small Groups")}</h2>
      <DataPage
        title={t("Ministries & Groups")}
        resource="ministries"
        addLabel={t("Ministry")}
        lookups={{
          leaders: {
            resource: "users",
            label: (u) => u.full_name,
            filter: (u) => u.role === "ministry_leader",
          },
        }}
        columns={[
          { key: "name", label: t("Name") },
          {
            label: t("Type"),
            render: (r) => (
              <span className="badge">{r.type === "small_group" ? t("Small group") : t("Ministry")}</span>
            ),
          },
          { key: "description", label: t("Description") },
          { label: t("Leader"), render: (r) => r.leader_name || "—" },
        ]}
        fields={[
          { key: "name", label: t("Name"), required: true },
          {
            key: "type",
            label: t("Type"),
            type: "select",
            required: true,
            options: [
              { value: "ministry", label: t("Ministry") },
              { value: "small_group", label: t("Small group (cell group)") },
            ],
          },
          { key: "description", label: t("Description"), type: "textarea" },
          { key: "leader_user_id", label: t("Leader (Ministry Leader account)"), type: "select", lookup: "leaders" },
        ]}
        defaults={{ type: "ministry" }}
      />
    </>
  );
}

// ---- Prayer requests: Open / Prayed / Archived / All, with Archive instead of Delete ----
const statusOf = (r) => String(r.status || "open").toLowerCase();
const isArchived = (r) => statusOf(r) === "archived";
const isDone = (r) => ["prayed", "answered"].includes(statusOf(r));
const statusRank = (r) => {
  const s = statusOf(r);
  return s === "archived" ? 3 : s === "answered" ? 2 : s === "prayed" ? 1 : 0;
};
const isHot = (r) =>
  r.priority === "urgent" || Number(r.needs_review) === 1 || r.urgency === "high";

// open muna, tapos prayed, answered, archived; sa loob ng bawat grupo, urgent/needs review ang nauuna, bago ang pinakabago
const sortPrayers = (a, b) =>
  statusRank(a) - statusRank(b) ||
  Number(isHot(b)) - Number(isHot(a)) ||
  Number(b.id) - Number(a.id);

export function AdminPrayers() {
  const { t } = useLang();
  const [view, setView] = useState("open"); // open | done | archived | all

  const filter = (r) => {
    if (view === "open") return !isDone(r) && !isArchived(r);
    if (view === "done") return isDone(r);
    if (view === "archived") return isArchived(r);
    return !isArchived(r); // "All" hides archived
  };

  const tabs = [
    { key: "open", label: t("Open") },
    { key: "done", label: t("Prayed / Answered") },
    { key: "archived", label: t("Archived") },
    { key: "all", label: t("All") },
  ];

  const emptyText =
    view === "open"
      ? t("No open prayer requests")
      : view === "archived"
      ? t("No archived prayer requests")
      : t("No records yet.");

  return (
    <>
      <h2>{t("Prayer Requests")}</h2>
      <div style={{ display: "flex", gap: 8, margin: "0 0 12px", flexWrap: "wrap" }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`btn sm ${view === tab.key ? "" : "secondary"}`}
            onClick={() => setView(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <DataPage
        title={t("Prayer Requests")}
        resource="prayer_requests"
        canCreate={false}
        canDelete={false}
        filter={filter}
        sortRows={sortPrayers}
        emptyText={emptyText}
        rowActions={(r, { patch }) => {
          if (isDone(r)) {
            return (
              <button
                type="button"
                className="btn sm secondary"
                onClick={() => patch({ status: "archived" })}
              >
                {t("Archive")}
              </button>
            );
          }
          if (isArchived(r)) {
            return (
              <button
                type="button"
                className="btn sm secondary"
                onClick={() => patch({ status: "prayed" })}
              >
                {t("Restore")}
              </button>
            );
          }
          return null;
        }}
        columns={[
          { key: "created_at", label: t("Date") },
          { key: "member_name", label: t("Member") },
          { key: "request", label: t("Request") },
          {
            label: t("Category"),
            render: (r) =>
              r.category ? <span className="badge">{t(r.category)}</span> : "—",
          },
          {
            label: t("Urgency"),
            render: (r) =>
              r.urgency ? (
                <span
                  className={`badge ${r.urgency === "high" ? "bad" : r.urgency === "low" ? "ok" : ""}`}
                  title={
                    r.ai_confidence != null
                      ? `${t("Confidence")}: ${Math.round(Number(r.ai_confidence) * 100)}%`
                      : undefined
                  }
                >
                  {t(r.urgency)}
                </span>
              ) : (
                "—"
              ),
          },
          {
            label: t("Review"),
            render: (r) =>
              Number(r.needs_review) === 1 ? (
                <span className="badge bad">{t("Needs review")}</span>
              ) : (
                ""
              ),
          },
          {
            label: t("Priority"),
            render: (r) => (
              <span className={`badge ${r.priority === "urgent" ? "bad" : ""}`}>{t(r.priority || "general")}</span>
            ),
          },
          {
            label: t("Status"),
            render: (r) => (
              <span className={`badge ${r.status === "prayed" || r.status === "answered" ? "ok" : ""}`}>
                {t(r.status || "open")}
              </span>
            ),
          },
        ]}
        fields={[
          {
            key: "priority",
            label: t("Priority"),
            type: "select",
            options: [
              { value: "general", label: t("General") },
              { value: "urgent", label: t("Urgent") },
            ],
          },
          {
            key: "status",
            label: t("Follow-up status"),
            type: "select",
            options: [
              { value: "open", label: t("Open") },
              { value: "prayed", label: t("Prayed / followed up") },
              { value: "answered", label: t("Answered") },
              { value: "archived", label: t("Archived") },
            ],
          },
        ]}
      />
    </>
  );
}

export function AdminNotifications() {
  const { t } = useLang();
  const [k, setK] = useState(0);
  return (
    <>
      <h2>{t("Notifications")}</h2>
      <DataPage
        title={t("Sent Notifications")}
        resource="notifications"
        addLabel={t("Send")}
        canEdit={false}
        canDelete
        refreshKey={k}
        lookups={{ users: { resource: "users", label: (u) => `${u.full_name} (${u.role})` } }}
        columns={[
          { key: "title", label: t("Title") },
          { key: "message", label: t("Message") },
          { label: t("To"), render: (r) => r.recipient_name || t("Everyone") },
          { key: "created_at", label: t("Sent") },
        ]}
        fields={[
          { key: "user_id", label: t("Recipient (blank = everyone)"), type: "select", lookup: "users" },
          { key: "title", label: t("Title"), required: true },
          { key: "message", label: t("Message"), type: "textarea", required: true },
        ]}
      />
      <NotificationsView refreshKey={k} />
      <button className="btn secondary sm" onClick={() => setK(k + 1)}>{t("Refresh")}</button>
    </>
  );
}