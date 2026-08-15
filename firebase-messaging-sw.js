importScripts("https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAMGh7uwqU7O2dOtEwrCsohoTcboD26-tQ",
  authDomain: "up-pandey-dhaba.firebaseapp.com",
  projectId: "up-pandey-dhaba",
  storageBucket: "up-pandey-dhaba.firebasestorage.app",
  messagingSenderId: "1078284322635",
  appId: "1:1078284322635:web:9fce7eadfe5d180e350ace",
  measurementId: "G-CCLFEBQ9EK"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const title = notification.title || "UP Pandey Dhaba";
  const options = {
    body: notification.body || "A new customer photo was uploaded.",
    icon: "/assets/images/logo.png",
    badge: "/assets/images/logo.png",
    data: payload.data || {}
  };

  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || "/admin-photos.html";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});
