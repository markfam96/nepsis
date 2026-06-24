// app/_layout.tsx
// Root layout — handles the auth gate before any screen is shown.
// Flow: first launch → SetupPIN → LockScreen → Main app
//       subsequent launches → LockScreen → Main app
//       background > 60s → LockScreen again

import React, { useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus, View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

import LockScreen     from '../src/screens/LockScreen';
import SetupPINScreen from '../src/screens/SetupPINScreen';
import { hasPINSet, isSessionValid, clearSession } from '../src/services/authService';

type AuthGateState = 'loading' | 'setup' | 'locked' | 'unlocked';

export default function RootLayout() {
  const [gateState, setGateState] = useState<AuthGateState>('loading');

  // On mount — determine where we are in the auth flow
  useEffect(() => {
    (async () => {
      const pinSet = await hasPINSet();
      if (!pinSet) { setGateState('setup'); return; }

      const valid = await isSessionValid();
      setGateState(valid ? 'unlocked' : 'locked');
    })();
  }, []);

  // Re-lock when app comes back from background
  useEffect(() => {
    let backgroundedAt: number | null = null;

    const sub = AppState.addEventListener('change', async (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        backgroundedAt = Date.now();
      }
      if (state === 'active' && backgroundedAt) {
        const elapsed = (Date.now() - backgroundedAt) / 1000;
        if (elapsed > 60) {
          await clearSession();
          setGateState('locked');
        }
        backgroundedAt = null;
      }
    });

    return () => sub.remove();
  }, []);

  const handleSetupComplete = useCallback(() => setGateState('locked'),  []);
  const handleUnlocked      = useCallback(() => setGateState('unlocked'), []);

  if (gateState === 'loading') {
    // Blank screen — transitions immediately so no flicker
    return <View style={styles.blank} />;
  }

  if (gateState === 'setup') {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <SetupPINScreen onComplete={handleSetupComplete} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (gateState === 'locked') {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <LockScreen onUnlocked={handleUnlocked} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  // Unlocked — render the full app
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

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: '#1a1a2e' },
});
