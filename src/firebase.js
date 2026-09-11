// यह फाइल Firebase को हमारे प्रोजेक्ट से जोड़ती है।
// नीचे दिया गया config "digital-resturante-app" Firebase प्रोजेक्ट का असली config है
// (जो आपने Firebase console से लिया था) — इसे बदलने की ज़रूरत नहीं।

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA4vn9X-NQkWUhY16L01IPIiA_fLRKcLEE",
  authDomain: "digital-resturante-app.firebaseapp.com",
  projectId: "digital-resturante-app",
  storageBucket: "digital-resturante-app.firebasestorage.app",
  messagingSenderId: "244709528377",
  appId: "1:244709528377:web:248cad6843a9b1246c8ee8",
  measurementId: "G-4J78EB7CXX",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
