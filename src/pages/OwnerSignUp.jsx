import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase.js";
import { useLanguage } from "../i18n.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";

// स्टेप: 1 = फोन नंबर डालना, 2 = OTP डालना, 3 = रेस्टोरेंट का नाम डालना
export default function OwnerSignUp() {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  function setupRecaptcha() {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });
    }
    return window.recaptchaVerifier;
  }

  async function handleSendOtp(e) {
    e.preventDefault();
    setError("");
    if (!/^\d{10}$/.test(phone)) {
      setError(t("errorPhoneInvalid"));
      return;
    }
    setLoading(true);
    try {
      const verifier = setupRecaptcha();
      const fullNumber = "+91" + phone;
      const result = await signInWithPhoneNumber(auth, fullNumber, verifier);
      setConfirmation(result);
      setStep(2);
    } catch (err) {
      console.error(err);
      setError(t("errorOtpSendFail"));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError("");
    if (otp.length !== 6) {
      setError(t("errorOtpInvalid"));
      return;
    }
    setLoading(true);
    try {
      await confirmation.confirm(otp);
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
        ownerPhone: "+91" + phone,
        restaurantName: restaurantName.trim(),
        status: "pending_payment", // अभी पेमेंट स्टेप नहीं बना, इसलिए pending रखा है
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
          {step === 1 && t("subtitleStep1")}
          {step === 2 && t("subtitleStep2")}
          {step === 3 && t("subtitleStep3")}
        </p>
      </div>

      <div className="card">
        {step === 1 && (
          <form onSubmit={handleSendOtp}>
            <label className="muted">{t("mobileLabel")}</label>
            <input
              className="field"
              type="tel"
              placeholder={t("mobilePlaceholder")}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              maxLength={10}
              style={{ marginTop: 6 }}
            />
            {error && <div className="error-text">{error}</div>}
            <button className="btn-primary" disabled={loading} type="submit">
              {loading ? t("sendingBtn") : t("sendOtpBtn")}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp}>
            <label className="muted">{t("otpLabel")}</label>
            <input
              className="field"
              type="text"
              placeholder={t("otpPlaceholder")}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              maxLength={6}
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

      {/* invisible reCAPTCHA — यूज़र को कुछ दिखेगा नहीं, ये सिर्फ बॉट रोकने के लिए है */}
      <div id="recaptcha-container"></div>
    </div>
  );
}
