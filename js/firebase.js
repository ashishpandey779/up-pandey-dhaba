import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyAMGh7uwqU7O2dOtEwrCsohoTcboD26-tQ",
  authDomain: "up-pandey-dhaba.firebaseapp.com",
  projectId: "up-pandey-dhaba",
  storageBucket: "up-pandey-dhaba.firebasestorage.app",
  messagingSenderId: "1078284322635",
  appId: "1:1078284322635:web:9fce7eadfe5d180e350ace",
  measurementId: "G-CCLFEBQ9EK"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

isSupported().then((supported) => {
  if (supported) {
    getAnalytics(app);
  }
}).catch(() => {});