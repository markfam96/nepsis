// app/(tabs)/quiet.tsx
// Stillness / Quiet time — timed silent prayer session with tier tracking

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  useColorScheme, AppState, AppStateStatus,
} from 'react-native';
import { Colors, Light, Dark, Spacing, Radius } from '../constants/theme';
import type { QuietTimeTier } from '../types';

// ─── Tier thresholds (minutes) ────────────────────────────────────────────────

const TIERS: { tier: QuietTimeTier; label: string; minMinutes: number; color: string; desc: string }[] = [
  { tier: 'beginner',  label: 'Beginner',  minMinutes: 0,  color: '#6E6253', desc: '1–5 min — learning to be still' },
  { tier: 'growing',   label: 'Growing',   minMinutes: 5,  color: '#1D7A5C', desc: '5–15 min — settling into silence' },
  { tier: 'practiced', label: 'Practiced', minMinutes: 15, color: '#1F4E8C', desc: '15–30 min — dwelling in prayer' },
  { tier: 'deep',      label: 'Deep',      minMinutes: 30, color: '#A8842C', desc: '30+ min — resting in God' },
];

function getTier(seconds: number): QuietTimeTier {
  const mins = seconds / 60;
  if (mins >= 30) return 'deep';
  if (mins >= 15) return 'practiced';
  if (mins >= 5)  return 'growing';
  return 'beginner';
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ─── Placeholder session history ─────────────────────────────────────────────

const HISTORY = [
  { date: 'Today',   duration: '12 min', tier: 'growing'  },
  { date: 'Jun 16',  duration: '22 min', tier: 'practiced' },
  { date: 'Jun 15',  duration: '8 min',  tier: 'growing'  },
  { date: 'Jun 14',  duration: '31 min', tier: 'deep'     },
];

const RESTING_VERSES = [
  '"Be still and know that I am God." — Psalm 46:10',
  '"The Lord is my shepherd; I shall not want." — Psalm 23:1',
  '"In returning and rest you shall be saved; in quietness and trust shall be your strength." — Isaiah 30:15',
  '"He leads me beside still waters. He restores my soul." — Psalm 23:2–3',
];

export default function StillnessBody() {
  const scheme = useColorScheme();
  const th = scheme === 'dark' ? Dark : Light;
  const [running, setRunning]   = useState(false);
  const [elapsed, setElapsed]   = useState(0);
  const [done, setDone]         = useState(false);
  const intervalRef             = useRef<ReturnType<typeof setInterval> | null>(null);
  const verse = RESTING_VERSES[Math.floor(Math.random() * RESTING_VERSES.length)];

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  // Pause if app backgrounds
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s !== 'active') setRunning(false);
    });
    return () => sub.remove();
  }, []);

  const start  = () => { setDone(false); setRunning(true); };
  const pause  = () => setRunning(false);
  const finish = () => { setRunning(false); setDone(true); };
  const reset  = () => { setRunning(false); setElapsed(0); setDone(false); };

  const currentTier = getTier(elapsed);
  const tierInfo = TIERS.find(t => t.tier === currentTier)!;

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF4E8' }}>
      {/* Timer area */}
      <View style={styles.timerArea}>
        <Text style={styles.timerLabel}>Stillness</Text>

        <View style={[styles.timerCircle, { borderColor: '#D4AF37' }]}>
          <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
          <Text style={[styles.tierBadge, { color: tierInfo.color }]}>{tierInfo.label}</Text>
        </View>

        <Text style={styles.verse}>{verse}</Text>

        <View style={styles.controls}>
          {!running && !done && elapsed === 0 && (
            <TouchableOpacity style={[styles.ctrlBtn, { backgroundColor: Colors.teal600 }]} onPress={start}>
              <Text style={styles.ctrlBtnText}>Begin stillness</Text>
            </TouchableOpacity>
          )}
          {running && (
            <>
              <TouchableOpacity style={[styles.ctrlBtn, { backgroundColor: Colors.purple800 }]} onPress={pause}>
                <Text style={styles.ctrlBtnText}>Pause</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.ctrlBtn, { backgroundColor: Colors.teal800 }]} onPress={finish}>
                <Text style={styles.ctrlBtnText}>Complete session</Text>
              </TouchableOpacity>
            </>
          )}
          {!running && elapsed > 0 && !done && (
            <>
              <TouchableOpacity style={[styles.ctrlBtn, { backgroundColor: Colors.teal600 }]} onPress={start}>
                <Text style={styles.ctrlBtnText}>Resume</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.ctrlBtn, { backgroundColor: Colors.teal800 }]} onPress={finish}>
                <Text style={styles.ctrlBtnText}>Complete session</Text>
              </TouchableOpacity>
            </>
          )}
          {done && (
            <View style={styles.doneArea}>
              <Text style={styles.doneTitle}>Glory to God ✦</Text>
              <Text style={styles.doneSub}>{formatTime(elapsed)} · {tierInfo.label}</Text>
              <TouchableOpacity style={[styles.ctrlBtn, { backgroundColor: Colors.purple800, marginTop: 16 }]} onPress={reset}>
                <Text style={styles.ctrlBtnText}>Start new session</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Tier guide */}
      <View style={styles.tierGuide}>
        {TIERS.map(t => (
          <View key={t.tier} style={styles.tierRow}>
            <View style={[styles.tierDot, { backgroundColor: t.color }]} />
            <Text style={[styles.tierName, { color: t.color }]}>{t.label}</Text>
            <Text style={styles.tierDesc}>{t.desc}</Text>
          </View>
        ))}
      </View>

      {/* History */}
      <View style={styles.historyArea}>
        <Text style={styles.historyLabel}>Recent sessions</Text>
        <View style={styles.historyRow}>
          {HISTORY.map((h, i) => (
            <View key={i} style={styles.historyCard}>
              <Text style={styles.historyDate}>{h.date}</Text>
              <Text style={styles.historyDuration}>{h.duration}</Text>
              <Text style={[styles.historyTier, { color: TIERS.find(t => t.tier === h.tier)?.color ?? Colors.gray400 }]}>
                {h.tier}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  timerArea:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  timerLabel:    { color: '#6E6253', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 24 },
  timerCircle:   { width: 160, height: 160, borderRadius: 80, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 24, backgroundColor: '#FFFDF7' },
  timerText:     { color: '#2B2118', fontSize: 36, fontWeight: '300', letterSpacing: 2 },
  tierBadge:     { fontSize: 11, fontWeight: '500', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  verse:         { color: '#6E6253', fontSize: 12, textAlign: 'center', lineHeight: 20, fontStyle: 'italic', marginBottom: 32, paddingHorizontal: Spacing.sm },
  controls:      { gap: Spacing.sm, width: '100%', alignItems: 'center' },
  ctrlBtn:       { width: '80%', paddingVertical: 14, borderRadius: Radius.md, alignItems: 'center' },
  ctrlBtnText:   { color: Colors.gold, fontSize: 14, fontWeight: '500' },
  doneArea:      { alignItems: 'center' },
  doneTitle:     { color: '#7A1F2B', fontSize: 20, fontWeight: '500' },
  doneSub:       { color: '#1D7A5C', fontSize: 13, marginTop: 4 },
  tierGuide:     { paddingHorizontal: Spacing.lg, gap: 4, marginBottom: Spacing.md },
  tierRow:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  tierDot:       { width: 8, height: 8, borderRadius: 4 },
  tierName:      { fontSize: 11, fontWeight: '500', width: 72 },
  tierDesc:      { fontSize: 11, color: '#9A8E7C' },
  historyArea:   { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  historyLabel:  { color: '#6E6253', fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  historyRow:    { flexDirection: 'row', gap: Spacing.sm },
  historyCard:   { flex: 1, backgroundColor: '#FFFDF7', borderWidth: 0.5, borderColor: 'rgba(122,31,43,0.14)', borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center' },
  historyDate:   { color: '#9A8E7C', fontSize: 10, marginBottom: 2 },
  historyDuration:{ color: '#2B2118', fontSize: 13, fontWeight: '500' },
  historyTier:   { fontSize: 9, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 2 },
});
