import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import QRCode from "qrcode";
import { auth, db } from "../firebase.js";
import { useLanguage } from "../i18n.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";

export default function Dashboard() {
  const { t } = useLanguage();
  const uid = auth.currentUser?.uid;

  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [upiId, setUpiIdState] = useState("");
  const [restaurantStatus, setRestaurantStatus] = useState(null);
  const [editingUpi, setEditingUpi] = useState(false);
  const [savingUpi, setSavingUpi] = useState(false);

  // फॉर्म फील्ड्स
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [pricingType, setPricingType] = useState("single"); // "single" | "variant"
  const [price, setPrice] = useState("");
  const [quarterPrice, setQuarterPrice] = useState("");
  const [halfPrice, setHalfPrice] = useState("");
  const [fullPrice, setFullPrice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const menuUrl = uid ? `${window.location.origin}/menu/${uid}` : "";

  // मेन्यू आइटम्स को लाइव सुनना — कोई भी बदलाव तुरंत यहां दिख जाएगा
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "restaurants", uid, "menuItems"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [uid]);

  // रेस्टोरेंट प्रोफाइल (UPI ID वगैरह) लाना
  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "restaurants", uid)).then((snap) => {
      if (snap.exists()) {
        setUpiIdState(snap.data().upiId || "");
        setRestaurantStatus(snap.data().status || null);
      }
    });
  }, [uid]);

  async function handleSaveUpi() {
    setSavingUpi(true);
    try {
      await setDoc(doc(db, "restaurants", uid), { upiId: upiId.trim() || null }, { merge: true });
      setEditingUpi(false);
    } finally {
      setSavingUpi(false);
    }
  }

  // लाइव ऑर्डर सुनना — नए ऑर्डर सबसे ऊपर दिखेंगे
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "restaurants", uid, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [uid]);

  async function handleMarkServed(orderId) {
    await updateDoc(doc(db, "restaurants", uid, "orders", orderId), { status: "served" });
  }

  // QR कोड जनरेट करना
  useEffect(() => {
    if (!menuUrl) return;
    QRCode.toDataURL(menuUrl, { width: 260, margin: 1 }).then(setQrDataUrl);
  }, [menuUrl]);

  function resetForm() {
    setName("");
    setCategory("");
    setPricingType("single");
    setPrice("");
    setQuarterPrice("");
    setHalfPrice("");
    setFullPrice("");
    setError("");
  }

  async function handleAddItem(e) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError(t("errorItemName"));
      return;
    }

    let variants = [];
    let flatPrice = null;

    if (pricingType === "single") {
      const num = parseFloat(price);
      if (!num || num <= 0) {
        setError(t("errorItemPrice"));
        return;
      }
      flatPrice = num;
    } else {
      const q = parseFloat(quarterPrice) || 0;
      const h = parseFloat(halfPrice) || 0;
      const f = parseFloat(fullPrice) || 0;
      if (!q && !h && !f) {
        setError(t("errorItemPrice"));
        return;
      }
      if (q) variants.push({ label: "Quarter", price: q });
      if (h) variants.push({ label: "Half", price: h });
      if (f) variants.push({ label: "Full", price: f });
    }

    setSaving(true);
    try {
      await addDoc(collection(db, "restaurants", uid, "menuItems"), {
        name: name.trim(),
        category: category.trim() || "Other",
        price: flatPrice,
        variants,
        createdAt: serverTimestamp(),
      });
      resetForm();
      setShowForm(false);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(itemId) {
    await deleteDoc(doc(db, "restaurants", uid, "menuItems", itemId));
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(menuUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadQr() {
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = "menu-qr-code.png";
    link.click();
  }

  // कैटेगरी के हिसाब से ग्रुप करना
  const grouped = items.reduce((acc, item) => {
    const cat = item.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="screen" style={{ maxWidth: 480 }}>
      <LanguageToggle />
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>{t("dashboardTitle")}</h1>

      {restaurantStatus && restaurantStatus !== "active" && (
        <div style={{
          background: "rgba(217,164,65,0.15)", border: "1px solid rgba(217,164,65,0.4)",
          borderRadius: 3, padding: "10px 14px", fontSize: 13, marginTop: 10, marginBottom: 4,
        }}>
          {restaurantStatus === "pending_verification" ? t("pendingVerificationBanner") : t("pendingPaymentBanner")}
        </div>
      )}

      {/* QR कोड सेक्शन */}
      <div className="card" style={{ marginTop: 20, textAlign: "center" }}>
        <h3 style={{ fontSize: 16, marginBottom: 4 }}>{t("qrSectionTitle")}</h3>
        <p className="muted" style={{ fontSize: 12.5, marginBottom: 14 }}>{t("qrSectionSubtitle")}</p>
        {qrDataUrl && (
          <img src={qrDataUrl} alt="QR Code" style={{ width: 180, height: 180, margin: "0 auto 14px" }} />
        )}
        <button className="btn-primary" onClick={handleDownloadQr} style={{ marginBottom: 10 }}>
          {t("downloadQrBtn")}
        </button>
        <div style={{ fontSize: 11.5, color: "#6B6552", wordBreak: "break-all", marginBottom: 6 }}>
          {menuUrl}
        </div>
        <button
          onClick={handleCopyLink}
          style={{
            background: "transparent",
            border: "1px solid rgba(28,27,25,0.2)",
            borderRadius: 3,
            padding: "6px 12px",
            fontSize: 12.5,
            color: "var(--ink)",
          }}
        >
          {copied ? t("copiedText") : t("copyLinkBtn")}
        </button>
      </div>

      {/* UPI सेटिंग */}
      <div className="card" style={{ marginTop: 16 }}>
        <label className="muted">{t("upiIdLabel")}</label>
        {!editingUpi ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{upiId || "—"}</span>
            <button
              onClick={() => setEditingUpi(true)}
              style={{ background: "transparent", border: "1px solid rgba(28,27,25,0.2)", borderRadius: 3, padding: "5px 12px", fontSize: 12 }}
            >
              {t("editBtn")}
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 6 }}>
            <input className="field" value={upiId} onChange={(e) => setUpiIdState(e.target.value)} placeholder={t("upiIdPlaceholder")} />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-primary" onClick={handleSaveUpi} disabled={savingUpi} style={{ flex: 1 }}>{t("saveItemBtn")}</button>
              <button onClick={() => setEditingUpi(false)} style={{ flex: 1, background: "transparent", border: "1px solid rgba(28,27,25,0.2)", borderRadius: 3, color: "var(--ink)" }}>{t("cancelBtn")}</button>
            </div>
          </div>
        )}
      </div>

      {/* लाइव ऑर्डर सेक्शन */}
      <div style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 19, marginBottom: 12 }}>{t("ordersSectionTitle")}</h2>
        {orders.length === 0 && (
          <p className="muted" style={{ fontSize: 13.5, marginBottom: 16 }}>{t("ordersEmptyState")}</p>
        )}
        {orders.map((order) => (
          <div key={order.id} className="card" style={{ marginBottom: 10, padding: "14px 16px", opacity: order.status === "served" ? 0.55 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: 15 }}>
                {t("orderTableLabel")} #{order.tableNumber}
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 12,
                background: order.status === "served" ? "#D8D2BE" : "var(--turmeric)",
                color: "var(--ink)",
              }}>
                {order.status === "served" ? t("orderStatusServed") : t("orderStatusNew")}
              </span>
            </div>
            {(order.items || []).map((it, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "2px 0" }}>
                <span>{it.name}{it.variantLabel ? ` (${it.variantLabel})` : ""} × {it.qty}</span>
                <span style={{ color: "var(--chili)", fontWeight: 600 }}>₹{it.price * it.qty}</span>
              </div>
            ))}
            <div style={{ borderTop: "1px solid rgba(28,27,25,0.15)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 13.5 }}>
                {t("orderTotalLabel")}: ₹{order.total}
                {order.paymentMethod && (
                  <span style={{ marginLeft: 8, fontWeight: 500, fontSize: 11.5, color: "#6B6552" }}>
                    ({t("orderPaymentLabel")}: {order.paymentMethod === "upi" ? t("payUpi") : t("payCash")})
                  </span>
                )}
              </span>
              {order.status !== "served" && (
                <button
                  onClick={() => handleMarkServed(order.id)}
                  style={{ background: "var(--turmeric)", border: "none", borderRadius: 3, padding: "6px 12px", fontWeight: 700, fontSize: 11.5, color: "var(--ink)" }}
                >
                  {t("markServedBtn")}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* मेन्यू सेक्शन */}
      <div style={{ marginTop: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 19 }}>{t("menuSectionTitle")}</h2>
        </div>

        {items.length === 0 && !showForm && (
          <p className="muted" style={{ fontSize: 13.5, marginBottom: 16 }}>{t("menuEmptyState")}</p>
        )}

        {Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat} style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: "Fraunces, serif", fontStyle: "italic", color: "var(--turmeric)", fontSize: 14.5, marginBottom: 8 }}>
              {cat}
            </div>
            {catItems.map((item) => (
              <div key={item.id} className="card" style={{ marginBottom: 8, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: 15 }}>{item.name}</div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{ background: "none", border: "none", color: "var(--chili)", fontSize: 11.5, cursor: "pointer" }}
                  >
                    {t("deleteBtn")}
                  </button>
                </div>
                {item.price != null && (
                  <div style={{ color: "var(--chili)", fontWeight: 700, fontSize: 14, marginTop: 4 }}>₹{item.price}</div>
                )}
                {item.variants?.length > 0 && (
                  <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                    {item.variants.map((v, i) => (
                      <span key={i} style={{ fontSize: 12, color: "#6B6552" }}>
                        {v.label}: <b style={{ color: "var(--chili)" }}>₹{v.price}</b>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {!showForm && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            {t("addItemBtn")}
          </button>
        )}

        {showForm && (
          <form onSubmit={handleAddItem} className="card" style={{ marginTop: 4 }}>
            <label className="muted">{t("itemNameLabel")}</label>
            <input className="field" style={{ marginTop: 6 }} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("itemNamePlaceholder")} />

            <label className="muted">{t("itemCategoryLabel")}</label>
            <input className="field" style={{ marginTop: 6 }} value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t("itemCategoryPlaceholder")} />

            <label className="muted">{t("pricingTypeLabel")}</label>
            <div style={{ display: "flex", gap: 8, marginTop: 6, marginBottom: 14 }}>
              <button
                type="button"
                onClick={() => setPricingType("single")}
                style={{
                  flex: 1, padding: "10px", borderRadius: 3, border: "1px solid rgba(28,27,25,0.2)",
                  background: pricingType === "single" ? "var(--turmeric)" : "#fff",
                  fontWeight: 600, fontSize: 13,
                }}
              >
                {t("pricingSingle")}
              </button>
              <button
                type="button"
                onClick={() => setPricingType("variant")}
                style={{
                  flex: 1, padding: "10px", borderRadius: 3, border: "1px solid rgba(28,27,25,0.2)",
                  background: pricingType === "variant" ? "var(--turmeric)" : "#fff",
                  fontWeight: 600, fontSize: 13,
                }}
              >
                {t("pricingVariant")}
              </button>
            </div>

            {pricingType === "single" ? (
              <>
                <label className="muted">{t("priceLabel")}</label>
                <input className="field" style={{ marginTop: 6 }} type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
              </>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label className="muted" style={{ fontSize: 11 }}>{t("quarterLabel")}</label>
                  <input className="field" style={{ marginTop: 4 }} type="number" value={quarterPrice} onChange={(e) => setQuarterPrice(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="muted" style={{ fontSize: 11 }}>{t("halfLabel")}</label>
                  <input className="field" style={{ marginTop: 4 }} type="number" value={halfPrice} onChange={(e) => setHalfPrice(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="muted" style={{ fontSize: 11 }}>{t("fullLabel")}</label>
                  <input className="field" style={{ marginTop: 4 }} type="number" value={fullPrice} onChange={(e) => setFullPrice(e.target.value)} />
                </div>
              </div>
            )}

            {error && <div className="error-text">{error}</div>}

            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button className="btn-primary" type="submit" disabled={saving} style={{ flex: 1 }}>
                {t("saveItemBtn")}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm(); }}
                style={{ flex: 1, background: "transparent", border: "1px solid rgba(28,27,25,0.2)", borderRadius: 3, color: "var(--ink)" }}
              >
                {t("cancelBtn")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
