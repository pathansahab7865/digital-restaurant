import { useLanguage } from "../i18n.jsx";

export default function LanguageToggle() {
  const { lang, setLang, t } = useLanguage();

  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 20,
          padding: "4px 6px",
        }}
      >
        <span className="muted" style={{ fontSize: 11, paddingLeft: 6 }}>
          {t("languageLabel")}
        </span>
        <button
          onClick={() => setLang("hi")}
          style={{
            border: "none",
            borderRadius: 14,
            padding: "5px 10px",
            fontSize: 12.5,
            fontWeight: 600,
            background: lang === "hi" ? "var(--turmeric)" : "transparent",
            color: lang === "hi" ? "var(--ink)" : "var(--text-muted)",
          }}
        >
          हिंदी
        </button>
        <button
          onClick={() => setLang("en")}
          style={{
            border: "none",
            borderRadius: 14,
            padding: "5px 10px",
            fontSize: 12.5,
            fontWeight: 600,
            background: lang === "en" ? "var(--turmeric)" : "transparent",
            color: lang === "en" ? "var(--ink)" : "var(--text-muted)",
          }}
        >
          English
        </button>
      </div>
    </div>
  );
}
