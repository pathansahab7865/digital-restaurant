import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { auth, db } from "../firebase.js";
import { ADMIN_EMAIL } from "../config.js";
import { useLanguage } from "../i18n.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";

export default function AdminPanel() {
  const { t } = useLanguage();
  const [restaurants, setRestaurants] = useState([]);
  const isAdmin = auth.currentUser?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, "restaurants"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setRestaurants(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [isAdmin]);

  async function handleActivate(id) {
    await updateDoc(doc(db, "restaurants", id), { status: "active" });
  }

  function statusLabel(status) {
    if (status === "active") return t("statusActive");
    if (status === "pending_verification") return t("statusPendingVerification");
    return t("statusPendingPayment");
  }

  if (!isAdmin) {
    return (
      <div className="screen" style={{ textAlign: "center", paddingTop: 100 }}>
        <LanguageToggle />
        <p className="muted">{t("adminNoAccess")}</p>
      </div>
    );
  }

  return (
    <div className="screen" style={{ maxWidth: 560 }}>
      <LanguageToggle />
      <h1 style={{ fontSize: 24, marginBottom: 18 }}>{t("adminPanelTitle")}</h1>

      {restaurants.length === 0 && <p className="muted">{t("noRestaurantsYet")}</p>}

      {restaurants.map((r) => (
        <div key={r.id} className="card" style={{ marginBottom: 10, padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: 16 }}>{r.restaurantName}</div>
              <div className="muted" style={{ fontSize: 12 }}>{r.ownerEmail}</div>
              {r.upiId && <div className="muted" style={{ fontSize: 12 }}>UPI: {r.upiId}</div>}
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 12, whiteSpace: "nowrap",
              background: r.status === "active" ? "#BFE3C0" : r.status === "pending_verification" ? "var(--turmeric)" : "#E3B8B8",
              color: "var(--ink)",
            }}>
              {statusLabel(r.status)}
            </span>
          </div>
          {r.status !== "active" && (
            <button
              onClick={() => handleActivate(r.id)}
              className="btn-primary"
              style={{ marginTop: 10 }}
            >
              {t("activateBtn")}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
