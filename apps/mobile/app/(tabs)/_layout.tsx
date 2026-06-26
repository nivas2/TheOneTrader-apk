import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Text } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../../src/context/AuthContext';
import { connectSocket, getSocket } from '../../src/services/socket';
import { playAlarm, stopAlarm } from '../../src/services/alarm';
import SignalAlertModal from '../../src/components/SignalAlertModal';

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{icon}</Text>;
}

export default function TabsLayout() {
  const { token } = useAuth();
  const router = useRouter();
  const [alertSignal, setAlertSignal] = useState<any>(null);
  const [alertStatusUpdate, setAlertStatusUpdate] = useState<string | undefined>(undefined);
  const [alertVisible, setAlertVisible] = useState(false);
  const socketSetup = useRef(false);

  // Set up global socket listener for signal alerts
  useEffect(() => {
    if (!token || socketSetup.current) return;
    socketSetup.current = true;

    let mounted = true;

    (async () => {
      try {
        const socket = await connectSocket();

        socket.on('signal:new', (data: any) => {
          if (!mounted) return;
          if (data.signal && data.alarm) {
            setAlertStatusUpdate(undefined);
            setAlertSignal(data.signal);
            setAlertVisible(true);
            playAlarm().catch(() => {});
          }
        });

        socket.on('signal:update', (data: any) => {
          if (!mounted) return;
          const s = data.signal;
          if (s && s.status && s.status !== 'ACTIVE' && data.alarm) {
            setAlertStatusUpdate(s.status);
            setAlertSignal(s);
            setAlertVisible(true);
            playAlarm().catch(() => {});
          }
        });

        socket.on('silence_alarm', () => {
          if (!mounted) return;
          stopAlarm().catch(() => {});
          setAlertVisible(false);
          setAlertSignal(null);
          setAlertStatusUpdate(undefined);
        });
      } catch {
        // Socket connection failed
      }
    })();

    return () => {
      mounted = false;
      socketSetup.current = false;
    };
  }, [token]);

  // Foreground notification listener — fallback if socket missed the signal
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      if (data?.type === 'SIGNAL_NEW' && !alertVisible) {
        // Socket is the primary channel; this is a fallback with partial data
        const partialSignal = {
          _id: data.signalId,
          action: data.action,
          instrument: data.instrument,
          segment: data.segment,
        };
        setAlertStatusUpdate(undefined);
        setAlertSignal(partialSignal);
        setAlertVisible(true);
        playAlarm().catch(() => {});
      } else if (data?.type === 'SIGNAL_STATUS_UPDATE' && !alertVisible) {
        const partialSignal = {
          _id: data.signalId,
          instrument: data.instrument,
          segment: data.segment,
          status: data.status,
          action: data.action,
        };
        setAlertStatusUpdate(data.status as string);
        setAlertSignal(partialSignal);
        setAlertVisible(true);
        playAlarm().catch(() => {});
      }
    });

    return () => sub.remove();
  }, [alertVisible]);

  // Background/killed notification tap — navigate to signals tab
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.type === 'SIGNAL_NEW' || data?.type === 'SIGNAL_STATUS_UPDATE') {
        router.push('/(tabs)/signals' as any);
      }
    });

    return () => sub.remove();
  }, []);

  const handleAcknowledge = useCallback(() => {
    stopAlarm().catch(() => {});
    setAlertVisible(false);
    setAlertStatusUpdate(undefined);

    const signal = alertSignal;
    setAlertSignal(null);

    const socket = getSocket();
    if (socket && signal?._id) {
      socket.emit('acknowledge_signal_view', { signalId: signal._id });
    }
  }, [alertSignal]);

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#00B090',
          tabBarInactiveTintColor: '#9CA3AF',
          headerStyle: { backgroundColor: '#FFF' },
          headerTitleStyle: { color: '#1F2937', fontWeight: '700' },
          tabBarStyle: { paddingBottom: 4, height: 56 },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarLabel: 'Home',
            tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="signals"
          options={{
            title: 'Signals',
            tabBarLabel: 'Signals',
            tabBarIcon: ({ focused }) => <TabIcon icon="📡" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarLabel: 'History',
            tabBarIcon: ({ focused }) => <TabIcon icon="📊" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="payment"
          options={{
            title: 'Subscribe',
            tabBarLabel: 'Subscribe',
            tabBarIcon: ({ focused }) => <TabIcon icon="💎" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="reviews"
          options={{
            title: 'Reviews',
            tabBarLabel: 'Reviews',
            tabBarIcon: ({ focused }) => <TabIcon icon="⭐" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarLabel: 'Profile',
            tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} />,
          }}
        />
      </Tabs>

      <SignalAlertModal
        visible={alertVisible}
        signal={alertSignal}
        onAcknowledge={handleAcknowledge}
        statusUpdate={alertStatusUpdate}
      />
    </>
  );
}
