import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, ActivityIndicator, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://pos.feastigo.com/theonetrade/api/v1';
const SUPPORT_EMAIL = 'hari@theonetrade.in';

const segments = [
  { value: 'INTRADAY', label: 'Intraday' },
  { value: 'FANDO', label: 'F&O' },
  { value: 'MTF', label: 'MTF' },
  { value: 'LONGTERM', label: 'Long Term' },
  { value: 'SHORTTERM', label: 'Short Term' },
];

const SEGMENT_LABELS: Record<string, string> = { INTRADAY: 'Intraday', FANDO: 'F&O', MTF: 'MTF', LONGTERM: 'Long Term', SHORTTERM: 'Short Term' };
const PLAN_LABELS: Record<string, string> = { DAILY: 'One Day', WEEKLY: 'One Week', MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', HALF_YEARLY: 'Half Yearly', YEARLY: 'Yearly' };
const STATUS_LABELS: Record<string, string> = { PENDING_APPROVAL: 'Pending Approval', PENDING_ACTIVATION: 'Activates Tomorrow', ACTIVE: 'Active', EXPIRED: 'Expired', REJECTED: 'Rejected' };
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING_APPROVAL: { bg: '#FEF3C7', text: '#92400E' },
  PENDING_ACTIVATION: { bg: '#DBEAFE', text: '#1E40AF' },
  ACTIVE: { bg: '#D1FAE5', text: '#065F46' },
  EXPIRED: { bg: '#F3F4F6', text: '#374151' },
  REJECTED: { bg: '#FEE2E2', text: '#991B1B' },
};

interface Plan {
  _id: string;
  name: string;
  planType: string;
  segment: string;
  durationDays: number;
  price: number;
  currency: string;
  features: string[];
  isActive: boolean;
}

export default function PaymentScreen() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [segment, setSegment] = useState('');
  const [image, setImage] = useState<any>(null);
  const [utrId, setUtrId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [mySubscriptions, setMySubscriptions] = useState<any[]>([]);

  useEffect(() => {
    api.get('/public/plans')
      .then((res) => setPlans(res.data.data || []))
      .catch(() => {})
      .finally(() => setIsLoadingPlans(false));
    fetchMySubscriptions();
  }, []);

  const fetchMySubscriptions = () => {
    api.get('/client/subscriptions/mine')
      .then((res) => setMySubscriptions(res.data.data || []))
      .catch(() => {});
  };

  const filteredPlans = segment
    ? plans.filter((p) => p.segment === segment && p.isActive)
    : plans.filter((p) => p.isActive);

  const activeSub = mySubscriptions.find((s) => s.status === 'ACTIVE');
  const pendingSubs = mySubscriptions.filter((s) => s.status === 'PENDING_APPROVAL' || s.status === 'PENDING_ACTIVATION');

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPlan) {
      Alert.alert('Error', 'Please select a plan');
      return;
    }
    if (!image) {
      Alert.alert('Error', 'Please upload a payment screenshot');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('receipt', {
        uri: image.uri,
        type: 'image/jpeg',
        name: 'receipt.jpg',
      } as any);
      formData.append('planType', selectedPlan.planType);
      formData.append('segment', selectedPlan.segment);
      formData.append('amount', String(selectedPlan.price));
      if (utrId.trim()) formData.append('utrId', utrId.trim());

      await api.post('/client/subscriptions/upload-receipt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Success', 'Payment receipt uploaded! We will review and activate your subscription.');
      setSelectedPlan(null);
      setSegment('');
      setImage(null);
      setUtrId('');
      fetchMySubscriptions();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Upload failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Active Subscription */}
      {activeSub && (
        <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#00B090' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1F2937' }}>Active Subscription</Text>
          </View>
          <Text style={{ fontSize: 13, color: '#4B5563' }}>
            {SEGMENT_LABELS[activeSub.segment]} - {PLAN_LABELS[activeSub.planType]}
          </Text>
          {activeSub.expiresAt && (
            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
              Expires: {formatDate(activeSub.expiresAt)}
            </Text>
          )}
        </View>
      )}

      {/* Pending Submissions */}
      {pendingSubs.map((sub: any) => {
        const sc = STATUS_COLORS[sub.status] || STATUS_COLORS.EXPIRED;
        return (
          <View key={sub._id} style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#FBBF24' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937' }}>
                {SEGMENT_LABELS[sub.segment]} - {PLAN_LABELS[sub.planType]}
              </Text>
              <View style={{ backgroundColor: sc.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: sc.text }}>{STATUS_LABELS[sub.status]}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: '#6B7280' }}>Submitted: {formatDate(sub.createdAt)}</Text>
            {sub.amount > 0 && <Text style={{ fontSize: 12, color: '#6B7280' }}>Amount: INR {sub.amount}</Text>}
          </View>
        );
      })}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Choose Segment</Text>
        <View style={styles.optionsRow}>
          <TouchableOpacity
            style={[styles.chip, !segment && styles.chipActive]}
            onPress={() => { setSegment(''); setSelectedPlan(null); }}
          >
            <Text style={[styles.chipText, !segment && styles.chipTextActive]}>All</Text>
          </TouchableOpacity>
          {segments.map((seg) => (
            <TouchableOpacity
              key={seg.value}
              style={[styles.chip, segment === seg.value && styles.chipActive]}
              onPress={() => { setSegment(seg.value); setSelectedPlan(null); }}
            >
              <Text style={[styles.chipText, segment === seg.value && styles.chipTextActive]}>{seg.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Choose Plan</Text>
        {isLoadingPlans ? (
          <ActivityIndicator size="small" color="#00B090" />
        ) : filteredPlans.length === 0 ? (
          <Text style={styles.emptyText}>No plans available{segment ? ' for this segment' : ''}</Text>
        ) : (
          <View style={styles.optionsGrid}>
            {filteredPlans.map((plan) => (
              <TouchableOpacity
                key={plan._id}
                style={[styles.planOption, selectedPlan?._id === plan._id && styles.planOptionActive]}
                onPress={() => setSelectedPlan(plan)}
              >
                <Text style={[styles.planName, selectedPlan?._id === plan._id && styles.planNameActive]}>
                  {plan.name}
                </Text>
                <Text style={styles.planPrice}>
                  {plan.currency} {plan.price}
                </Text>
                <Text style={styles.planDuration}>{plan.durationDays} days</Text>
                {plan.features.length > 0 && (
                  <View style={styles.features}>
                    {plan.features.slice(0, 2).map((f, i) => (
                      <Text key={i} style={styles.feature}>{f}</Text>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Activation Note */}
      <View style={{ backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: '#3B82F6' }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E40AF', marginBottom: 4 }}>How it works</Text>
        <Text style={{ fontSize: 12, color: '#1E40AF', lineHeight: 18 }}>
          {'1. Complete payment via UPI and upload screenshot\n2. Our team will review and approve your payment\n3. Once approved, your plan activates from next day 12:00 AM\n4. You will start receiving signals from the activation date'}
        </Text>
        <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 6 }}>
          For queries, contact {SUPPORT_EMAIL}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Pay via UPI</Text>
        <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>
          Scan the QR code below using any UPI app (GPay, PhonePe, Paytm, etc.)
        </Text>
        <View style={styles.qrContainer}>
          <Image
            source={{ uri: `${API_URL.replace('/api/v1', '')}/api/v1/public/payment-qr` }}
            style={styles.qrImage}
            resizeMode="contain"
          />
        </View>
        {selectedPlan && (
          <Text style={{ textAlign: 'center', fontSize: 14, fontWeight: '700', color: '#00B090', marginBottom: 12 }}>
            Pay exactly {selectedPlan.currency} {selectedPlan.price}
          </Text>
        )}

        <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937', marginBottom: 6 }}>UTR / Transaction Reference ID</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 432109876543"
          value={utrId}
          onChangeText={setUtrId}
          keyboardType="default"
          maxLength={30}
        />
        <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 16 }}>
          Enter the 12-digit UTR number from your UPI payment confirmation
        </Text>

        <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
          <Text style={styles.uploadText}>{image ? 'Change Screenshot' : 'Upload Payment Screenshot'}</Text>
        </TouchableOpacity>
        {image && <Image source={{ uri: image.uri }} style={styles.preview} resizeMode="contain" />}
      </View>

      <TouchableOpacity
        style={[styles.submitButton, (!selectedPlan || !image) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting || !selectedPlan || !image}
      >
        <Text style={styles.submitText}>{isSubmitting ? 'Uploading...' : 'Submit Receipt'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingVertical: 12 },
  optionsGrid: { gap: 10 },
  planOption: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 14,
  },
  planOptionActive: { borderColor: '#00B090', backgroundColor: '#00B09010' },
  planName: { fontSize: 15, fontWeight: '600', color: '#4B5563' },
  planNameActive: { color: '#00B090' },
  planPrice: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginTop: 4 },
  planDuration: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  features: { marginTop: 8, gap: 2 },
  feature: { fontSize: 12, color: '#6B7280' },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  chipActive: { borderColor: '#00B090', backgroundColor: '#00B09010' },
  chipText: { fontSize: 13, fontWeight: '500', color: '#4B5563' },
  chipTextActive: { color: '#00B090' },
  qrContainer: { alignItems: 'center', marginBottom: 12 },
  qrImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 4,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#00B090',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  uploadText: { color: '#00B090', fontWeight: '600' },
  preview: { width: '100%', height: 200, borderRadius: 8, marginTop: 12 },
  submitButton: {
    backgroundColor: '#00B090',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
