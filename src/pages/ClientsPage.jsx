import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.js";
import { useLanguage } from "../i18n.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";

function timeSince(timestamp, t) {
  if (!timestamp?.toDate) return "";
  const then = timestamp.toDate();
  const now = new Date();
  const days = Math.floor((now - then) / (1000 * 60 * 60 * 24));

  if (days < 1) return t("todayLabel");
  if (days < 30) return `${days} ${t("daysAgo")}`;
  if (days < 365) return `${Math.floor(days / 30)} ${t("monthsAgo")}`;
  return `${Math.floor(days / 365)} ${t("yearsAgo")}`;
}

export default function ClientsPage() {
  const { t } = useLanguage();
  const [restaurants, setRestaurants] = useState([]);

  useEffect(() => {
    // सिर्फ "active" (पेमेंट वेरिफाई हो चुके) रेस्टोरेंट्स ही पब्लिक लिस्ट में दिखेंगे
    const q = query(
      collection(db, "restaurants"),
      where("status", "==", "active"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setRestaurants(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  return (
    <div className="screen" style={{ maxWidth: 560 }}>
      <LanguageToggle />
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, marginBottom: 6 }}>{t("clientsPageTitle")}</h1>
        <p className="muted" style={{ fontSize: 13.5 }}>{t("clientsPageSubtitle")}</p>
      </div>

      {restaurants.length === 0 && <p className="muted">{t("noClientsYet")}</p>}

      {restaurants.map((r) => (
        <div key={r.id} className="card" style={{ marginBottom: 10, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: 16 }}>{r.restaurantName}</div>
          <div style={{ fontSize: 12, color: "#6B6552", whiteSpace: "nowrap" }}>
            {t("joinedSinceLabel")}: <b style={{ color: "var(--chili)" }}>{timeSince(r.createdAt, t)}</b>
          </div>
        </div>
      ))}
    </div>
  );
}
