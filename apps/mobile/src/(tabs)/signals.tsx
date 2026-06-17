import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../services/api';
import { connectSocket, getSocket } from '../services/socket';
import { stopAlarm } from '../services/alarm';
import SignalCard from '../components/SignalCard';

function LockedSignalCard() {
  const router = useRouter();
  return (
    <View style={styles.lockedCard}>
      <View style={styles.lockedHeader}>
        <View style={styles.lockedBadge}><Text style={styles.lockedBadgeText}>---</Text></View>
        <View style={styles.liveTag}>
          <View style={[styles.liveDot, { width: 6, height: 6, borderRadius: 3 }]} />
          <Text style={styles.liveTagText}>LIVE</Text>
        </View>
      </View>
      <View style={{ opacity: 0.15 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>NIFTY 25000 CE</Text>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View><Text style={{ fontSize: 12, color: '#9CA3AF' }}>Entry</Text><Text style={{ fontWeight: '600' }}>***.**</Text></View>
          <View><Text style={{ fontSize: 12, color: '#9CA3AF' }}>Target</Text><Text style={{ fontWeight: '600', color: '#10B981' }}>***.**</Text></View>
          <View><Text style={{ fontSize: 12, color: '#9CA3AF' }}>SL</Text><Text style={{ fontWeight: '600', color: '#EF4444' }}>***.**</Text></View>
        </View>
      </View>
      <View style={styles.lockedOverlay}>
        <Text style={{ fontSize: 28, marginBottom: 4 }}>&#128274;</Text>
        <Text style={styles.lockedTitle}>Signal Locked</Text>
        <Text style={styles.lockedSubtext}>Subscribe to view live signals</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/payment' as any)} style={styles.unlockButton}>
          <Text style={styles.unlockButtonText}>Unlock Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function FomoBanner({ liveCount }: { liveCount: number }) {
  const router = useRouter();
  return (
    <View style={styles.fomoBanner}>
      <View style={styles.fomoLiveRow}>
        <View style={[styles.liveDot, { backgroundColor: '#F87171', width: 6, height: 6, borderRadius: 3 }]} />
        <Text style={styles.fomoLiveText}>Live signals are being sent right now</Text>
      </View>
      <Text style={styles.fomoTitle}>You're missing out on profitable trades!</Text>
      <Text style={styles.fomoDesc}>
        Our subscribers are receiving real-time trading signals with entry, target & stop loss levels.
        {liveCount > 0 ? ` ${liveCount} new signal${liveCount > 1 ? 's' : ''} sent while you were here!` : ''}
      </Text>
      <TouchableOpacity style={styles.fomoButton} onPress={() => router.push('/(tabs)/payment' as any)}>
        <Text style={styles.fomoButtonText}>Subscribe Now & Start Trading</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function SignalsScreen() {
  const [signals, setSignals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean | null>(null);
  const [liveLockedCount, setLiveLockedCount] = useState(0);

  const fetchSignals = async () => {
    try {
      const res = await api.get('/signals/active');
      setSignals(res.data.data || []);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSignals();
    setupSocket();
    // Check subscription status
    api.get('/client/subscriptions/mine')
      .then((res) => {
        const subs = res.data.data || [];
        const active = subs.some((s: any) => s.status === 'ACTIVE');
        setHasActiveSubscription(active);
      })
      .catch(() => setHasActiveSubscription(false));
  }, []);

  const setupSocket = async () => {
    try {
      const socket = await connectSocket();

      socket.on('signal:new', (data: any) => {
        if (hasActiveSubscription) {
          setSignals((prev) => [data.signal, ...prev]);
        } else {
          setLiveLockedCount((prev) => prev + 1);
        }
      });

      socket.on('signal:update', (data: any) => {
        setSignals((prev) =>
          prev.map((s) => (s._id === data.signal._id ? data.signal : s))
            .filter((s) => s.status === 'ACTIVE')
        );
      });
    } catch {
      // Socket connection failed
    }
  };

  const handleAcknowledge = useCallback((signalId: string) => {
    stopAlarm();
    const socket = getSocket();
    if (socket) {
      socket.emit('acknowledge_signal_view', { signalId });
    }
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchSignals();
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading signals...</Text>
      </View>
    );
  }

  const isNonSubscriber = hasActiveSubscription === false;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Active Signals ({signals.length})</Text>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live</Text>
        </View>
      </View>

      <FlatList
        data={signals}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <SignalCard signal={item} onAcknowledge={handleAcknowledge} showAcknowledge />
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#00B090" />}
        ListHeaderComponent={isNonSubscriber ? <FomoBanner liveCount={liveLockedCount} /> : null}
        ListEmptyComponent={
          isNonSubscriber ? (
            <View style={{ gap: 12 }}>
              <LockedSignalCard />
              <LockedSignalCard />
              <LockedSignalCard />
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No active signals right now.</Text>
              <Text style={styles.emptySubtext}>New signals will appear here in real-time.</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#4B5563' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  liveText: { fontSize: 12, color: '#6B7280' },
  list: { padding: 16 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: '#4B5563' },
  emptySubtext: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },

  // FOMO Banner
  fomoBanner: {
    backgroundColor: '#00B090',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  fomoLiveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  fomoLiveText: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  fomoTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 4 },
  fomoDesc: { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 18, marginBottom: 12 },
  fomoButton: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  fomoButtonText: { color: '#00B090', fontSize: 14, fontWeight: '700' },

  // Locked signal card
  lockedCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#D1D5DB',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 140,
  },
  lockedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lockedBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  lockedBadgeText: { fontSize: 12, color: '#9CA3AF', fontWeight: '700' },
  liveTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveTagText: { fontSize: 11, color: '#10B981', fontWeight: '600' },
  lockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  lockedTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 2 },
  lockedSubtext: { fontSize: 12, color: '#6B7280', marginBottom: 8 },
  unlockButton: {
    backgroundColor: '#00B090',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  unlockButtonText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
});
