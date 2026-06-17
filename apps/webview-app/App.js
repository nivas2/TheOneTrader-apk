import React, { useRef, useState, useEffect, useCallback, Component } from 'react';
import {
  StatusBar,
  StyleSheet,
  View,
  BackHandler,
  ActivityIndicator,
  Platform,
  Alert,
  AppState,
  Linking,
  Text,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

const WEB_URL = 'https://pos.feastigo.com/theonetrade';
const API_BASE = 'https://pos.feastigo.com/api/v1';

// Custom user agent — the web app checks for this to detect the native app
const APP_USER_AGENT = 'TheOneTradeApp/1.0 Android';

// Deep-link route map
const ROUTE_MAP = {
  SIGNAL_NEW: '/signals',
  SIGNAL_STATUS_UPDATE: '/signals',
  SUBSCRIPTION_APPROVED: '/payment',
  SUBSCRIPTION_REJECTED: '/payment',
  PAYMENT_CONFIRMED: '/payment',
  CUSTOM_MESSAGE: '/signals',
  MARKET_ALERT: '/signals',
};

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Error Boundary — catches React render crashes so the app doesn't force-close
class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.warn('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' }}>
          <Text style={{ fontSize: 16, color: '#333', textAlign: 'center', padding: 20 }}>
            Something went wrong. Please restart the app.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// Check if a URL belongs to our web app
function isInternalUrl(url) {
  return url.startsWith('https://pos.feastigo.com') || url.startsWith('about:blank');
}

function MainApp() {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [webviewKey, setWebviewKey] = useState(1);
  const notificationSetupDone = useRef(false);
  const setupInProgress = useRef(false);

  // Request notification permission and register for push
  const setupNotifications = useCallback(async () => {
    if (notificationSetupDone.current || setupInProgress.current) return;
    if (!Device.isDevice) return;

    setupInProgress.current = true;

    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('signals', {
          name: 'Trading Signals',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
          lightColor: '#00B090',
        });
        await Notifications.setNotificationChannelAsync('general', {
          name: 'General Notifications',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Notifications Disabled',
          'You won\'t receive trading signals and important updates. Please enable notifications in Settings.',
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      // FCM device token only — getExpoPushTokenAsync crashes standalone APKs
      const deviceToken = await Notifications.getDevicePushTokenAsync();

      if (deviceToken?.data) {
        try {
          await fetch(`${API_BASE}/auth/device-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              deviceToken: deviceToken.data,
              platform: 'android',
            }),
          });
        } catch (e) {
          // Will retry next launch
        }
      }

      notificationSetupDone.current = true;
    } catch (error) {
      console.warn('Notification setup failed:', error);
    } finally {
      setupInProgress.current = false;
    }
  }, []);

  // Re-check permission when app returns from Settings
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active' && !notificationSetupDone.current) {
        try {
          const { status } = await Notifications.getPermissionsAsync();
          if (status === 'granted') {
            setupNotifications();
          }
        } catch (e) {
          // Non-critical
        }
      }
    });
    return () => subscription?.remove();
  }, [setupNotifications]);

  // Setup notifications after delay — let app fully initialize first
  useEffect(() => {
    const timer = setTimeout(() => {
      setupNotifications();
    }, 5000);
    return () => clearTimeout(timer);
  }, [setupNotifications]);

  // Handle notification tap
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const data = response.notification.request.content.data;
        if (data?.type && ROUTE_MAP[data.type]) {
          const targetUrl = WEB_URL + ROUTE_MAP[data.type];
          webViewRef.current?.injectJavaScript(`window.location.href='${targetUrl}';true;`);
        } else if (data?.url) {
          webViewRef.current?.injectJavaScript(`window.location.href='${data.url}';true;`);
        }
      } catch (e) {
        // Non-critical
      }
    });
    return () => subscription?.remove();
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

  // Intercept all navigation requests — prevent crashes from unsupported URL schemes
  const onShouldStartLoadWithRequest = useCallback((request) => {
    const { url } = request;

    // Allow internal URLs to load normally inside WebView
    if (isInternalUrl(url)) {
      return true;
    }

    // For any external URL (whatsapp://, mailto:, tel:, intent://, https://other-domain, etc.)
    // open it in the system browser/handler instead of crashing the WebView
    try {
      Linking.openURL(url);
    } catch (e) {
      // Ignore if the URL can't be opened
    }
    return false;
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#00B090" />
      <WebView
        key={webviewKey}
        ref={webViewRef}
        source={{ uri: WEB_URL }}
        style={styles.webview}
        userAgent={APP_USER_AGENT}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        allowsBackForwardNavigationGestures={true}
        setSupportMultipleWindows={false}
        thirdPartyCookiesEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="compatibility"
        originWhitelist={['https://*', 'http://*']}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
        }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={(syntheticEvent) => {
          console.warn('WebView error:', syntheticEvent.nativeEvent);
        }}
        onRenderProcessGone={() => setWebviewKey((prev) => prev + 1)}
        onContentProcessDidTerminate={() => setWebviewKey((prev) => prev + 1)}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00B090" />
          </View>
        )}
      />
    </View>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
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
