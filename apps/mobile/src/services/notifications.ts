import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from './api';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    // Suppress signal notifications in foreground — the in-app modal + alarm handles them
    if (data?.type === 'SIGNAL_NEW') {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: true,
        shouldShowBanner: false,
        shouldShowList: true,
      };
    }
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('signals', {
      name: 'Trading Signals',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'alarm.wav',
    });
  }

  try {
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const token = tokenData.data as string;

    // Register token with backend
    await api.post('/auth/device-token', { deviceToken: token }).catch(() => {});

    return token;
  } catch (error) {
    console.error('Failed to get push token:', error);
    return null;
  }
}
