import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface SignalCardProps {
  signal: any;
  onAcknowledge?: (signalId: string) => void;
  showAcknowledge?: boolean;
}

export default function SignalCard({ signal, onAcknowledge, showAcknowledge }: SignalCardProps) {
  const isBuy = signal.action === 'BUY';
  const isActive = signal.status === 'ACTIVE';
  const isPremiumLocked = signal.requiresPremium;

  const statusColors: Record<string, { bg: string; text: string }> = {
    ACTIVE: { bg: '#DBEAFE', text: '#1E40AF' },
    HIT_TARGET: { bg: '#D1FAE5', text: '#065F46' },
    HIT_SL: { bg: '#FEE2E2', text: '#991B1B' },
    SAFE_EXIT: { bg: '#FEF3C7', text: '#92400E' },
    CANCELLED: { bg: '#F3F4F6', text: '#374151' },
  };

  const statusStyle = statusColors[signal.status] || statusColors.CANCELLED;

  return (
    <View style={[styles.card, isActive && { borderLeftWidth: 4, borderLeftColor: isBuy ? '#00B090' : '#EB5757' }]}>
      <View style={styles.header}>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: isBuy ? '#00B090' : '#EB5757' }]}>
            <Text style={styles.badgeText}>{signal.action}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: '#F3F4F6' }]}>
            <Text style={[styles.badgeText, { color: '#6B7280' }]}>{signal.segment}</Text>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.badgeText, { color: statusStyle.text }]}>{signal.status?.replace('_', ' ')}</Text>
        </View>
      </View>

      <Text style={[styles.instrument, isPremiumLocked && styles.blurred]}>
        {isPremiumLocked ? '****' : signal.instrument}
      </Text>

      <View style={styles.priceGrid}>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Entry</Text>
          <Text style={[styles.priceValue, isPremiumLocked && styles.blurred]}>
            {typeof signal.entryPriceRange?.min === 'number'
              ? `${signal.entryPriceRange.min}-${signal.entryPriceRange.max}`
              : '****'}
          </Text>
        </View>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Target</Text>
          <Text style={[styles.priceValue, { color: '#00B090' }, isPremiumLocked && styles.blurred]}>
            {isPremiumLocked ? '****' : signal.targetPrice}
          </Text>
        </View>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Stop Loss</Text>
          <Text style={[styles.priceValue, { color: '#EB5757' }, isPremiumLocked && styles.blurred]}>
            {isPremiumLocked ? '****' : signal.stopLoss}
          </Text>
        </View>
      </View>

      {signal.note && <Text style={styles.note}>{signal.note}</Text>}

      <Text style={styles.date}>{new Date(signal.createdAt).toLocaleString()}</Text>

      {showAcknowledge && isActive && onAcknowledge && (
        <TouchableOpacity style={styles.ackButton} onPress={() => onAcknowledge(signal._id)}>
          <Text style={styles.ackButtonText}>Acknowledge</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badges: { flexDirection: 'row', gap: 6 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  instrument: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  blurred: { opacity: 0.2 },
  priceGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceItem: { flex: 1 },
  priceLabel: { fontSize: 11, color: '#9CA3AF' },
  priceValue: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginTop: 2 },
  note: { fontSize: 12, color: '#6B7280', fontStyle: 'italic', marginTop: 4 },
  date: { fontSize: 11, color: '#D1D5DB', marginTop: 8 },
  ackButton: {
    backgroundColor: '#00B090',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  ackButtonText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
});
