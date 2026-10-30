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

export function AdminPrayers() {
  const { t } = useLang();
  return (
    <>
      <h2>{t("Prayer Requests")}</h2>
      <DataPage
        title={t("Prayer Requests")}
        resource="prayer_requests"
        canCreate={false}
        canDelete={false}
        columns={[
          { key: "created_at", label: t("Date") },
          { key: "member_name", label: t("Member") },
          { key: "request", label: t("Request") },
          {
            label: t("Priority"),
            render: (r) => (
              <span className={`badge ${r.priority === "urgent" ? "bad" : ""}`}>{t(r.priority)}</span>
            ),
          },
          {
            label: t("Status"),
            render: (r) => (
              <span className={`badge ${r.status === "prayed" ? "ok" : ""}`}>{t(r.status)}</span>
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