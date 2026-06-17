import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const SUPPORT_EMAIL = 'hari@theonetrade.in';
const SEGMENT_LABELS: Record<string, string> = { INTRADAY: 'Intraday', FANDO: 'F&O', MTF: 'MTF', LONGTERM: 'Long Term', SHORTTERM: 'Short Term' };
const PLAN_LABELS: Record<string, string> = { DAILY: 'One Day', WEEKLY: 'One Week', MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', HALF_YEARLY: 'Half Yearly', YEARLY: 'Yearly' };

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

const formatDate = (d: string) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
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
        setSubscriptions(subRes.value.data.data || []);
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

  const activeSub = subscriptions.find((s: any) => s.status === 'ACTIVE');
  const pendingActivation = subscriptions.find((s: any) => s.status === 'PENDING_ACTIVATION');
  const pendingApproval = subscriptions.find((s: any) => s.status === 'PENDING_APPROVAL');
  const expiredSub = !activeSub && !pendingActivation && !pendingApproval && subscriptions.find((s: any) => s.status === 'EXPIRED');

  const renderSubscriptionCard = () => {
    if (activeSub) {
      return (
        <View style={styles.subCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#D1FAE5' }} />
            <Text style={styles.subTitle}>Your Plan is Active</Text>
          </View>
          <Text style={styles.subPlan}>
            {PLAN_LABELS[activeSub.planType] || activeSub.planType} - {SEGMENT_LABELS[activeSub.segment] || activeSub.segment}
          </Text>
          <Text style={styles.subExpiry}>
            Expires: {formatDate(activeSub.expiresAt)}
          </Text>
        </View>
      );
    }

    if (pendingActivation) {
      return (
        <View style={styles.subCardApproved}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Text style={{ fontSize: 16, color: '#1E40AF' }}>{'✓'}</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E40AF' }}>Payment Approved!</Text>
          </View>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F2937', marginTop: 2 }}>
            {PLAN_LABELS[pendingActivation.planType] || pendingActivation.planType} - {SEGMENT_LABELS[pendingActivation.segment] || pendingActivation.segment}
          </Text>
          <Text style={{ fontSize: 13, color: '#1E40AF', marginTop: 6 }}>
            Your plan will unlock on {formatDate(pendingActivation.activatedAt)} at 12:00 AM. You will start receiving signals from that day.
          </Text>
          <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
            Validity: {formatDate(pendingActivation.activatedAt)} to {formatDate(pendingActivation.expiresAt)}
          </Text>
        </View>
      );
    }

    if (pendingApproval) {
      return (
        <View style={styles.subCardPending}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Text style={{ fontSize: 14, color: '#92400E' }}>{'⏳'}</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#92400E' }}>Payment Under Review</Text>
          </View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937', marginTop: 2 }}>
            {PLAN_LABELS[pendingApproval.planType] || pendingApproval.planType} - {SEGMENT_LABELS[pendingApproval.segment] || pendingApproval.segment}
          </Text>
          <Text style={{ fontSize: 13, color: '#92400E', marginTop: 6 }}>
            Your payment is being reviewed. Once approved, your plan will activate from the next day at 12:00 AM.
          </Text>
          <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
            Submitted on {formatDate(pendingApproval.createdAt)}. For queries, contact {SUPPORT_EMAIL}
          </Text>
        </View>
      );
    }

    if (expiredSub) {
      return (
        <TouchableOpacity style={styles.subCardExpired} onPress={() => router.push('/(tabs)/payment' as any)}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#4B5563' }}>Subscription Expired</Text>
          <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
            Your {PLAN_LABELS[expiredSub.planType] || expiredSub.planType} plan expired on {formatDate(expiredSub.expiresAt)}. Tap to renew.
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#00B090', marginTop: 8 }}>Renew Subscription</Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity style={styles.subCardInactive} onPress={() => router.push('/(tabs)/payment' as any)}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F2937' }}>Subscribe & Unlock Premium Signals</Text>
        <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
          Get real-time trading signals with entry, target, and stop loss. Once approved, your plan activates from next day 12:00 AM.
        </Text>
        <Text style={styles.subCta}>Tap to subscribe</Text>
      </TouchableOpacity>
    );
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

      {renderSubscriptionCard()}

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
  subCardApproved: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  subCardPending: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  subCardExpired: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
  subCta: { fontSize: 14, color: '#00B090', fontWeight: '600', marginTop: 8 },
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
