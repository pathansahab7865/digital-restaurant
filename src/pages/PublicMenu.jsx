import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  collection, query, orderBy, onSnapshot, doc, getDoc, addDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase.js";
import { useLanguage } from "../i18n.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";

// हर कार्ट लाइन की unique key: itemId + variant label (या "single")
function cartKey(itemId, variantLabel) {
  return `${itemId}::${variantLabel || "single"}`;
}

export default function PublicMenu() {
  const { uid } = useParams();
  const { t } = useLanguage();
  const [restaurant, setRestaurant] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState({}); // key -> { name, variantLabel, price, qty }
  const [view, setView] = useState("menu"); // "menu" | "checkout" | "success"
  const [tableNumber, setTableNumber] = useState("");
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);

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

  function changeQty(item, variant, delta) {
    const key = cartKey(item.id, variant?.label);
    setCart((prev) => {
      const existing = prev[key];
      const newQty = (existing?.qty || 0) + delta;
      const updated = { ...prev };
      if (newQty <= 0) {
        delete updated[key];
      } else {
        updated[key] = {
          itemId: item.id,
          name: item.name,
          variantLabel: variant?.label || null,
          price: variant ? variant.price : item.price,
          qty: newQty,
        };
      }
      return updated;
    });
  }

  const cartLines = Object.values(cart);
  const cartCount = cartLines.reduce((sum, l) => sum + l.qty, 0);
  const cartTotal = cartLines.reduce((sum, l) => sum + l.qty * l.price, 0);

  async function handleConfirmOrder(e) {
    e.preventDefault();
    setError("");
    if (!tableNumber.trim()) {
      setError(t("errorTableNumber"));
      return;
    }
    if (cartLines.length === 0) {
      setError(t("errorEmptyCart"));
      return;
    }
    setPlacing(true);
    try {
      await addDoc(collection(db, "restaurants", uid, "orders"), {
        tableNumber: tableNumber.trim(),
        items: cartLines.map((l) => ({
          name: l.name,
          variantLabel: l.variantLabel,
          price: l.price,
          qty: l.qty,
        })),
        total: cartTotal,
        status: "new",
        createdAt: serverTimestamp(),
      });
      setCart({});
      setView("success");
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setPlacing(false);
    }
  }

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

  // ---------- सक्सेस स्क्रीन ----------
  if (view === "success") {
    return (
      <div className="screen" style={{ textAlign: "center", paddingTop: 80 }}>
        <div style={{ fontSize: 44, marginBottom: 14 }}>🎉</div>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>{t("orderSuccessTitle")}</h1>
        <p className="muted" style={{ marginBottom: 24 }}>{t("orderSuccessSubtitle")}</p>
        <button className="btn-primary" onClick={() => setView("menu")}>{t("newOrderBtn")}</button>
      </div>
    );
  }

  // ---------- चेकआउट स्क्रीन ----------
  if (view === "checkout") {
    return (
      <div className="screen" style={{ maxWidth: 480 }}>
        <LanguageToggle />
        <h1 style={{ fontSize: 22, marginBottom: 16 }}>{t("viewCartBtn")}</h1>
        <div className="card" style={{ marginBottom: 16 }}>
          {cartLines.map((l) => (
            <div key={cartKey(l.itemId, l.variantLabel)} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 14 }}>
              <span>{l.name}{l.variantLabel ? ` (${l.variantLabel})` : ""} × {l.qty}</span>
              <span style={{ fontWeight: 700, color: "var(--chili)" }}>₹{l.price * l.qty}</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid rgba(28,27,25,0.15)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
            <span>{t("orderTotalLabel")}</span>
            <span style={{ color: "var(--chili)" }}>₹{cartTotal}</span>
          </div>
        </div>

        <form onSubmit={handleConfirmOrder} className="card">
          <label className="muted">{t("tableNumberLabel")}</label>
          <input className="field" style={{ marginTop: 6 }} value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} placeholder={t("tableNumberPlaceholder")} />
          {error && <div className="error-text">{error}</div>}
          <button className="btn-primary" type="submit" disabled={placing} style={{ marginBottom: 10 }}>
            {t("confirmOrderBtn")}
          </button>
          <button
            type="button"
            onClick={() => setView("menu")}
            style={{ width: "100%", background: "transparent", border: "1px solid rgba(28,27,25,0.2)", borderRadius: 3, padding: "12px", color: "var(--ink)" }}
          >
            {t("backToMenuBtn")}
          </button>
        </form>
      </div>
    );
  }

  // ---------- मुख्य मेन्यू स्क्रीन ----------
  const grouped = items.reduce((acc, item) => {
    const cat = item.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="screen" style={{ maxWidth: 480, paddingBottom: cartCount > 0 ? 100 : 60 }}>
      <LanguageToggle />
      <div style={{ textAlign: "center", marginBottom: 24 }}>
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
          {catItems.map((item) => {
            const hasVariants = item.variants?.length > 0;
            return (
              <div key={item.id} className="card" style={{ marginBottom: 10, padding: "14px 16px" }}>
                <div style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: 16, marginBottom: 8 }}>{item.name}</div>

                {!hasVariants && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ color: "var(--chili)", fontWeight: 700, fontSize: 16 }}>₹{item.price}</div>
                    <QtyStepper qty={cart[cartKey(item.id, null)]?.qty || 0} onChange={(d) => changeQty(item, null, d)} addLabel={t("addToCartBtn")} />
                  </div>
                )}

                {hasVariants && item.variants.map((v, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ fontSize: 13.5, color: "#5B5647" }}>{v.label}: <b style={{ color: "var(--chili)" }}>₹{v.price}</b></div>
                    <QtyStepper qty={cart[cartKey(item.id, v.label)]?.qty || 0} onChange={(d) => changeQty(item, v, d)} addLabel={t("addToCartBtn")} />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ))}

      {cartCount > 0 && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "var(--turmeric)", padding: "14px 20px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          boxShadow: "0 -4px 14px rgba(0,0,0,0.3)", cursor: "pointer",
        }}
          onClick={() => setView("checkout")}
        >
          <span style={{ color: "var(--ink)", fontWeight: 700, fontSize: 14 }}>
            {cartCount} {t("cartItemsLabel")} · ₹{cartTotal}
          </span>
          <span style={{ color: "var(--ink)", fontWeight: 700, fontSize: 14 }}>{t("viewCartBtn")} →</span>
        </div>
      )}
    </div>
  );
}

function QtyStepper({ qty, onChange, addLabel }) {
  if (qty === 0) {
    return (
      <button
        onClick={() => onChange(1)}
        style={{ background: "var(--turmeric)", border: "none", borderRadius: 3, padding: "6px 14px", fontWeight: 700, fontSize: 12.5, color: "var(--ink)" }}
      >
        {addLabel}
      </button>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--turmeric)", borderRadius: 3, padding: "4px 10px" }}>
      <button onClick={() => onChange(-1)} style={{ background: "none", border: "none", fontWeight: 700, fontSize: 15, color: "var(--ink)", width: 18 }}>−</button>
      <span style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>{qty}</span>
      <button onClick={() => onChange(1)} style={{ background: "none", border: "none", fontWeight: 700, fontSize: 15, color: "var(--ink)", width: 18 }}>+</button>
    </div>
  );
}
