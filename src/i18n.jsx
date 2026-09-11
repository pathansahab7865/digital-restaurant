import { createContext, useContext, useState, useEffect } from "react";

// यहां हर टेक्स्ट की हिंदी और अंग्रेज़ी दोनों लिखी हैं।
// नया टेक्स्ट चाहिए हो तो यहां एक नई "key" जोड़ें, दोनों भाषाओं में।
const translations = {
  hi: {
    signupTitle: "रेस्टोरेंट रजिस्टर करें",
    subtitleStep1: "अपना मोबाइल नंबर डालें, हम OTP भेजेंगे।",
    subtitleStep2: "मोबाइल पर आया 6 अंकों का OTP डालें।",
    subtitleStep3: "अब अपने रेस्टोरेंट का नाम बताएं।",
    mobileLabel: "मोबाइल नंबर",
    mobilePlaceholder: "जैसे 9876543210",
    otpLabel: "OTP",
    otpPlaceholder: "6 अंकों का OTP",
    restaurantNameLabel: "रेस्टोरेंट का नाम",
    restaurantNamePlaceholder: "जैसे स्वाद रेस्टोरेंट",
    sendOtpBtn: "OTP भेजें",
    sendingBtn: "भेजा जा रहा है...",
    verifyOtpBtn: "वेरिफाई करें",
    verifyingBtn: "जांचा जा रहा है...",
    continueBtn: "आगे बढ़ें",
    savingBtn: "सेव हो रहा है...",
    errorPhoneInvalid: "कृपया 10 अंकों का सही मोबाइल नंबर डालें (बिना +91 के)।",
    errorOtpInvalid: "6 अंकों का OTP डालें।",
    errorOtpSendFail: "OTP भेजने में दिक्कत आई। थोड़ी देर में दोबारा कोशिश करें।",
    errorOtpWrong: "गलत OTP। दोबारा कोशिश करें।",
    errorNameEmpty: "रेस्टोरेंट का नाम डालें।",
    errorSaveFail: "प्रोफाइल सेव करने में दिक्कत आई। दोबारा कोशिश करें।",
    dashboardTitle: "आपकी प्रोफाइल बन गई ✅",
    dashboardSubtitle: "अगला स्टेप: मेन्यू अपलोड और QR कोड जनरेशन — ये हिस्सा अगली बार जोड़ेंगे।",
    languageLabel: "भाषा",
  },
  en: {
    signupTitle: "Register Your Restaurant",
    subtitleStep1: "Enter your mobile number, we'll send an OTP.",
    subtitleStep2: "Enter the 6-digit OTP sent to your mobile.",
    subtitleStep3: "Now tell us your restaurant's name.",
    mobileLabel: "Mobile Number",
    mobilePlaceholder: "e.g. 9876543210",
    otpLabel: "OTP",
    otpPlaceholder: "6-digit OTP",
    restaurantNameLabel: "Restaurant Name",
    restaurantNamePlaceholder: "e.g. Swaad Restaurant",
    sendOtpBtn: "Send OTP",
    sendingBtn: "Sending...",
    verifyOtpBtn: "Verify",
    verifyingBtn: "Verifying...",
    continueBtn: "Continue",
    savingBtn: "Saving...",
    errorPhoneInvalid: "Please enter a valid 10-digit mobile number (without +91).",
    errorOtpInvalid: "Enter the 6-digit OTP.",
    errorOtpSendFail: "Couldn't send OTP. Please try again in a moment.",
    errorOtpWrong: "Incorrect OTP. Please try again.",
    errorNameEmpty: "Please enter your restaurant's name.",
    errorSaveFail: "Couldn't save your profile. Please try again.",
    dashboardTitle: "Your profile is ready ✅",
    dashboardSubtitle: "Next up: menu upload and QR code generation — we'll add that next.",
    languageLabel: "Language",
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("app_lang") || "hi");

  useEffect(() => {
    localStorage.setItem("app_lang", lang);
  }, [lang]);

  function t(key) {
    return translations[lang]?.[key] ?? translations.hi[key] ?? key;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
