import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase.js";
import { useLanguage } from "../i18n.jsx";

export default function LogoutButton() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut(auth);
    navigate("/");
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        background: "transparent",
        border: "1px solid var(--line)",
        borderRadius: 20,
        padding: "6px 14px",
        fontSize: 12,
        fontWeight: 600,
        color: "var(--text-muted)",
      }}
    >
      {t("logoutBtn")}
    </button>
  );
}
