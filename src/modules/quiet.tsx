// src/modules/quiet.tsx
// Stillness / Quiet time — timed silent prayer session with tier tracking and
// persisted progress. One resting verse per session (no switching mid-session).

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  AppState, AppStateStatus,
} from 'react-native';
import { Colors, Spacing, Radius } from '../constants/theme';
import type { QuietTimeTier } from '../types';
import {
  StillnessSession, StillnessStats, loadSessions, recordSession, computeStats,
} from '../services/stillnessStore';

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

const tierInfoFor = (tier: QuietTimeTier) => TIERS.find(t => t.tier === tier) ?? TIERS[0];

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Total time (may be hours) — for the stats tiles.
function formatTotal(seconds: number) {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  if (seconds >= 60) return `${Math.round(seconds / 60)} min`;
  return `${seconds}s`;
}

// A single session's length — for the recent list.
function formatSession(seconds: number) {
  return seconds >= 60 ? `${Math.round(seconds / 60)} min` : `${seconds}s`;
}

function relDay(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const RESTING_VERSES = [
  '"Be still and know that I am God." — Psalm 46:10',
  '"The Lord is my shepherd; I shall not want." — Psalm 23:1',
  '"In returning and rest you shall be saved; in quietness and trust shall be your strength." — Isaiah 30:15',
  '"He leads me beside still waters. He restores my soul." — Psalm 23:2–3',
];

const pickVerse = () => RESTING_VERSES[Math.floor(Math.random() * RESTING_VERSES.length)];

export default function StillnessBody() {
  const [running, setRunning]   = useState(false);
  const [elapsed, setElapsed]   = useState(0);
  const [done, setDone]         = useState(false);
  // One verse, chosen once and held for the whole session (no switching).
  const [verse, setVerse]       = useState(pickVerse);
  const intervalRef             = useRef<ReturnType<typeof setInterval> | null>(null);

  const [sessions, setSessions] = useState<StillnessSession[]>([]);
  const stats: StillnessStats   = computeStats(sessions);

  useEffect(() => { loadSessions().then(setSessions); }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
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
  const finish = async () => {
    setRunning(false);
    setDone(true);
    if (elapsed > 0) setSessions(await recordSession(elapsed));
  };
  const reset  = () => { setRunning(false); setElapsed(0); setDone(false); setVerse(pickVerse()); };

  const currentTier = getTier(elapsed);
  const tierInfo = tierInfoFor(currentTier);

  // While a session is active, keep the screen calm — timer + one verse only.
  const inSession = running || (elapsed > 0 && !done);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#FAF4E8' }} contentContainerStyle={{ flexGrow: 1 }}>
      {/* Timer area */}
      <View style={[styles.timerArea, inSession ? { flex: 1 } : styles.timerAreaIdle]}>
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

      {/* Progress — hidden while a session is in progress to avoid distraction */}
      {!inSession && (
        <View style={styles.progress}>
          <Text style={styles.progressLabel}>Your stillness</Text>

          {/* Stat tiles */}
          <View style={styles.statsRow}>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{stats.currentStreak}</Text>
              <Text style={styles.statCaption}>day streak</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{stats.totalSessions}</Text>
              <Text style={styles.statCaption}>sessions</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{formatTotal(stats.totalSeconds)}</Text>
              <Text style={styles.statCaption}>total time</Text>
            </View>
          </View>

          {stats.totalSessions > 0 && (
            <Text style={styles.statsSummary}>
              This week: {formatTotal(stats.thisWeekSeconds)}   ·   Longest: {formatSession(stats.bestSeconds)}
              {'   ·   '}{stats.daysPracticed} {stats.daysPracticed === 1 ? 'day' : 'days'} practiced
            </Text>
          )}

          {/* Recent sessions */}
          <Text style={[styles.progressLabel, { marginTop: Spacing.lg }]}>Recent sessions</Text>
          {sessions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No sessions yet. Begin your first stillness above — even a few quiet minutes count.
              </Text>
            </View>
          ) : (
            sessions.slice(0, 7).map((s, i) => {
              const info = tierInfoFor(s.tier);
              return (
                <View key={s.ts + '-' + i} style={styles.sessionRow}>
                  <Text style={styles.sessionDate}>{relDay(s.ts)}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={styles.sessionDur}>{formatSession(s.seconds)}</Text>
                  <View style={[styles.tierPill, { backgroundColor: info.color + '18', borderColor: info.color + '44' }]}>
                    <Text style={[styles.tierPillText, { color: info.color }]}>{info.label}</Text>
                  </View>
                </View>
              );
            })
          )}

          {/* Tier guide */}
          <Text style={[styles.progressLabel, { marginTop: Spacing.lg }]}>Depth of stillness</Text>
          <View style={styles.tierGuide}>
            {TIERS.map(t => (
              <View key={t.tier} style={styles.tierRow}>
                <View style={[styles.tierDot, { backgroundColor: t.color }]} />
                <Text style={[styles.tierName, { color: t.color }]}>{t.label}</Text>
                <Text style={styles.tierDesc}>{t.desc}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  timerArea:     { alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  timerAreaIdle: { paddingTop: Spacing.xxl, paddingBottom: Spacing.lg },
  timerLabel:    { color: '#6E6253', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 24 },
  timerCircle:   { width: 160, height: 160, borderRadius: 80, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 24, backgroundColor: '#FFFDF7' },
  timerText:     { color: '#2B2118', fontSize: 36, fontWeight: '300', letterSpacing: 2 },
  tierBadge:     { fontSize: 11, fontWeight: '500', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  verse:         { color: '#6E6253', fontSize: 12, textAlign: 'center', lineHeight: 20, fontStyle: 'italic', marginBottom: 32, paddingHorizontal: Spacing.sm },
  controls:      { gap: Spacing.sm, width: '100%', alignItems: 'center' },
  ctrlBtn:       { width: '80%', paddingVertical: 14, borderRadius: Radius.md, alignItems: 'center' },
  ctrlBtnText:   { color: Colors.gold, fontSize: 14, fontWeight: '500' },
  doneArea:      { alignItems: 'center', width: '100%' },
  doneTitle:     { color: '#7A1F2B', fontSize: 20, fontWeight: '500' },
  doneSub:       { color: '#1D7A5C', fontSize: 13, marginTop: 4 },

  // Progress
  progress:      { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, borderTopWidth: 0.5, borderTopColor: 'rgba(122,31,43,0.14)', paddingTop: Spacing.lg },
  progressLabel: { color: '#6E6253', fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  statsRow:      { flexDirection: 'row', gap: Spacing.sm },
  statTile:      { flex: 1, backgroundColor: '#FFFDF7', borderWidth: 0.5, borderColor: 'rgba(122,31,43,0.14)', borderRadius: Radius.lg, paddingVertical: Spacing.md, alignItems: 'center' },
  statValue:     { color: '#7A1F2B', fontSize: 22, fontWeight: '500' },
  statCaption:   { color: '#9A8E7C', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  statsSummary:  { color: '#6E6253', fontSize: 11, textAlign: 'center', marginTop: Spacing.sm },
  emptyCard:     { backgroundColor: '#FFFDF7', borderWidth: 0.5, borderColor: 'rgba(122,31,43,0.14)', borderRadius: Radius.md, padding: Spacing.md },
  emptyText:     { color: '#9A8E7C', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  sessionRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(122,31,43,0.08)' },
  sessionDate:   { color: '#2B2118', fontSize: 13 },
  sessionDur:    { color: '#2B2118', fontSize: 13, fontWeight: '500' },
  tierPill:      { borderWidth: 0.5, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  tierPillText:  { fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.3 },
  tierGuide:     { gap: 4 },
  tierRow:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  tierDot:       { width: 8, height: 8, borderRadius: 4 },
  tierName:      { fontSize: 11, fontWeight: '500', width: 72 },
  tierDesc:      { fontSize: 11, color: '#9A8E7C' },
});
