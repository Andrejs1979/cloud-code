// Expo Router entry point for native platforms
import 'global';
import { registerRootComponent } from 'expo-router/entry';
import { LogBox } from 'react-native';

// Log any remaining warnings for debugging
LogBox.addEventListener('warning', (warning) => {
  console.warn('[ReactNative Warning]', warning);
});

// Wrap registration in error handler
try {
  registerRootComponent();
} catch (error) {
  console.error('[AppInit] Failed to register root component:', error);

  // In development, let the error surface for debugging
  if (__DEV__) {
    throw error;
  }
  // In production, the error is logged but the app may show a blank screen
  // Consider adding a proper error boundary at the app root level
}
