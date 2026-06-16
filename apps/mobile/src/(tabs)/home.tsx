import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface PerformanceData {
  totalSignals: number;
  hitTarget: number;
  hitSL: number;
  safeExit: number;
  cancelled: number;
  winRate: number;
}

interface ConfigData {
  marqueeWarningText?: string;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [perfRes, configRes, subRes] = await Promise.allSettled([
        api.get('/signals/performance'),
        api.get('/public/config'),
        api.get('/client/subscriptions/mine'),
      ]);

      if (perfRes.status === 'fulfilled') {
        setPerformance(perfRes.value.data.data);
      }
      if (configRes.status === 'fulfilled') {
        setConfig(configRes.value.data.data);
      }
      if (subRes.status === 'fulfilled') {
        const subs = subRes.value.data.data || [];
        setSubscription(subs.find((s: any) => s.status === 'ACTIVE') || null);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#00B090" />}
    >
      {config?.marqueeWarningText ? (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>{config.marqueeWarningText}</Text>
        </View>
      ) : null}

      <Text style={styles.greeting}>Welcome, {user?.name?.split(' ')[0] || 'Trader'}</Text>

      {subscription ? (
        <View style={styles.subCard}>
          <Text style={styles.subTitle}>Active Plan</Text>
          <Text style={styles.subPlan}>{subscription.planType} - {subscription.segment}</Text>
          <Text style={styles.subExpiry}>
            Expires: {new Date(subscription.expiresAt).toLocaleDateString()}
          </Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.subCardInactive} onPress={() => router.push('/(tabs)/payment' as any)}>
          <Text style={[styles.subTitle, { color: '#4B5563' }]}>No Active Subscription</Text>
          <Text style={styles.subCta}>Tap to subscribe and unlock full signals</Text>
        </TouchableOpacity>
      )}

      {performance ? (
        <View style={styles.perfCard}>
          <Text style={styles.perfTitle}>Performance</Text>
          <View style={styles.winRateRow}>
            <Text style={styles.winRateLabel}>Win Rate</Text>
            <Text style={styles.winRateValue}>
              {typeof performance.winRate === 'number' ? `${performance.winRate.toFixed(1)}%` : 'N/A'}
            </Text>
          </View>
          <View style={styles.statsGrid}>
            <StatBox label="Total" value={performance.totalSignals} color="#1F2937" />
            <StatBox label="Target Hit" value={performance.hitTarget} color="#00B090" />
            <StatBox label="SL Hit" value={performance.hitSL} color="#EB5757" />
            <StatBox label="Safe Exit" value={performance.safeExit} color="#F59E0B" />
          </View>
        </View>
      ) : null}

      <View style={styles.quickActions}>
        <Text style={styles.quickTitle}>Quick Actions</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/signals' as any)}>
            <Text style={styles.actionIcon}>{'📡'}</Text>
            <Text style={styles.actionLabel}>Live Signals</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/history' as any)}>
            <Text style={styles.actionIcon}>{'📊'}</Text>
            <Text style={styles.actionLabel}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/payment' as any)}>
            <Text style={styles.actionIcon}>{'💎'}</Text>
            <Text style={styles.actionLabel}>Subscribe</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  warningBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  warningText: { fontSize: 12, color: '#92400E' },
  greeting: { fontSize: 24, fontWeight: '700', color: '#1F2937' },
  subCard: {
    backgroundColor: '#00B090',
    borderRadius: 12,
    padding: 16,
  },
  subCardInactive: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  subTitle: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  subPlan: { fontSize: 20, fontWeight: '700', color: '#FFF', marginTop: 4 },
  subExpiry: { fontSize: 12, color: '#D1FAE5', marginTop: 4 },
  subCta: { fontSize: 14, color: '#00B090', fontWeight: '600', marginTop: 4 },
  perfCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  perfTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  winRateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  winRateLabel: { fontSize: 14, color: '#6B7280' },
  winRateValue: { fontSize: 28, fontWeight: '700', color: '#00B090' },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  quickActions: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  quickTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: { fontSize: 24 },
  actionLabel: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
});
