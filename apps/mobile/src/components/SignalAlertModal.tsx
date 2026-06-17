import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';

interface SignalAlertModalProps {
  visible: boolean;
  signal: any | null;
  onAcknowledge: () => void;
}

const { width } = Dimensions.get('window');

export default function SignalAlertModal({ visible, signal, onAcknowledge }: SignalAlertModalProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.6, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [visible]);

  if (!signal) return null;

  const isBuy = signal.action === 'BUY';
  const actionColor = isBuy ? '#00B090' : '#EB5757';

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={[styles.pulseRing, { opacity: pulseAnim }]} />

        <View style={styles.card}>
          <View style={styles.alertHeader}>
            <Text style={styles.alertIcon}>&#x1F514;</Text>
            <Text style={styles.alertTitle}>New Signal Alert</Text>
          </View>

          <View style={[styles.actionBadge, { backgroundColor: actionColor }]}>
            <Text style={styles.actionText}>{signal.action}</Text>
          </View>

          <Text style={styles.instrument}>{signal.instrument}</Text>

          <View style={styles.segmentRow}>
            <View style={styles.segmentBadge}>
              <Text style={styles.segmentText}>{signal.segment}</Text>
            </View>
            {signal.subCategory && (
              <View style={styles.segmentBadge}>
                <Text style={styles.segmentText}>{signal.subCategory}</Text>
              </View>
            )}
          </View>

          <View style={styles.priceGrid}>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Entry Range</Text>
              <Text style={styles.priceValue}>
                {signal.entryPriceRange?.min} - {signal.entryPriceRange?.max}
              </Text>
            </View>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Target</Text>
              <Text style={[styles.priceValue, { color: '#00B090' }]}>{signal.targetPrice}</Text>
            </View>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Stop Loss</Text>
              <Text style={[styles.priceValue, { color: '#EB5757' }]}>{signal.stopLoss}</Text>
            </View>
            {signal.safeExit != null && (
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>Safe Exit</Text>
                <Text style={[styles.priceValue, { color: '#F59E0B' }]}>{signal.safeExit}</Text>
              </View>
            )}
          </View>

          {signal.note ? <Text style={styles.note}>{signal.note}</Text> : null}

          <TouchableOpacity style={styles.ackButton} onPress={onAcknowledge} activeOpacity={0.8}>
            <Text style={styles.ackButtonText}>Acknowledge Signal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pulseRing: {
    position: 'absolute',
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: width * 0.45,
    borderWidth: 3,
    borderColor: '#EB5757',
  },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#EB5757',
  },
  alertHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  alertIcon: {
    fontSize: 36,
    marginBottom: 4,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  actionBadge: {
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  actionText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
  },
  instrument: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F9FAFB',
    textAlign: 'center',
    marginBottom: 8,
  },
  segmentRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  segmentBadge: {
    backgroundColor: '#374151',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  segmentText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  priceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  priceItem: {
    flex: 1,
    minWidth: '40%',
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 10,
  },
  priceLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  note: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 16,
  },
  ackButton: {
    backgroundColor: '#00B090',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ackButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
