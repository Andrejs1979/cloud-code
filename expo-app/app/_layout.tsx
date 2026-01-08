import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View } from 'react-native';
import { ToastProvider } from '../components/ToastProvider';

// Wrap with necessary providers for web
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ToastProvider>
          <StatusBar style="light" />
          <View style={{ flex: 1, backgroundColor: '#09090b' }}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#09090b' },
                // Disable link preview on web to avoid context error
                disableLinkPreview: true,
              }}
            >
              <Stack.Screen name="(tabs)" />
            </Stack>
          </View>
        </ToastProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
// Cache bust 1767841569
// Force rebuild Wed Jan  7 22:08:43 EST 2026
