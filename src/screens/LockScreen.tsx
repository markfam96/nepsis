// src/screens/LockScreen.tsx
// The gate. Shows on every app open and after 60s backgrounded.
// Tries Face ID / fingerprint automatically, offers PIN as fallback.

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Vibration,
  useColorScheme,
} from 'react-native';
import { Colors, Light, Dark, Radius, Spacing } from '../constants/theme';
import CopticCross from '../components/CopticCross';
import {
  verifyPIN,
  getBiometricCapability,
  authenticateWithBiometrics,
} from '../services/authService';

interface Props {
  onUnlocked: () => void;
}

const PAD = ['1','2','3','4','5','6','7','8','9','','0','⌫'] as const;

export default function LockScreen({ onUnlocked }: Props) {
  const scheme   = useColorScheme();
  const theme    = scheme === 'dark' ? Dark : Light;

  const [pin, setPin]         = useState('');
  const [error, setError]     = useState('');
  const [bioType, setBioType] = useState<'face'|'fingerprint'|'none'>('none');
  const [shake, setShake]     = useState(false);

  // Detect biometric capability so we can offer the Face ID / fingerprint
  // shortcut — but do NOT auto-prompt. The PIN pad is the default.
  useEffect(() => {
    (async () => {
      const { available, type } = await getBiometricCapability();
      setBioType(available ? type : 'none');
    })();
  }, []);

  const triggerBiometric = useCallback(async () => {
    const result = await authenticateWithBiometrics('Unlock Nepsis');
    if (result.success) onUnlocked();
    else if (result.error && result.error !== 'cancelled') {
      setError('Face ID unavailable — enter your PIN.');
    }
  }, [onUnlocked]);

  const handlePad = useCallback(async (key: string) => {
    if (key === '⌫') {
      setPin(p => p.slice(0, -1));
      setError('');
      return;
    }
    if (key === '') return;

    const next = pin + key;
    setPin(next);
    setError('');

    if (next.length === 6) {
      const ok = await verifyPIN(next);
      if (ok) {
        onUnlocked();
      } else {
        setShake(true);
        Vibration.vibrate([0, 60, 60, 60]);
        setTimeout(() => {
          setPin('');
          setShake(false);
          setError('Incorrect PIN. Please try again.');
        }, 400);
      }
    }
  }, [pin, onUnlocked]);

  const dots = Array.from({ length: 6 }, (_, i) => ({
    filled: i < pin.length,
  }));

  return (
    <View style={[styles.root, { backgroundColor: Colors.navy }]}>
      {/* App wordmark */}
      <View style={styles.header}>
        <View style={{ marginBottom: 10 }}>
          <CopticCross size={44} color={Colors.gold} />
        </View>
        <Text style={styles.appName}>Nepsis</Text>
        <Text style={styles.subtitle}>Enter your PIN to continue</Text>
      </View>

      {/* PIN dots */}
      <View style={[styles.dotsRow, shake && styles.shake]}>
        {dots.map((d, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              d.filled && styles.dotFilled,
            ]}
          />
        ))}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {/* Numpad */}
      <View style={styles.pad}>
        {PAD.map((key, i) => {
          if (key === '') return <View key={i} style={styles.padKey} />;

          const isBack = key === '⌫';
          return (
            <TouchableOpacity
              key={i}
              style={[styles.padKey, styles.padKeyActive]}
              onPress={() => handlePad(key)}
              activeOpacity={0.6}
            >
              <Text style={[styles.padKeyText, isBack && styles.padKeyBack]}>
                {key}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Biometric shortcut */}
      {bioType !== 'none' && (
        <Pressable style={styles.bioBtn} onPress={triggerBiometric}>
          <Text style={styles.bioBtnText}>
            {bioType === 'face' ? '🔓  Use Face ID' : '🔓  Use fingerprint'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  cross: {
    fontSize: 28,
    color: Colors.gold,
    marginBottom: 6,
  },
  appName: {
    fontSize: 28,
    fontWeight: '500',
    color: Colors.gold,
    letterSpacing: 2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.goldMuted,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  shake: {
    // React Native doesn't do CSS shake animations directly —
    // use Reanimated in production for the shake effect.
    opacity: 0.6,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: Colors.goldMuted,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  error: {
    color: Colors.red200,
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 280,
    marginTop: 24,
    gap: 12,
  },
  padKey: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  padKeyActive: {
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  padKeyText: {
    fontSize: 26,
    color: Colors.gold,
    fontWeight: '400',
  },
  padKeyBack: {
    fontSize: 22,
  },
  bioBtn: {
    marginTop: 36,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(232,213,183,0.3)',
  },
  bioBtnText: {
    color: Colors.goldMuted,
    fontSize: 14,
  },
});
