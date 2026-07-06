// app/_layout.tsx
// Root layout — the app opens straight to the main screens. Authentication is
// no longer required to open the app; only the Confession section is locked
// (see src/modules/confession.tsx → SectionLock).

import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(drawer)" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
