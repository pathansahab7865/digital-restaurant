import { createContext, useContext, useState, useEffect } from "react";

// यहां हर टेक्स्ट की हिंदी और अंग्रेज़ी दोनों लिखी हैं।
// नया टेक्स्ट चाहिए हो तो यहां एक नई "key" जोड़ें, दोनों भाषाओं में।
const translations = {
  hi: {
    signupTitle: "रेस्टोरेंट रजिस्टर करें",
    subtitleStep1: "अपना मोबाइल नंबर डालें, हम OTP भेजेंगे।",
    subtitleStep2: "मोबाइल पर आया 6 अंकों का OTP डालें।",
    subtitleStep3: "अब अपने रेस्टोरेंट का नाम बताएं।",
    subtitleEmailStep: "अपना ईमेल डालें, हम एक लॉगिन लिंक भेजेंगे।",
    subtitleLinkSent: "लिंक भेज दिया गया है — अपना ईमेल इनबॉक्स चेक करें।",
    subtitleConfirmEmail: "अपना ईमेल फिर से डालकर कन्फर्म करें।",
    emailLabel: "ईमेल आईडी",
    emailPlaceholder: "जैसे owner@example.com",
    sendLinkBtn: "लॉगिन लिंक भेजें",
    checkInboxText: "अपने ईमेल में आए लिंक पर क्लिक करें — इसी ब्राउज़र में वापस आ जाएंगे, अपने-आप लॉगिन हो जाएगा।",
    errorEmailInvalid: "कृपया एक सही ईमेल आईडी डालें।",
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

    menuSectionTitle: "मेन्यू",
    menuEmptyState: "अभी कोई आइटम नहीं जोड़ा — नीचे से पहला आइटम जोड़ें।",
    addItemBtn: "+ नया आइटम जोड़ें",
    itemNameLabel: "आइटम का नाम",
    itemNamePlaceholder: "जैसे पनीर बटर मसाला",
    itemCategoryLabel: "कैटेगरी",
    itemCategoryPlaceholder: "जैसे Starters, Main Course",
    pricingTypeLabel: "प्राइस टाइप",
    pricingSingle: "एक ही प्राइस",
    pricingVariant: "क्वार्टर/हाफ/फुल",
    priceLabel: "प्राइस (₹)",
    quarterLabel: "Quarter",
    halfLabel: "Half",
    fullLabel: "Full",
    saveItemBtn: "आइटम सेव करें",
    cancelBtn: "रद्द करें",
    deleteBtn: "हटाएं",
    errorItemName: "आइटम का नाम डालें।",
    errorItemPrice: "सही प्राइस डालें।",

    qrSectionTitle: "आपका QR कोड",
    qrSectionSubtitle: "इसे प्रिंट कराकर टेबल पर चिपका दें — स्कैन करते ही कस्टमर को आपका मेन्यू दिखेगा।",
    downloadQrBtn: "QR कोड डाउनलोड करें",
    menuLinkLabel: "मेन्यू लिंक",
    copyLinkBtn: "लिंक कॉपी करें",
    copiedText: "कॉपी हो गया ✓",

    publicMenuLoading: "मेन्यू लोड हो रहा है...",
    publicMenuNotFound: "ये मेन्यू नहीं मिला।",
    publicMenuEmpty: "अभी मेन्यू तैयार नहीं है।",
  },
  en: {
    signupTitle: "Register Your Restaurant",
    subtitleStep1: "Enter your mobile number, we'll send an OTP.",
    subtitleStep2: "Enter the 6-digit OTP sent to your mobile.",
    subtitleStep3: "Now tell us your restaurant's name.",
    subtitleEmailStep: "Enter your email, we'll send you a login link.",
    subtitleLinkSent: "Link sent — please check your email inbox.",
    subtitleConfirmEmail: "Please re-enter your email to confirm.",
    emailLabel: "Email Address",
    emailPlaceholder: "e.g. owner@example.com",
    sendLinkBtn: "Send Login Link",
    checkInboxText: "Click the link in your email — you'll come back to this browser and be signed in automatically.",
    errorEmailInvalid: "Please enter a valid email address.",
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

    menuSectionTitle: "Menu",
    menuEmptyState: "No items yet — add your first item below.",
    addItemBtn: "+ Add new item",
    itemNameLabel: "Item Name",
    itemNamePlaceholder: "e.g. Paneer Butter Masala",
    itemCategoryLabel: "Category",
    itemCategoryPlaceholder: "e.g. Starters, Main Course",
    pricingTypeLabel: "Pricing Type",
    pricingSingle: "Single price",
    pricingVariant: "Quarter/Half/Full",
    priceLabel: "Price (₹)",
    quarterLabel: "Quarter",
    halfLabel: "Half",
    fullLabel: "Full",
    saveItemBtn: "Save Item",
    cancelBtn: "Cancel",
    deleteBtn: "Delete",
    errorItemName: "Please enter the item name.",
    errorItemPrice: "Please enter a valid price.",

    qrSectionTitle: "Your QR Code",
    qrSectionSubtitle: "Print this and stick it on your tables — customers scan it to see your menu.",
    downloadQrBtn: "Download QR Code",
    menuLinkLabel: "Menu Link",
    copyLinkBtn: "Copy Link",
    copiedText: "Copied ✓",

    publicMenuLoading: "Loading menu...",
    publicMenuNotFound: "This menu could not be found.",
    publicMenuEmpty: "Menu isn't ready yet.",
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
