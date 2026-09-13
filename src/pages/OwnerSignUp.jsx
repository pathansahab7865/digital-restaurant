import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import QRCode from "qrcode";
import { auth, db } from "../firebase.js";
import { ADMIN_UPI_ID, SUBSCRIPTION_PRICE } from "../config.js";
import { useLanguage } from "../i18n.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";

const EMAIL_STORAGE_KEY = "emailForSignIn";

// स्टेप: 1 = ईमेल डालना (लिंक भेजना), "linkSent" = लिंक भेज दिया गया इंतज़ार में,
// 2 = लिंक से वापस आकर ईमेल कन्फर्म करना (अगर ज़रूरत पड़े), 3 = रेस्टोरेंट का नाम डालना
export default function OwnerSignUp() {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [googleBusiness, setGoogleBusiness] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [subQr, setSubQr] = useState("");
  const navigate = useNavigate();

  const subUpiLink = `upi://pay?pa=${encodeURIComponent(ADMIN_UPI_ID)}&pn=RestaurantApp&am=${SUBSCRIPTION_PRICE}&cu=INR`;

  useEffect(() => {
    if (step === 4) {
      QRCode.toDataURL(subUpiLink, { width: 200, margin: 1 }).then(setSubQr);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // पेज लोड होते ही चेक करें — क्या यूज़र अभी-अभी अपने ईमेल में आए लिंक पर क्लिक करके वापस आया है?
  useEffect(() => {
    async function tryCompleteSignIn() {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let storedEmail = window.localStorage.getItem(EMAIL_STORAGE_KEY);
        if (!storedEmail) {
          // अगर यूज़र ने दूसरे डिवाइस/ब्राउज़र में लिंक खोला है, तो ईमेल दोबारा पूछना पड़ेगा
          setStep("confirmEmail");
          return;
        }
        setLoading(true);
        try {
          await signInWithEmailLink(auth, storedEmail, window.location.href);
          window.localStorage.removeItem(EMAIL_STORAGE_KEY);
          window.history.replaceState({}, document.title, "/"); // URL साफ़ कर दें
          setStep(3);
        } catch (err) {
          console.error(err);
          setError(t("errorOtpWrong"));
        } finally {
          setLoading(false);
        }
      }
    }
    tryCompleteSignIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSendLink(e) {
    e.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t("errorEmailInvalid"));
      return;
    }
    setLoading(true);
    try {
      const actionCodeSettings = {
        url: window.location.origin + "/",
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem(EMAIL_STORAGE_KEY, email);
      setStep("linkSent");
    } catch (err) {
      console.error(err);
      setError(t("errorOtpSendFail"));
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmEmail(e) {
    e.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t("errorEmailInvalid"));
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailLink(auth, email, window.location.href);
      window.localStorage.removeItem(EMAIL_STORAGE_KEY);
      window.history.replaceState({}, document.title, "/");
      setStep(3);
    } catch (err) {
      console.error(err);
      setError(t("errorOtpWrong"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveRestaurant(e) {
    e.preventDefault();
    setError("");
    if (!restaurantName.trim()) {
      setError(t("errorNameEmpty"));
      return;
    }
    setLoading(true);
    try {
      const uid = auth.currentUser.uid;
      await setDoc(doc(db, "restaurants", uid), {
        ownerEmail: auth.currentUser.email,
        restaurantName: restaurantName.trim(),
        upiId: upiId.trim() || null,
        status: "pending_payment",
        createdAt: serverTimestamp(),
      });
      setStep("social");
    } catch (err) {
      console.error(err);
      setError(t("errorSaveFail"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSocial(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const uid = auth.currentUser.uid;
      await setDoc(doc(db, "restaurants", uid), {
        googleBusiness: googleBusiness.trim() || null,
        instagram: instagram.trim() || null,
        facebook: facebook.trim() || null,
        website: website.trim() || null,
      }, { merge: true });
      setStep(4);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkPaid() {
    setLoading(true);
    try {
      const uid = auth.currentUser.uid;
      await setDoc(doc(db, "restaurants", uid), { status: "pending_verification" }, { merge: true });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen">
      <LanguageToggle />

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 600 }}>{t("signupTitle")}</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          {step === 1 && t("subtitleEmailStep")}
          {step === "linkSent" && t("subtitleLinkSent")}
          {step === "confirmEmail" && t("subtitleConfirmEmail")}
          {step === 3 && t("subtitleStep3")}
          {step === "social" && t("subtitleSocialStep")}
          {step === 4 && t("subtitleSubscription")}
        </p>
      </div>

      <div className="card">
        {step === "social" && (
          <form onSubmit={handleSaveSocial}>
            <label className="muted">{t("googleBusinessLabel")}</label>
            <input className="field" style={{ marginTop: 6 }} value={googleBusiness} onChange={(e) => setGoogleBusiness(e.target.value)} placeholder={t("linkPlaceholder")} />

            <label className="muted">{t("instagramLabel")}</label>
            <input className="field" style={{ marginTop: 6 }} value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder={t("linkPlaceholder")} />

            <label className="muted">{t("facebookLabel")}</label>
            <input className="field" style={{ marginTop: 6 }} value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder={t("linkPlaceholder")} />

            <label className="muted">{t("websiteLabel")}</label>
            <input className="field" style={{ marginTop: 6 }} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder={t("linkPlaceholder")} />

            <button className="btn-primary" disabled={loading} type="submit">
              {loading ? t("savingBtn") : t("continueBtn")}
            </button>
          </form>
        )}

        {step === 4 && (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>₹{SUBSCRIPTION_PRICE} / {t("perMonthLabel")}</p>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 14 }}>{t("subscriptionInstructions")}</p>
            {subQr && <img src={subQr} alt="Subscription UPI QR" style={{ width: 180, height: 180, margin: "0 auto 14px" }} />}
            <a
              href={subUpiLink}
              style={{
                display: "inline-block", background: "var(--ink)", color: "var(--paper)",
                padding: "8px 16px", borderRadius: 3, fontSize: 12.5, fontWeight: 600, textDecoration: "none", marginBottom: 16,
              }}
            >
              {t("openUpiAppBtn")}
            </a>
            <button className="btn-primary" onClick={handleMarkPaid} disabled={loading}>
              {loading ? t("savingBtn") : t("paidSubscriptionBtn")}
            </button>
          </div>
        )}
        {step === 1 && (
          <form onSubmit={handleSendLink}>
            <label className="muted">{t("emailLabel")}</label>
            <input
              className="field"
              type="email"
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ marginTop: 6 }}
            />
            {error && <div className="error-text">{error}</div>}
            <button className="btn-primary" disabled={loading} type="submit">
              {loading ? t("sendingBtn") : t("sendLinkBtn")}
            </button>
          </form>
        )}

        {step === "linkSent" && (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📧</div>
            <p style={{ fontWeight: 600, marginBottom: 6 }}>{email}</p>
            <p className="muted" style={{ fontSize: 13 }}>{t("checkInboxText")}</p>
          </div>
        )}

        {step === "confirmEmail" && (
          <form onSubmit={handleConfirmEmail}>
            <label className="muted">{t("emailLabel")}</label>
            <input
              className="field"
              type="email"
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ marginTop: 6 }}
            />
            {error && <div className="error-text">{error}</div>}
            <button className="btn-primary" disabled={loading} type="submit">
              {loading ? t("verifyingBtn") : t("verifyOtpBtn")}
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleSaveRestaurant}>
            <label className="muted">{t("restaurantNameLabel")}</label>
            <input
              className="field"
              type="text"
              placeholder={t("restaurantNamePlaceholder")}
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              style={{ marginTop: 6 }}
            />
            <label className="muted">{t("upiIdLabel")}</label>
            <input
              className="field"
              type="text"
              placeholder={t("upiIdPlaceholder")}
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              style={{ marginTop: 6 }}
            />
            <p className="muted" style={{ fontSize: 11.5, marginTop: -8, marginBottom: 14 }}>{t("upiIdHelpText")}</p>
            {error && <div className="error-text">{error}</div>}
            <button className="btn-primary" disabled={loading} type="submit">
              {loading ? t("savingBtn") : t("continueBtn")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
