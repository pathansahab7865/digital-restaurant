import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase.js";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

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
        status: "pending_payment",
        createdAt: serverTimestamp(),
      });
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError(t("errorSaveFail"));
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
        </p>
      </div>

      <div className="card">
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
