import { useLanguage } from "../i18n.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";

export default function Dashboard() {
  const { t } = useLanguage();
  return (
    <div className="screen">
      <LanguageToggle />
      <h1 style={{ fontSize: 24, marginBottom: 10 }}>{t("dashboardTitle")}</h1>
      <p className="muted">{t("dashboardSubtitle")}</p>
    </div>
  );
}
