import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import QRCode from "qrcode";
import { auth, db } from "../firebase.js";
import { ADMIN_UPI_ID, SUBSCRIPTION_PRICE } from "../config.js";
import { useLanguage } from "../i18n.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";

// username को Firestore doc id के लिए सुरक्षित बनाना: छोटे अक्षर, स्पेस की जगह हाइफ़न
function normalizeUsername(raw) {
  return raw.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
}

export default function OwnerSignUp() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [mode, setMode] = useState("signup"); // "signup" | "signin" | "forgot"
  // step: "credentials" (signup) | "upi" | "social" | "subscription" | "signinForm" | "forgotForm" | "forgotSent"
  const [step, setStep] = useState("credentials");

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [upiId, setUpiId] = useState("");
  const [googleBusiness, setGoogleBusiness] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [website, setWebsite] = useState("");

  const [subQr, setSubQr] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const subUpiLink = `upi://pay?pa=${encodeURIComponent(ADMIN_UPI_ID)}&pn=RestaurantApp&am=${SUBSCRIPTION_PRICE}&cu=INR`;

  useEffect(() => {
    if (step === "subscription") {
      QRCode.toDataURL(subUpiLink, { width: 200, margin: 1 }).then(setSubQr);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function switchMode(newMode) {
    setMode(newMode);
    setError("");
    if (newMode === "signup") setStep("credentials");
    if (newMode === "signin") setStep("signinForm");
    if (newMode === "forgot") setStep("forgotForm");
  }

  // ---------------- SIGN UP: स्टेप 1 — ईमेल + Username + पासवर्ड ----------------
  async function handleSignUp(e) {
    e.preventDefault();
    setError("");

    const normalizedUsername = normalizeUsername(username);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t("errorEmailInvalid"));
      return;
    }
    if (normalizedUsername.length < 3) {
      setError(t("errorUsernameInvalid"));
      return;
    }
    if (password.length < 6) {
      setError(t("errorPasswordWeak"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("errorPasswordMismatch"));
      return;
    }

    setLoading(true);
    try {
      // पहले चेक करें ये username पहले से लिया तो नहीं गया
      const usernameSnap = await getDoc(doc(db, "usernames", normalizedUsername));
      if (usernameSnap.exists()) {
        setError(t("errorUsernameTaken"));
        setLoading(false);
        return;
      }

      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      // Username → UID/ईमेल की मैपिंग सेव करना, ताकि आगे Sign In में इस्तेमाल हो सके
      await setDoc(doc(db, "usernames", normalizedUsername), { uid, email });

      await setDoc(doc(db, "restaurants", uid), {
        ownerEmail: email,
        username: normalizedUsername,
        restaurantName: username.trim(),
        status: "pending_payment",
        createdAt: serverTimestamp(),
      });

      sendEmailVerification(cred.user).catch(() => {}); // वेरिफिकेशन मेल — फेल हो तो भी आगे बढ़ते रहें

      setStep("upi");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setError(t("errorUsernameTaken"));
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveUpi(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const uid = auth.currentUser.uid;
      await setDoc(doc(db, "restaurants", uid), { upiId: upiId.trim() || null }, { merge: true });
      setStep("social");
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
      setStep("subscription");
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

  // ---------------- SIGN IN ----------------
  async function handleSignIn(e) {
    e.preventDefault();
    setError("");
    const normalizedUsername = normalizeUsername(username);
    setLoading(true);
    try {
      const usernameSnap = await getDoc(doc(db, "usernames", normalizedUsername));
      if (!usernameSnap.exists()) {
        setError(t("errorUsernameNotFound"));
        setLoading(false);
        return;
      }
      const { email: linkedEmail } = usernameSnap.data();
      await signInWithEmailAndPassword(auth, linkedEmail, password);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError(t("errorWrongCredentials"));
    } finally {
      setLoading(false);
    }
  }

  // ---------------- पासवर्ड भूल गए ----------------
  async function handleForgotPassword(e) {
    e.preventDefault();
    setError("");
    const normalizedUsername = normalizeUsername(username);
    setLoading(true);
    try {
      const usernameSnap = await getDoc(doc(db, "usernames", normalizedUsername));
      if (usernameSnap.exists()) {
        const { email: linkedEmail } = usernameSnap.data();
        await sendPasswordResetEmail(auth, linkedEmail);
      }
      setStep("forgotSent"); // सिक्योरिटी के लिए, username मौजूद हो या न हो, एक जैसा मैसेज दिखाएं
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen">
      <LanguageToggle />

      {(step === "credentials" || step === "signinForm" || step === "forgotForm" || step === "forgotSent") && (
        <div style={{ display: "flex", marginBottom: 20, borderRadius: 3, overflow: "hidden", border: "1px solid var(--line)" }}>
          <button
            onClick={() => switchMode("signup")}
            style={{ flex: 1, padding: "10px", fontWeight: 700, fontSize: 13, background: mode === "signup" ? "var(--turmeric)" : "transparent", color: mode === "signup" ? "var(--ink)" : "var(--text-muted)", border: "none" }}
          >
            {t("signUpTab")}
          </button>
          <button
            onClick={() => switchMode("signin")}
            style={{ flex: 1, padding: "10px", fontWeight: 700, fontSize: 13, background: mode === "signin" || mode === "forgot" ? "var(--turmeric)" : "transparent", color: mode === "signin" || mode === "forgot" ? "var(--ink)" : "var(--text-muted)", border: "none" }}
          >
            {t("signInTab")}
          </button>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 600 }}>{t("signupTitle")}</h1>
      </div>

      <div className="card">
        {/* -------- SIGN UP फॉर्म -------- */}
        {step === "credentials" && (
          <form onSubmit={handleSignUp}>
            <label className="muted">{t("emailLabel")}</label>
            <input className="field" style={{ marginTop: 6 }} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("emailPlaceholder")} />

            <label className="muted">{t("usernameLabel")}</label>
            <input className="field" style={{ marginTop: 6 }} value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t("usernamePlaceholder")} />

            <label className="muted">{t("passwordLabel")}</label>
            <input className="field" style={{ marginTop: 6 }} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("passwordPlaceholder")} />

            <label className="muted">{t("confirmPasswordLabel")}</label>
            <input className="field" style={{ marginTop: 6 }} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />

            {error && <div className="error-text">{error}</div>}
            <button className="btn-primary" disabled={loading} type="submit">
              {loading ? t("savingBtn") : t("signUpBtn")}
            </button>
          </form>
        )}

        {/* -------- SIGN IN फॉर्म -------- */}
        {step === "signinForm" && (
          <form onSubmit={handleSignIn}>
            <label className="muted">{t("usernameLabel")}</label>
            <input className="field" style={{ marginTop: 6 }} value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t("usernamePlaceholder")} />

            <label className="muted">{t("passwordLabel")}</label>
            <input className="field" style={{ marginTop: 6 }} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

            {error && <div className="error-text">{error}</div>}
            <button className="btn-primary" disabled={loading} type="submit" style={{ marginBottom: 10 }}>
              {loading ? t("verifyingBtn") : t("signInBtn")}
            </button>
            <button
              type="button"
              onClick={() => switchMode("forgot")}
              style={{ width: "100%", background: "transparent", border: "none", color: "var(--chili)", fontSize: 12.5 }}
            >
              {t("forgotPasswordLink")}
            </button>
          </form>
        )}

        {/* -------- पासवर्ड भूल गए फॉर्म -------- */}
        {step === "forgotForm" && (
          <form onSubmit={handleForgotPassword}>
            <label className="muted">{t("usernameLabel")}</label>
            <input className="field" style={{ marginTop: 6 }} value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t("usernamePlaceholder")} />
            {error && <div className="error-text">{error}</div>}
            <button className="btn-primary" disabled={loading} type="submit" style={{ marginBottom: 10 }}>
              {loading ? t("sendingBtn") : t("sendLinkBtn")}
            </button>
            <button
              type="button"
              onClick={() => switchMode("signin")}
              style={{ width: "100%", background: "transparent", border: "none", color: "var(--ink)", fontSize: 12.5 }}
            >
              {t("backToSignInLink")}
            </button>
          </form>
        )}

        {step === "forgotSent" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📧</div>
            <p className="muted" style={{ fontSize: 13.5, marginBottom: 16 }}>{t("resetPasswordSentText")}</p>
            <button className="btn-primary" onClick={() => switchMode("signin")}>{t("backToSignInLink")}</button>
          </div>
        )}

        {/* -------- SIGN UP के बाद वाले स्टेप्स -------- */}
        {step === "upi" && (
          <form onSubmit={handleSaveUpi}>
            <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>{t("verifyEmailNoteText")}</p>
            <label className="muted">{t("upiIdLabel")}</label>
            <input className="field" style={{ marginTop: 6 }} value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder={t("upiIdPlaceholder")} />
            <p className="muted" style={{ fontSize: 11.5, marginTop: -8, marginBottom: 14 }}>{t("upiIdHelpText")}</p>
            <button className="btn-primary" disabled={loading} type="submit">
              {loading ? t("savingBtn") : t("continueBtn")}
            </button>
          </form>
        )}

        {step === "social" && (
          <form onSubmit={handleSaveSocial}>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 14 }}>{t("subtitleSocialStep")}</p>
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

        {step === "subscription" && (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>₹{SUBSCRIPTION_PRICE} / {t("perMonthLabel")}</p>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 14 }}>{t("subscriptionInstructions")}</p>
            {subQr && <img src={subQr} alt="Subscription UPI QR" style={{ width: 180, height: 180, margin: "0 auto 14px" }} />}
            <a
              href={subUpiLink}
              style={{ display: "inline-block", background: "var(--ink)", color: "var(--paper)", padding: "8px 16px", borderRadius: 3, fontSize: 12.5, fontWeight: 600, textDecoration: "none", marginBottom: 16 }}
            >
              {t("openUpiAppBtn")}
            </a>
            <button className="btn-primary" onClick={handleMarkPaid} disabled={loading}>
              {loading ? t("savingBtn") : t("paidSubscriptionBtn")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
