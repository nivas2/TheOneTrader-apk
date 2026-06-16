import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import api from '../services/api';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    api.get('/client/subscriptions/mine').then((res) => setSubscriptions(res.data.data || [])).catch(() => {});
  }, []);

  const activeSub = subscriptions.find((s: any) => s.status === 'ACTIVE');
  const pendingSubs = subscriptions.filter((s: any) => s.status === 'PENDING_APPROVAL' || s.status === 'PENDING_ACTIVATION');

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login' as any);
  };

  const handleChangePassword = async () => {
    if (currentPassword.length < 6 || newPassword.length < 6) {
      Alert.alert('Error', 'Passwords must be at least 6 characters');
      return;
    }
    setIsChanging(true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      Alert.alert('Success', 'Password changed successfully');
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to change password');
    } finally {
      setIsChanging(false);
    }
  };

  const statusColors: Record<string, { bg: string; text: string }> = {
    ACTIVE: { bg: '#D1FAE5', text: '#065F46' },
    PENDING_APPROVAL: { bg: '#FEF3C7', text: '#92400E' },
    PENDING_ACTIVATION: { bg: '#DBEAFE', text: '#1E40AF' },
    EXPIRED: { bg: '#F3F4F6', text: '#374151' },
    REJECTED: { bg: '#FEE2E2', text: '#991B1B' },
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profile</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{user?.name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{user?.phone}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Member Since</Text>
          <Text style={styles.value}>{new Date(user?.createdAt || '').toLocaleDateString()}</Text>
        </View>
      </View>

      {activeSub && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Active Subscription</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Plan</Text>
            <Text style={styles.value}>{activeSub.planType}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Segment</Text>
            <Text style={styles.value}>{activeSub.segment}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Expires</Text>
            <Text style={styles.value}>{new Date(activeSub.expiresAt).toLocaleDateString()}</Text>
          </View>
        </View>
      )}

      {pendingSubs.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pending Subscriptions</Text>
          {pendingSubs.map((sub: any) => {
            const sc = statusColors[sub.status] || statusColors.EXPIRED;
            return (
              <View key={sub._id} style={styles.pendingItem}>
                <View style={styles.pendingRow}>
                  <Text style={styles.value}>{sub.planType} - {sub.segment}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.text }]}>
                      {sub.status.replace(/_/g, ' ')}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {!activeSub && (
        <TouchableOpacity style={styles.subscribeButton} onPress={() => router.push('/(tabs)/payment' as any)}>
          <Text style={styles.subscribeText}>Subscribe Now</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.changePasswordToggle}
        onPress={() => setShowChangePassword(!showChangePassword)}
      >
        <Text style={styles.changePasswordToggleText}>
          {showChangePassword ? 'Cancel' : 'Change Password'}
        </Text>
      </TouchableOpacity>

      {showChangePassword && (
        <View style={styles.card}>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrentPassword}
            />
            <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)} style={styles.eyeButton}>
              <Text style={styles.eyeText}>{showCurrentPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="New Password (min 6 chars)"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
            />
            <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeButton}>
              <Text style={styles.eyeText}>{showNewPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.changeButton} onPress={handleChangePassword} disabled={isChanging}>
            <Text style={styles.changeButtonText}>
              {isChanging ? 'Changing...' : 'Update Password'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  label: { fontSize: 14, color: '#9CA3AF' },
  value: { fontSize: 14, fontWeight: '500', color: '#1F2937' },
  pendingItem: { paddingVertical: 6 },
  pendingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '600' },
  subscribeButton: {
    backgroundColor: '#00B090',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  subscribeText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  changePasswordToggle: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  changePasswordToggleText: { color: '#4B5563', fontSize: 14, fontWeight: '600' },
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  eyeText: {
    color: '#00B090',
    fontSize: 13,
    fontWeight: '600',
  },
  changeButton: {
    backgroundColor: '#00B090',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  changeButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  logoutButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: '#991B1B', fontSize: 14, fontWeight: '600' },
});
