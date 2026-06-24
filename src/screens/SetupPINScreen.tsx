// src/screens/SetupPINScreen.tsx
// First-launch only. User sets a 6-digit PIN.
// Biometric enrollment instructions shown after PIN is confirmed.

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  ScrollView,
} from 'react-native';
import { Colors, Spacing, Radius } from '../constants/theme';
import CopticCross from '../components/CopticCross';
import { setPIN, getBiometricCapability } from '../services/authService';

interface Props {
  onComplete: () => void;
}

type Step = 'intro' | 'create' | 'confirm' | 'biometric' | 'done';

const PAD = ['1','2','3','4','5','6','7','8','9','','0','⌫'] as const;

export default function SetupPINScreen({ onComplete }: Props) {
  const [step, setStep]         = useState<Step>('intro');
  const [firstPin, setFirstPin] = useState('');
  const [pin, setPin]           = useState('');
  const [error, setError]       = useState('');
  const [bioType, setBioType]   = useState<'face'|'fingerprint'|'none'>('none');

  const handlePad = useCallback(async (key: string) => {
    if (key === '⌫') { setPin(p => p.slice(0,-1)); setError(''); return; }
    if (key === '')  return;

    const next = pin + key;
    setPin(next);
    setError('');

    if (next.length < 6) return;

    if (step === 'create') {
      setFirstPin(next);
      setPin('');
      setStep('confirm');
      return;
    }

    if (step === 'confirm') {
      if (next === firstPin) {
        await setPIN(next);
        const { available, type } = await getBiometricCapability();
        setBioType(available ? type : 'none');
        setStep(available ? 'biometric' : 'done');
      } else {
        Vibration.vibrate([0,60,60,60]);
        setTimeout(() => { setPin(''); setError("PINs don't match. Try again."); }, 300);
      }
    }
  }, [pin, step, firstPin]);

  const dots = (len: number) =>
    Array.from({ length: 6 }, (_, i) => ({ filled: i < len }));

  const Numpad = ({ currentPin }: { currentPin: string }) => (
    <>
      <View style={styles.dotsRow}>
        {dots(currentPin.length).map((d, i) => (
          <View key={i} style={[styles.dot, d.filled && styles.dotFilled]} />
        ))}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.pad}>
        {PAD.map((key, i) => {
          if (key === '') return <View key={i} style={styles.padKey} />;
          return (
            <TouchableOpacity
              key={i}
              style={[styles.padKey, styles.padKeyActive]}
              onPress={() => handlePad(key)}
              activeOpacity={0.6}
            >
              <Text style={styles.padKeyText}>{key}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  if (step === 'intro') {
    return (
      <View style={styles.root}>
        <View style={{ marginBottom: 10 }}><CopticCross size={44} color={Colors.gold} /></View>
        <Text style={styles.appName}>Nepsis</Text>
        <Text style={styles.title}>Your privacy matters</Text>
        <Text style={styles.body}>
          Nepsis protects your confession journal and personal spiritual data
          with a PIN and optional Face ID or fingerprint.{'\n\n'}
          Your confession notes are stored only on this device and are never
          sent anywhere. Set a 6-digit PIN to get started.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={() => setStep('create')}>
          <Text style={styles.btnText}>Set up my PIN</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'create') {
    return (
      <View style={styles.root}>
        <Text style={styles.stepTitle}>Create a 6-digit PIN</Text>
        <Text style={styles.stepSub}>You'll use this to unlock Nepsis</Text>
        <Numpad currentPin={pin} />
      </View>
    );
  }

  if (step === 'confirm') {
    return (
      <View style={styles.root}>
        <Text style={styles.stepTitle}>Confirm your PIN</Text>
        <Text style={styles.stepSub}>Enter the same PIN again</Text>
        <Numpad currentPin={pin} />
      </View>
    );
  }

  if (step === 'biometric') {
    const label = bioType === 'face' ? 'Face ID' : 'fingerprint';
    return (
      <View style={styles.root}>
        <View style={{ marginBottom: 10 }}><CopticCross size={40} color={Colors.gold} /></View>
        <Text style={styles.stepTitle}>Enable {label}?</Text>
        <Text style={styles.body}>
          You can unlock Nepsis quickly using {label}. Your PIN remains as
          a fallback. This is completely optional.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={() => setStep('done')}>
          <Text style={styles.btnText}>Enable {label}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => setStep('done')}
        >
          <Text style={styles.btnSecondaryText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // done
  return (
    <View style={styles.root}>
      <View style={{ marginBottom: 10 }}><CopticCross size={40} color={Colors.gold} /></View>
      <Text style={styles.stepTitle}>You're protected</Text>
      <Text style={styles.body}>
        Nepsis is secured. Your confession journal requires authentication
        every time you open it — even within an active session.
      </Text>
      <TouchableOpacity style={styles.btn} onPress={onComplete}>
        <Text style={styles.btnText}>Enter Nepsis</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  cross:    { fontSize: 28, color: Colors.gold, marginBottom: 6 },
  appName:  { fontSize: 28, fontWeight: '500', color: Colors.gold, letterSpacing: 2, marginBottom: 24 },
  title:    { fontSize: 20, fontWeight: '500', color: Colors.gold, marginBottom: 16, textAlign: 'center' },
  stepTitle:{ fontSize: 18, fontWeight: '500', color: Colors.gold, marginBottom: 8, textAlign: 'center' },
  stepSub:  { fontSize: 13, color: Colors.goldMuted, marginBottom: 32, textAlign: 'center' },
  body:     { fontSize: 14, color: Colors.goldMuted, lineHeight: 22, textAlign: 'center', marginBottom: 32 },
  dotsRow:  { flexDirection: 'row', gap: 16, marginBottom: 12 },
  dot:      { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: Colors.goldMuted, backgroundColor: 'transparent' },
  dotFilled:{ backgroundColor: Colors.gold, borderColor: Colors.gold },
  error:    { color: Colors.red200, fontSize: 13, marginBottom: 12, textAlign: 'center' },
  pad:      { flexDirection: 'row', flexWrap: 'wrap', width: 280, marginTop: 16, gap: 12 },
  padKey:   { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  padKeyActive: { borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)' },
  padKeyText:   { fontSize: 26, color: Colors.gold, fontWeight: '400' },
  btn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.purple600,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnText:         { color: Colors.gold, fontSize: 15, fontWeight: '500' },
  btnSecondary:    { paddingVertical: 12, alignItems: 'center' },
  btnSecondaryText:{ color: Colors.goldMuted, fontSize: 14 },
});
