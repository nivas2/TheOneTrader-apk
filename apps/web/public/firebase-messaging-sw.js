importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBGoWX_gqPKAbJPcMW7TXZj_BS77TYa2Ms',
  authDomain: 'the-one-trade.firebaseapp.com',
  projectId: 'the-one-trade',
  storageBucket: 'the-one-trade.firebasestorage.app',
  messagingSenderId: '520042053233',
  appId: '1:520042053233:web:f049c2196d7341859ee5d0',
});

const messaging = firebase.messaging();

// Deep-link map: notification type → route path
const DEEP_LINK_MAP = {
  SIGNAL_NEW: '/signals',
  SIGNAL_STATUS_UPDATE: '/signals',
  SUBSCRIPTION_APPROVED: '/payment',
  SUBSCRIPTION_REJECTED: '/payment',
  PAYMENT_CONFIRMED: '/payment',
  CUSTOM_MESSAGE: '/signals',
  MARKET_ALERT: '/signals',
  ADMIN_NEW_PAYMENT: '/admin/payments',
  ADMIN_NEW_LEAD: '/admin/dashboard',
  ADMIN_NEW_USER: '/admin/users',
};

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  const notificationTitle = title || 'TheOneTrade';
  const notificationOptions = {
    body: body || 'You have a new notification',
    icon: '/favicon.ico',
    data: payload.data,
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const type = data.type;
  const targetPath = DEEP_LINK_MAP[type] || '/signals';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus an existing window and navigate it
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({ type: 'NOTIFICATION_CLICK', path: targetPath });
          return client;
        }
      }
      return clients.openWindow(targetPath);
    })
  );
});
