import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../services/api';

export default function VerifyScreen() {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit code');
      return;
    }
    setIsLoading(true);
    try {
      await api.post('/auth/verify-otp', { email, code });
      Alert.alert('Success', 'Email verified! You can now login.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login' as any) },
      ]);
    } catch (error: any) {
      Alert.alert('Verification Failed', error.response?.data?.error || 'Please try again');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Email</Text>
      <Text style={styles.subtitle}>Enter the 6-digit code sent to {email}</Text>

      <TextInput
        style={styles.codeInput}
        value={code}
        onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="000000"
        textAlign="center"
      />

      <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={isLoading}>
        <Text style={styles.buttonText}>{isLoading ? 'Verifying...' : 'Verify'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#00B090', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#4B5563', textAlign: 'center', marginTop: 8, marginBottom: 32 },
  codeInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingVertical: 16,
    fontSize: 28,
    letterSpacing: 12,
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#00B090',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
