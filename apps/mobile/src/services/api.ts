import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://theonetrade.in/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Callback for auth expiry — set by AuthContext
let onAuthExpired: (() => void) | null = null;

export function setOnAuthExpired(cb: () => void) {
  onAuthExpired = cb;
}

api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // SecureStore not available
  }
  return config;
});

// Only force logout for actual session/token expiry, not all 401s
const SESSION_EXPIRED_ERRORS = [
  'Session expired',
  'Token expired',
  'Invalid token',
];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const msg: string = error.response?.data?.error || '';
      const isSessionExpired = SESSION_EXPIRED_ERRORS.some((e) => msg.includes(e));
      if (isSessionExpired) {
        try {
          await SecureStore.deleteItemAsync('token');
          await SecureStore.deleteItemAsync('user');
        } catch {
          // Ignore
        }
        onAuthExpired?.();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
