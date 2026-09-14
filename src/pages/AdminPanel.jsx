import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase.js";
import { ADMIN_EMAIL, SUBSCRIPTION_PRICE } from "../config.js";
import { useLanguage } from "../i18n.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";
import LogoutButton from "../components/LogoutButton.jsx";

export default function AdminPanel() {
  const { t } = useLanguage();
  const [restaurants, setRestaurants] = useState([]);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // पेज सीधे खोलने पर Firebase को लॉगिन स्टेटस पता करने में एक पल लगता है —
  // उसका इंतज़ार करना ज़रूरी है, वरना गलती से "access नहीं" दिख जाता है
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setIsAdmin(user?.email === ADMIN_EMAIL);
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, "restaurants"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setRestaurants(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [isAdmin]);

  async function handleActivate(id) {
    await updateDoc(doc(db, "restaurants", id), { status: "active", activatedAt: serverTimestamp() });
  }

  // महीने के हिसाब से बाकी दिन निकालना (30 दिन का साइकल मानकर)
  function renewalInfo(restaurant) {
    if (!restaurant.activatedAt?.toDate) return null;
    const activated = restaurant.activatedAt.toDate();
    const now = new Date();
    const daysSinceActivation = Math.floor((now - activated) / (1000 * 60 * 60 * 24));
    const cyclesPassed = Math.floor(daysSinceActivation / 30);
    const daysIntoCycle = daysSinceActivation - cyclesPassed * 30;
    const daysLeft = 30 - daysIntoCycle;
    return daysLeft;
  }

  function buildReminderMailto(restaurant) {
    const subject = encodeURIComponent(`${restaurant.restaurantName} — Subscription Renewal`);
    const body = encodeURIComponent(
      `Hi ${restaurant.restaurantName},\n\nYour ₹${SUBSCRIPTION_PRICE}/month subscription is due for renewal soon. Please make the payment to keep your digital menu and QR ordering active.\n\nThanks!`
    );
    return `mailto:${restaurant.ownerEmail}?subject=${subject}&body=${body}`;
  }

  function statusLabel(status) {
    if (status === "active") return t("statusActive");
    if (status === "pending_verification") return t("statusPendingVerification");
    return t("statusPendingPayment");
  }

  if (!authChecked) {
    return <div className="screen" />; // लोडिंग के दौरान खाली — गलत मैसेज दिखने से बचाने के लिए
  }

  if (!isAdmin) {
    return (
      <div className="screen" style={{ textAlign: "center", paddingTop: 100 }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 20 }}>
          <LogoutButton />
          <LanguageToggle />
        </div>
        <p className="muted">{t("adminNoAccess")}</p>
      </div>
    );
  }

  return (
    <div className="screen" style={{ maxWidth: 560 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
        <LogoutButton />
        <LanguageToggle />
      </div>
      <h1 style={{ fontSize: 24, marginBottom: 18 }}>{t("adminPanelTitle")}</h1>

      {restaurants.length === 0 && <p className="muted">{t("noRestaurantsYet")}</p>}

      {restaurants.map((r) => {
        const daysLeft = r.status === "active" ? renewalInfo(r) : null;
        const isDueSoon = daysLeft !== null && daysLeft <= 7;
        return (
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

            {daysLeft !== null && (
              <div style={{
                marginTop: 10, fontSize: 12.5, fontWeight: 600,
                color: isDueSoon ? "var(--chili)" : "#6B6552",
              }}>
                {t("renewalDueLabel")}: {daysLeft <= 0 ? t("expiredLabel") : `${daysLeft} ${t("daysLeftLabel")}`}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {r.status !== "active" && (
                <button onClick={() => handleActivate(r.id)} className="btn-primary" style={{ flex: 1 }}>
                  {t("activateBtn")}
                </button>
              )}
              {isDueSoon && (
                <a
                  href={buildReminderMailto(r)}
                  style={{
                    flex: 1, textAlign: "center", background: "transparent", border: "1px solid rgba(28,27,25,0.2)",
                    borderRadius: 3, padding: "10px", fontSize: 13, fontWeight: 600, color: "var(--ink)", textDecoration: "none",
                  }}
                >
                  {t("sendReminderBtn")}
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
