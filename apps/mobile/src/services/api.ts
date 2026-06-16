import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://pos.feastigo.com/theonetrade/api/v1';

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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await SecureStore.deleteItemAsync('token');
        await SecureStore.deleteItemAsync('user');
      } catch {
        // Ignore
      }
      onAuthExpired?.();
    }
    return Promise.reject(error);
  }
);

export default api;
