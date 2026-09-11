import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase.js";

// स्टेप: 1 = फोन नंबर डालना, 2 = OTP डालना, 3 = रेस्टोरेंट का नाम डालना
export default function OwnerSignUp() {
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
      setError("कृपया 10 अंकों का सही मोबाइल नंबर डालें (बिना +91 के)।");
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
      setError("OTP भेजने में दिक्कत आई। थोड़ी देर में दोबारा कोशिश करें।");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError("");
    if (otp.length !== 6) {
      setError("6 अंकों का OTP डालें।");
      return;
    }
    setLoading(true);
    try {
      await confirmation.confirm(otp);
      setStep(3);
    } catch (err) {
      console.error(err);
      setError("गलत OTP। दोबारा कोशिश करें।");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveRestaurant(e) {
    e.preventDefault();
    setError("");
    if (!restaurantName.trim()) {
      setError("रेस्टोरेंट का नाम डालें।");
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
      setError("प्रोफाइल सेव करने में दिक्कत आई। दोबारा कोशिश करें।");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 600 }}>रेस्टोरेंट रजिस्टर करें</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          {step === 1 && "अपना मोबाइल नंबर डालें, हम OTP भेजेंगे।"}
          {step === 2 && "मोबाइल पर आया 6 अंकों का OTP डालें।"}
          {step === 3 && "अब अपने रेस्टोरेंट का नाम बताएं।"}
        </p>
      </div>

      <div className="card">
        {step === 1 && (
          <form onSubmit={handleSendOtp}>
            <label className="muted">मोबाइल नंबर</label>
            <input
              className="field"
              type="tel"
              placeholder="जैसे 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              maxLength={10}
              style={{ marginTop: 6 }}
            />
            {error && <div className="error-text">{error}</div>}
            <button className="btn-primary" disabled={loading} type="submit">
              {loading ? "भेजा जा रहा है..." : "OTP भेजें"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp}>
            <label className="muted">OTP</label>
            <input
              className="field"
              type="text"
              placeholder="6 अंकों का OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              maxLength={6}
              style={{ marginTop: 6 }}
            />
            {error && <div className="error-text">{error}</div>}
            <button className="btn-primary" disabled={loading} type="submit">
              {loading ? "जांचा जा रहा है..." : "वेरिफाई करें"}
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleSaveRestaurant}>
            <label className="muted">रेस्टोरेंट का नाम</label>
            <input
              className="field"
              type="text"
              placeholder="जैसे स्वाद रेस्टोरेंट"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              style={{ marginTop: 6 }}
            />
            {error && <div className="error-text">{error}</div>}
            <button className="btn-primary" disabled={loading} type="submit">
              {loading ? "सेव हो रहा है..." : "आगे बढ़ें"}
            </button>
          </form>
        )}
      </div>

      {/* invisible reCAPTCHA — यूज़र को कुछ दिखेगा नहीं, ये सिर्फ बॉट रोकने के लिए है */}
      <div id="recaptcha-container"></div>
    </div>
  );
}
