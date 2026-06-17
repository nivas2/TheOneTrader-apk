import { registerRootComponent } from 'expo';
import App from './App';

// Catch unhandled JS errors so they don't crash the native app
if (global.ErrorUtils) {
  const originalHandler = global.ErrorUtils.getGlobalHandler();
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.warn('Global error caught:', error, 'isFatal:', isFatal);
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

registerRootComponent(App);
