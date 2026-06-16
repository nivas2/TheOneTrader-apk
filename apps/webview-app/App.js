import React, { useRef, useState, useEffect, useCallback } from 'react';
import { StatusBar, StyleSheet, View, BackHandler, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

const WEB_URL = 'https://pos.feastigo.com/theonetrade';
const API_BASE = 'https://pos.feastigo.com/api/v1';

// Show notification banners even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// JS injected into WebView to extract auth token from localStorage
const INJECTED_JS = `
(function() {
  try {
    var token = localStorage.getItem('token');
    if (token && window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'AUTH_TOKEN', token: token }));
    }
  } catch(e) {}
})();
true;
`;

export default function App() {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fcmToken, setFcmToken] = useState(null);
  const [authToken, setAuthToken] = useState(null);

  // Register device token with server
  const registerDeviceToken = useCallback(async (auth, device) => {
    if (!auth || !device) return;
    try {
      await fetch(`${API_BASE}/auth/device-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth}`,
        },
        body: JSON.stringify({ deviceToken: device, platform: 'android' }),
      });
    } catch (e) {
      console.log('Failed to register device token:', e);
    }
  }, []);

  // Setup notification channel (required for Android 13+) and get FCM token
  const setupNotifications = useCallback(async () => {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return;
    }

    // Create notification channels (required on Android 13+ before requesting permissions)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('signals', {
        name: 'Trading Signals',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00B090',
        sound: 'default',
      });
      await Notifications.setNotificationChannelAsync('general', {
        name: 'General Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00B090',
        sound: 'default',
      });
    }

    // Request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Notification permission not granted');
      return;
    }

    // Get native FCM token (NOT Expo push token)
    try {
      const tokenData = await Notifications.getDevicePushTokenAsync();
      setFcmToken(tokenData.data);
      return tokenData.data;
    } catch (e) {
      console.log('Failed to get device push token:', e);
    }
  }, []);

  // Android back button handler
  useEffect(() => {
    if (Platform.OS === 'android') {
      const onBackPress = () => {
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        return false;
      };
      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }
  }, [canGoBack]);

  // Notification tap handler — deep-link based on notification type
  useEffect(() => {
    const DEEP_LINK_MAP = {
      SIGNAL_NEW: '/theonetrade/signals',
      SIGNAL_STATUS_UPDATE: '/theonetrade/signals',
      SUBSCRIPTION_APPROVED: '/theonetrade/payment',
      SUBSCRIPTION_REJECTED: '/theonetrade/payment',
      PAYMENT_CONFIRMED: '/theonetrade/payment',
      CUSTOM_MESSAGE: '/theonetrade/signals',
      MARKET_ALERT: '/theonetrade/signals',
    };

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      if (webViewRef.current) {
        const data = response.notification.request.content.data || {};
        const type = data.type;
        const url = data.url;
        const targetPath = url || DEEP_LINK_MAP[type] || '/theonetrade/signals';
        webViewRef.current.injectJavaScript(`
          window.location.href = '${targetPath}';
          true;
        `);
      }
    });
    return () => subscription.remove();
  }, []);

  // When both auth token and FCM token are available, register with server
  useEffect(() => {
    if (authToken && fcmToken) {
      registerDeviceToken(authToken, fcmToken);
    }
  }, [authToken, fcmToken, registerDeviceToken]);

  // Handle messages from WebView (auth token extraction)
  const onMessage = useCallback(async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'AUTH_TOKEN' && data.token) {
        setAuthToken(data.token);

        // If we don't have FCM token yet, set up notifications now
        if (!fcmToken) {
          const token = await setupNotifications();
          if (token) {
            registerDeviceToken(data.token, token);
          }
        }
      }
    } catch (e) {
      // Not JSON or not our message — ignore
    }
  }, [fcmToken, setupNotifications, registerDeviceToken]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#00B090" />
      <WebView
        ref={webViewRef}
        source={{ uri: WEB_URL }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        allowsBackForwardNavigationGestures={true}
        mixedContentMode="never"
        allowFileAccess={true}
        mediaPlaybackRequiresUserAction={false}
        thirdPartyCookiesEnabled={true}
        userAgent="Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 TheOneTradeApp/1.0"
        injectedJavaScript={INJECTED_JS}
        onMessage={onMessage}
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
          // Re-inject auth token extraction on every navigation (handles login/logout)
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(INJECTED_JS);
          }
        }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00B090" />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#00B090',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
});
