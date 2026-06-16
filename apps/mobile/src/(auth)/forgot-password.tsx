import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../services/api';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSendOTP = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      Alert.alert('Success', 'A reset code has been sent to your email');
      setStep('reset');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to send reset code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit code');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { email, code, newPassword });
      Alert.alert('Success', 'Password reset successfully!', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login' as any) },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Reset Password</Text>

        {step === 'email' ? (
          <>
            <Text style={styles.subtitle}>Enter your email to receive a reset code</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.button} onPress={handleSendOTP} disabled={isLoading}>
              <Text style={styles.buttonText}>{isLoading ? 'Sending...' : 'Send Reset Code'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>Enter the code sent to {email}</Text>
            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              textAlign="center"
            />
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="New Password (min 6 chars)"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={isLoading}>
              <Text style={styles.buttonText}>{isLoading ? 'Resetting...' : 'Reset Password'}</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.linkText}>Back to Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#00B090', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#4B5563', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  eyeText: {
    color: '#00B090',
    fontSize: 14,
    fontWeight: '600',
  },
  codeInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingVertical: 16,
    fontSize: 28,
    letterSpacing: 12,
    fontWeight: '700',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#00B090',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  linkText: { textAlign: 'center', color: '#00B090', marginTop: 24, fontWeight: '600' },
});
