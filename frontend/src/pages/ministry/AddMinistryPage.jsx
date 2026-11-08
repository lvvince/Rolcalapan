// frontend/src/pages/ministry/AddMinistryPage.jsx
import { useLang } from "../../i18n/LanguageContext";
import AddMinistry from "./AddMinistry";

export default function AddMinistryPage() {
  const { t } = useLang();
  return (
    <>
      <h2>{t("Add Ministry")}</h2>
      <AddMinistry />
    </>
  );
}