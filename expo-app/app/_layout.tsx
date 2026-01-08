import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: '#09090b' }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#09090b' },
          }}
        >
          <Stack.Screen name="(tabs)" />
        </Stack>
      </View>
    </SafeAreaProvider>
  );
}
// Cache bust 1767841569
// Force rebuild Wed Jan  7 22:08:43 EST 2026
