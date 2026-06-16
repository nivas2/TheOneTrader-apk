import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setIsLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)/signals');
    } catch (error: any) {
      Alert.alert('Login Failed', error.response?.data?.error || 'Please try again');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>TheOneTrade</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password' as any)}>
            <Text style={styles.forgotLink}>Forgot password?</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={isLoading}>
            <Text style={styles.buttonText}>{isLoading ? 'Signing in...' : 'Sign In'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push('/(auth)/register' as any)}>
          <Text style={styles.linkText}>
            Don't have an account? <Text style={styles.linkHighlight}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brand: { fontSize: 32, fontWeight: '700', color: '#00B090', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#4B5563', textAlign: 'center', marginTop: 8, marginBottom: 32 },
  form: { gap: 16 },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
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
  forgotLink: { color: '#00B090', fontSize: 14, textAlign: 'right' },
  button: {
    backgroundColor: '#00B090',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  linkText: { textAlign: 'center', color: '#4B5563', marginTop: 24 },
  linkHighlight: { color: '#00B090', fontWeight: '600' },
});
