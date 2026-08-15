import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  getMessaging,
  getToken,
  onMessage
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging.js";

import {
  collection,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const enableButton = document.getElementById("enable-photo-notifications");
const statusElement = document.getElementById("photo-notification-status");

let currentUser = null;
let messaging = null;

function setStatus(message) {
  if (statusElement) {
    statusElement.textContent = message;
  }
}

function setButton(label, disabled = false) {
  if (!enableButton) return;
  enableButton.textContent = label;
  enableButton.disabled = disabled;
}

async function registerNotifications(user) {
  if (!user) return;

  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    setStatus("This browser does not support web notifications.");
    setButton("Notifications Unsupported", true);
    return;
  }

  try {
    setButton("Enabling…", true);
    setStatus("Requesting notification permission…");

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      setStatus("Notifications are blocked. Allow notifications for this site and try again.");
      setButton("🔔 Enable Notifications", false);
      return;
    }

    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );

    messaging = messaging || getMessaging();

    // A custom VAPID key can be added later from Firebase Console →
    // Project settings → Cloud Messaging → Web Push certificates.
    const token = await getToken(messaging, {
      serviceWorkerRegistration: registration
    });

    if (!token) {
      throw new Error("FCM did not return a registration token.");
    }

    await setDoc(
      doc(
        collection(db, "adminNotificationTokens"),
        user.uid
      ),
      {
        uid: user.uid,
        token,
        email: user.email || "",
        updatedAt: serverTimestamp(),
        platform: "web",
        userAgent: navigator.userAgent
      },
      { merge: true }
    );

    localStorage.setItem("upPandeyDhabaFcmRegistered", "true");

    setStatus("🔔 Notifications are enabled on this device.");
    setButton("🔔 Notifications Enabled", true);

    onMessage(messaging, (payload) => {
      const title = payload.notification?.title || "UP Pandey Dhaba";
      const body = payload.notification?.body || "A new customer photo was uploaded.";

      if (Notification.permission === "granted") {
        new Notification(title, {
          body,
          icon: "/assets/images/logo.png",
          data: payload.data || {}
        });
      }
    });
  } catch (error) {
    console.error("FCM registration failed:", error);
    setStatus(`Notification setup failed: ${error.message || "Unknown error"}`);
    setButton("🔔 Enable Notifications", false);
  }
}

if (enableButton) {
  enableButton.addEventListener("click", () => {
    if (currentUser) {
      registerNotifications(currentUser);
    }
  });
}

onAuthStateChanged(auth, (user) => {
  currentUser = user;

  if (!user) {
    setStatus("Sign in to enable notifications.");
    setButton("🔔 Enable Notifications", true);
    return;
  }

  if (Notification.permission === "granted") {
    setStatus("Notifications are allowed. Click Enable Notifications once to register this device.");
    setButton("🔔 Enable Notifications", false);
  } else {
    setStatus("Notifications are not enabled.");
    setButton("🔔 Enable Notifications", false);
  }
});
