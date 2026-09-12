import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { collection, query, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import { useLanguage } from "../i18n.jsx";

export default function PublicMenu() {
  const { uid } = useParams();
  const { t } = useLanguage();
  const [restaurant, setRestaurant] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRestaurant() {
      const snap = await getDoc(doc(db, "restaurants", uid));
      if (snap.exists()) setRestaurant(snap.data());
      setLoading(false);
    }
    loadRestaurant();

    const q = query(collection(db, "restaurants", uid, "menuItems"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [uid]);

  if (loading) {
    return (
      <div className="screen" style={{ textAlign: "center", paddingTop: 100 }}>
        <p className="muted">{t("publicMenuLoading")}</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="screen" style={{ textAlign: "center", paddingTop: 100 }}>
        <p className="muted">{t("publicMenuNotFound")}</p>
      </div>
    );
  }

  const grouped = items.reduce((acc, item) => {
    const cat = item.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="screen" style={{ maxWidth: 480 }}>
      <div style={{ textAlign: "center", marginBottom: 24, paddingTop: 10 }}>
        <h1 style={{ fontSize: 26 }}>{restaurant.restaurantName}</h1>
      </div>

      {items.length === 0 && (
        <p className="muted" style={{ textAlign: "center" }}>{t("publicMenuEmpty")}</p>
      )}

      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat} style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: "Fraunces, serif", fontStyle: "italic", color: "var(--turmeric)", fontSize: 16, marginBottom: 10 }}>
            {cat}
          </div>
          {catItems.map((item) => (
            <div key={item.id} className="card" style={{ marginBottom: 10, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: 16 }}>{item.name}</div>
                {item.price != null && (
                  <div style={{ color: "var(--chili)", fontWeight: 700, fontSize: 16, whiteSpace: "nowrap" }}>₹{item.price}</div>
                )}
              </div>
              {item.variants?.length > 0 && (
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  {item.variants.map((v, i) => (
                    <span key={i} style={{
                      background: "var(--paper-2)", borderRadius: 20, padding: "4px 10px",
                      fontSize: 12, color: "#6B6552",
                    }}>
                      {v.label}: <b style={{ color: "var(--chili)" }}>₹{v.price}</b>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
