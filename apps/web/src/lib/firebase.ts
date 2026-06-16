import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: 'AIzaSyBGoWX_gqPKAbJPcMW7TXZj_BS77TYa2Ms',
  authDomain: 'the-one-trade.firebaseapp.com',
  projectId: 'the-one-trade',
  storageBucket: 'the-one-trade.firebasestorage.app',
  messagingSenderId: '520042053233',
  appId: '1:520042053233:web:f049c2196d7341859ee5d0',
};

const VAPID_KEY = 'BLcm_STZfjWjA6_IROnZt9CnKAv5-q3oA-17x6_2hjkwN8VJlcEWH4IAuDExDawihcGfDHthIvU7oXHDfs4G5h8';

const app = initializeApp(firebaseConfig);

let messaging: Messaging | null = null;

function getMessagingInstance(): Messaging | null {
  if (typeof window === 'undefined') return null;
  if (!messaging) {
    try {
      messaging = getMessaging(app);
    } catch {
      return null;
    }
  }
  return messaging;
}

export async function requestFCMToken(): Promise<string | null> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const msg = getMessagingInstance();
    if (!msg) return null;

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const registration = await navigator.serviceWorker.register(`${basePath}/firebase-messaging-sw.js`);

    const token = await getToken(msg, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    return token || null;
  } catch (error) {
    console.error('FCM token error:', error);
    return null;
  }
}

export function onForegroundMessage(callback: (payload: any) => void) {
  const msg = getMessagingInstance();
  if (!msg) return () => {};
  return onMessage(msg, callback);
}
