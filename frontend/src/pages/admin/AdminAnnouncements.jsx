import { Megaphone } from "lucide-react";
import DataPage from "../../components/DataPage";
import { useLang } from "../../i18n/LanguageContext";
import "../../components/portal.css";
import "../secretary/StaffPages.css";

export default function AdminAnnouncements() {
  const { t } = useLang();
  return (
    <>
      <div className="sp-head">
        <span className="sp-head-icon"><Megaphone size={22} aria-hidden="true" /></span>
        <div>
          <h2>{t("Announcements")}</h2>
          <p>{t("Post and manage church announcements.")}</p>
        </div>
      </div>
      <DataPage
        title={t("Announcements")}
        resource="announcements"
        addLabel={t("Announcement")}
        canDelete
        columns={[
          { key: "title", label: t("Title") },
          { key: "body", label: t("Message") },
          { key: "created_at", label: t("Posted") },
        ]}
        fields={[
          { key: "title", label: t("Title"), required: true },
          { key: "body", label: t("Message"), type: "textarea", required: true, rows: 5 },
        ]}
      />
    </>
  );
}