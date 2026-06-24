// app/(tabs)/confession.tsx
// The confession module — three sub-screens:
//   1. Journal (requires re-authentication to open)
//   2. Examination of conscience (private, on-device only)
//   3. In-session notes (used during the actual confession)

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, useColorScheme,
} from 'react-native';
import { useNavigation } from 'expo-router';
import { Colors, Light, Dark, Spacing, Radius } from '../constants/theme';
import { authenticateForJournal } from '../services/authService';
import type { SinCategory, SinFrequency, CheckedSin } from '../types';
import { SIN_CATALOGUE, CATEGORY_META } from '../data/sinCatalogue';
import CopticCross from '../components/CopticCross';

// ─── Sub-screen type ──────────────────────────────────────────────────────────

type SubScreen = 'hub' | 'journal' | 'examination' | 'session' | 'complete';

// ─── Confession hub ───────────────────────────────────────────────────────────

function ConfessionHub({ onNav }: { onNav: (s: SubScreen) => void }) {
  const scheme = useColorScheme();
  const navigation = useNavigation<any>();
  const bg     = scheme === 'dark' ? Dark.background : Light.background;
  const text   = scheme === 'dark' ? Dark.text : Light.text;
  const sub    = scheme === 'dark' ? Dark.textSecond : Light.textSecond;
  const border = scheme === 'dark' ? Dark.border : Light.border;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={{ padding: Spacing.lg }}>
      {/* Header */}
      <View style={[styles.headerBar, { backgroundColor: Colors.goldAccent, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
        <TouchableOpacity onPress={() => navigation.openDrawer?.()} hitSlop={10}>
          <Text style={{ fontSize: 22, color: '#2B2118' }}>☰</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Confession</Text>
          <Text style={styles.headerSub}>Private · stays on this device</Text>
        </View>
      </View>

      <Text style={[styles.sectionLabel, { color: sub }]}>Prepare</Text>

      {/* Journal */}
      <TouchableOpacity
        style={[styles.moduleCard, { borderColor: border }]}
        onPress={() => onNav('journal')}
      >
        <View style={[styles.moduleIcon, { backgroundColor: Colors.purple50 }]}>
          <Text style={{ fontSize: 20 }}>📓</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.moduleTitle, { color: text }]}>Confession journal</Text>
          <Text style={[styles.moduleSub, { color: sub }]}>
            Log moments as they happen throughout the period
          </Text>
        </View>
        <View style={styles.lockBadge}>
          <Text style={styles.lockBadgeText}>🔒</Text>
        </View>
      </TouchableOpacity>

      {/* Examination */}
      <TouchableOpacity
        style={[styles.moduleCard, { borderColor: border }]}
        onPress={() => onNav('examination')}
      >
        <View style={[styles.moduleIcon, { backgroundColor: Colors.red50 }]}>
          <Text style={{ fontSize: 20 }}>📋</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.moduleTitle, { color: text }]}>Examination of conscience</Text>
          <Text style={[styles.moduleSub, { color: sub }]}>
            Go through all six categories before confession
          </Text>
        </View>
      </TouchableOpacity>

      <Text style={[styles.sectionLabel, { color: sub }]}>During confession</Text>

      {/* In-session */}
      <TouchableOpacity
        style={[styles.moduleCard, { borderColor: Colors.teal200 }]}
        onPress={() => onNav('session')}
      >
        <View style={[styles.moduleIcon, { backgroundColor: Colors.teal50 }]}>
          <Text style={{ fontSize: 20 }}>🙏</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.moduleTitle, { color: text }]}>My confession notes</Text>
          <Text style={[styles.moduleSub, { color: sub }]}>
            Tap each item as you speak it — nothing is sent anywhere
          </Text>
        </View>
      </TouchableOpacity>

      {/* Privacy notice */}
      <View style={[styles.noticeCard, { backgroundColor: Colors.purple50, borderColor: Colors.purple200 }]}>
        <Text style={{ fontSize: 13, color: Colors.purple800, lineHeight: 20 }}>
          🔒  Everything in this section is encrypted and stored only on this device. Your confession journal requires Face ID or your PIN each time you open it. Nothing is shared with your spiritual father unless you choose to.
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Journal (behind re-auth) ─────────────────────────────────────────────────

function JournalScreen({ onBack }: { onBack: () => void }) {
  const [unlocked, setUnlocked]   = useState(false);
  const [checking, setChecking]   = useState(false);
  const scheme = useColorScheme();
  const bg   = scheme === 'dark' ? Dark.background : Light.background;
  const text = scheme === 'dark' ? Dark.text : Light.text;
  const sub  = scheme === 'dark' ? Dark.textSecond : Light.textSecond;
  const bdr  = scheme === 'dark' ? Dark.border : Light.border;

  const unlock = useCallback(async () => {
    setChecking(true);
    const ok = await authenticateForJournal();
    setChecking(false);
    if (ok) {
      setUnlocked(true);
    } else {
      Alert.alert(
        'Authentication required',
        'Please use Face ID, fingerprint, or your PIN to open the journal.',
      );
    }
  }, []);

  if (!unlocked) {
    return (
      <View style={[styles.lockGate, { backgroundColor: Colors.navy }]}>
        <Text style={styles.lockGateIcon}>📓</Text>
        <Text style={styles.lockGateTitle}>Confession journal</Text>
        <Text style={styles.lockGateBody}>
          Your journal is protected. Authenticate to continue.
        </Text>
        <TouchableOpacity style={styles.lockGateBtn} onPress={unlock} disabled={checking}>
          <Text style={styles.lockGateBtnText}>
            {checking ? 'Checking…' : '🔓  Unlock journal'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onBack} style={{ marginTop: 16 }}>
          <Text style={{ color: Colors.goldMuted, fontSize: 14 }}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Sample journal entries (in production, loaded from encrypted SQLite)
  const entries = [
    {
      id: '1', title: 'Spoke harshly to a coworker',
      date: 'Today · 8:42 AM', body: 'Lost patience during a meeting. Said something cutting.',
      passions: ['Anger', 'Pride'], status: 'flagged',
    },
    {
      id: '2', title: 'Missed vespers three days running',
      date: 'Dec 10', body: 'Chose to watch TV instead. Laziness, not obligation.',
      passions: ['Sloth'], status: 'pattern',
    },
    {
      id: '3', title: 'Envious of a friend\'s success',
      date: 'Dec 7', body: 'First reaction to their promotion was resentment. Lingered two days.',
      passions: ['Envy'], status: 'noted',
    },
  ];

  const statusColor = (s: string) => {
    if (s === 'flagged') return Colors.red600;
    if (s === 'pattern') return Colors.amber600;
    return Colors.gray600;
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View style={[styles.subHeader, { backgroundColor: Colors.navy }]}>
        <TouchableOpacity onPress={onBack}>
          <Text style={{ color: Colors.goldMuted, fontSize: 14 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.subHeaderTitle}>Journal</Text>
        <TouchableOpacity>
          <Text style={{ color: Colors.gold, fontSize: 22 }}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
        <Text style={[styles.sectionLabel, { color: sub }]}>Since last confession — Nov 3</Text>

        {entries.map(e => (
          <View key={e.id} style={[styles.journalCard, { borderColor: bdr }]}>
            <View style={styles.journalCardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.journalCardTitle, { color: text }]}>{e.title}</Text>
                <Text style={[styles.journalCardDate, { color: sub }]}>{e.date}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor(e.status) + '18', borderColor: statusColor(e.status) + '55' }]}>
                <Text style={[styles.statusBadgeText, { color: statusColor(e.status) }]}>{e.status}</Text>
              </View>
            </View>
            <Text style={[styles.journalCardBody, { color: sub }]}>{e.body}</Text>
            <View style={styles.passionRow}>
              {e.passions.map(p => (
                <View key={p} style={styles.passionTag}>
                  <Text style={styles.passionTagText}>{p}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── In-session confession notes ───────────────────────────────────────────────

function SessionScreen({ onBack, onComplete }: { onBack: () => void; onComplete: () => void }) {
  const scheme = useColorScheme();
  const bg   = scheme === 'dark' ? Dark.background : Light.background;
  const text = scheme === 'dark' ? Dark.text : Light.text;
  const sub  = scheme === 'dark' ? Dark.textSecond : Light.textSecond;
  const bdr  = scheme === 'dark' ? Dark.border : Light.border;

  const [spoken, setSpoken] = useState<Set<string>>(new Set());

  const items = [
    { id: 't3',  cat: 'Tongue',   name: 'Judging',          freq: 'Often',        ref: 'Mt 7:1',    color: Colors.red600 },
    { id: 't4',  cat: 'Tongue',   name: 'Gossiping',        freq: 'A few times',  ref: 'Prov 11:13',color: Colors.amber600 },
    { id: 't2',  cat: 'Tongue',   name: 'Swearing',         freq: 'Once',         ref: 'Mt 5:34',   color: Colors.gray600 },
    { id: 't5',  cat: 'Tongue',   name: 'Cursing',          freq: 'Once',         ref: 'Eph 4:29',  color: Colors.gray600 },
    { id: 'th1', cat: 'Thoughts', name: 'Pride',            freq: 'Often',        ref: 'Phil 2:3',  color: Colors.red600 },
    { id: 'th3', cat: 'Thoughts', name: 'Lustful thoughts', freq: 'A few times',  ref: 'Mt 5:28',   color: Colors.amber600 },
    { id: 'th5', cat: 'Thoughts', name: 'Envy',             freq: 'Once',         ref: 'Gal 5:26',  color: Colors.gray600 },
  ];

  const toggle = (id: string) => {
    setSpoken(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const remaining = items.length - spoken.size;

  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    (acc[item.cat] ??= []).push(item);
    return acc;
  }, {});

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View style={[styles.subHeader, { backgroundColor: '#7A1F2B' }]}>
        <TouchableOpacity onPress={onBack}>
          <Text style={{ color: '#E8C76A', fontSize: 14 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.subHeaderTitle, { color: '#F5E6C8' }]}>In confession</Text>
        <Text style={{ color: '#E8C76A', fontSize: 13 }}>{remaining} left</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
        <Text style={[{ fontSize: 12, color: sub, marginBottom: 14, lineHeight: 18 }]}>
          Tap each item as you speak it aloud. Your list stays on this device only.
        </Text>

        {Object.entries(grouped).map(([cat, catItems]) => (
          <View key={cat} style={[styles.catCard, { borderColor: bdr }]}>
            <Text style={[styles.catLabel, { color: sub }]}>{cat}</Text>
            {catItems.map(item => {
              const done = spoken.has(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.sessionRow, done && styles.sessionRowDone]}
                  onPress={() => toggle(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.sessionDot, { backgroundColor: done ? Colors.teal600 : item.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sessionItemName, { color: done ? sub : text }, done && styles.strikethrough]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.sessionItemSub, { color: sub }]}>
                      {item.freq} · {item.ref}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 18, color: done ? Colors.teal600 : bdr }}>
                    {done ? '✓' : '○'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        <View style={[styles.noticeCard, { backgroundColor: Colors.gray50, borderColor: Colors.gray100 }]}>
          <Text style={{ fontSize: 12, color: Colors.gray600, lineHeight: 18 }}>
            This is a guide, not a script. If something comes to mind that isn't on the list, speak it freely.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.bigBtn, { backgroundColor: Colors.teal800 }]}
          onPress={onComplete}
        >
          <Text style={styles.bigBtnText}>✓  Confession complete</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── Complete / clean slate ────────────────────────────────────────────────────

function CompleteScreen({ onBack }: { onBack: () => void }) {
  const handleDelete = () => {
    Alert.alert(
      'Delete confession notes',
      'Your examination and journal entries for this period will be permanently deleted from this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: () => {
            // In production: clear encrypted SQLite confession_period table
            Alert.alert('Deleted', 'Your notes have been permanently removed.');
            onBack();
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0A3A2D' }} contentContainerStyle={{ padding: Spacing.xl, alignItems: 'center' }}>
      <View style={{ alignItems: 'center', marginTop: 40, marginBottom: 32 }}>
        <View style={styles.completeCross}>
          <CopticCross size={44} color="#7A1F2B" />
        </View>
        <Text style={styles.completeTitle}>Glory to God</Text>
        <Text style={styles.completeVerse}>
          "If we confess our sins, He is faithful and just to forgive us our sins and to cleanse us from all unrighteousness."
        </Text>
        <Text style={styles.completeRef}>1 John 1:9</Text>
      </View>

      <View style={[styles.catCard, { borderColor: Colors.teal200 + '55', width: '100%' }]}>
        <Text style={[styles.catLabel, { color: Colors.teal200, marginBottom: 12 }]}>After confession</Text>
        {[
          'Receive Holy Communion if you have fasted and are permitted',
          'Fulfill your epitimia as instructed by your father of confession',
          'Your canon tracker resets for the new period',
        ].map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
            <View style={styles.stepNum}><Text style={{ color: Colors.gold, fontSize: 11, fontWeight: '500' }}>{i+1}</Text></View>
            <Text style={{ color: Colors.gold, fontSize: 13, lineHeight: 19, flex: 1 }}>{s}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={[styles.bigBtn, { backgroundColor: Colors.red600, marginTop: 16 }]} onPress={handleDelete}>
        <Text style={styles.bigBtnText}>🗑  Delete my confession notes</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.bigBtn, { backgroundColor: Colors.teal800, marginTop: 8 }]} onPress={onBack}>
        <Text style={styles.bigBtnText}>Return to home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Examination of conscience ────────────────────────────────────────────────

const CATEGORIES: SinCategory[] = ['tongue', 'thoughts', 'hearing', 'eyes', 'actions', 'neglected_practices'];

function ExaminationScreen({ onBack }: { onBack: () => void }) {
  const scheme = useColorScheme();
  const bg   = scheme === 'dark' ? Dark.background : Light.background;
  const text = scheme === 'dark' ? Dark.text : Light.text;
  const sub  = scheme === 'dark' ? Dark.textSecond : Light.textSecond;
  const bdr  = scheme === 'dark' ? Dark.border : Light.border;

  const [checked, setChecked] = useState<Map<string, SinFrequency>>(new Map());
  const [catIndex, setCatIndex] = useState(0);

  const currentCat = CATEGORIES[catIndex];
  const catItems   = SIN_CATALOGUE.filter(s => s.category === currentCat);
  const meta       = CATEGORY_META[currentCat];

  const FREQ_OPTIONS: { label: string; value: SinFrequency; color: string }[] = [
    { label: 'Once',       value: 'once', color: Colors.gray600  },
    { label: 'Few times',  value: 'few',  color: Colors.amber600 },
    { label: 'Often',      value: 'often',color: Colors.red600   },
  ];

  const toggleFreq = (sinId: string, freq: SinFrequency) => {
    setChecked(prev => {
      const next = new Map(prev);
      if (next.get(sinId) === freq) {
        next.delete(sinId);
      } else {
        next.set(sinId, freq);
      }
      return next;
    });
  };

  const totalChecked = checked.size;
  const isFirst = catIndex === 0;
  const isLast  = catIndex === CATEGORIES.length - 1;

  const goNext = () => { if (!isLast) setCatIndex(i => i + 1); };
  const goPrev = () => { if (!isFirst) setCatIndex(i => i - 1); };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Sub-header */}
      <View style={[styles.subHeader, { backgroundColor: '#7A1F2B' }]}>
        <TouchableOpacity onPress={onBack}>
          <Text style={{ color: '#E8C76A', fontSize: 14 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.subHeaderTitle, { color: '#F5E6C8' }]}>Examination</Text>
        <Text style={{ color: '#E8C76A', fontSize: 13 }}>{totalChecked} noted</Text>
      </View>

      {/* Category progress pills */}
      <View style={[styles.catPills, { backgroundColor: '#7A1F2B' }]}>
        {CATEGORIES.map((cat, i) => {
          const m    = CATEGORY_META[cat];
          const cnt  = SIN_CATALOGUE.filter(s => s.category === cat && checked.has(s.id)).length;
          const active = i === catIndex;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setCatIndex(i)}
              style={[styles.catPill, { borderColor: active ? m.color : 'transparent', backgroundColor: active ? m.color + '33' : 'transparent' }]}
            >
              <Text style={{ fontSize: 14 }}>{m.icon}</Text>
              {cnt > 0 && (
                <View style={[styles.catPillBadge, { backgroundColor: m.color }]}>
                  <Text style={styles.catPillBadgeText}>{cnt}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 32 }}>
        {/* Category header */}
        <View style={[styles.catHeaderCard, { backgroundColor: meta.colorLight, borderColor: meta.color + '44' }]}>
          <Text style={[styles.catHeaderIcon]}>{meta.icon}</Text>
          <View>
            <Text style={[styles.catHeaderTitle, { color: meta.color }]}>{meta.label}</Text>
            <Text style={[styles.catHeaderCount, { color: meta.color + 'AA' }]}>
              {catItems.length} items to consider
            </Text>
          </View>
        </View>

        {/* Frequency legend */}
        <View style={[styles.freqLegend, { borderColor: bdr }]}>
          {FREQ_OPTIONS.map(f => (
            <View key={f.value} style={styles.freqLegendItem}>
              <View style={[styles.freqDot, { backgroundColor: f.color }]} />
              <Text style={[styles.freqLegendText, { color: sub }]}>{f.label}</Text>
            </View>
          ))}
        </View>

        {/* Sin items */}
        {catItems.map(sin => {
          const currentFreq = checked.get(sin.id);
          return (
            <View key={sin.id} style={[styles.sinCard, { borderColor: currentFreq ? meta.color + '55' : bdr, backgroundColor: currentFreq ? meta.colorLight : 'transparent' }]}>
              <View style={styles.sinCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sinName, { color: text }]}>{sin.name}</Text>
                  <Text style={[styles.sinDesc, { color: sub }]}>{sin.description}</Text>
                  <Text style={[styles.sinScripture, { color: meta.color }]}>{sin.scripture}</Text>
                </View>
              </View>
              {/* Frequency selector */}
              <View style={styles.freqRow}>
                <Text style={[styles.freqLabel, { color: sub }]}>How often?</Text>
                <View style={styles.freqBtns}>
                  {FREQ_OPTIONS.map(f => {
                    const active = currentFreq === f.value;
                    return (
                      <TouchableOpacity
                        key={f.value}
                        style={[styles.freqBtn, {
                          backgroundColor: active ? f.color : 'transparent',
                          borderColor: active ? f.color : bdr,
                        }]}
                        onPress={() => toggleFreq(sin.id, f.value)}
                      >
                        <Text style={[styles.freqBtnText, { color: active ? '#fff' : sub }]}>
                          {f.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          );
        })}

        {/* Navigation */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navBtn, { borderColor: bdr, opacity: isFirst ? 0.3 : 1 }]}
            onPress={goPrev}
            disabled={isFirst}
          >
            <Text style={[styles.navBtnText, { color: text }]}>← Prev</Text>
          </TouchableOpacity>
          {!isLast ? (
            <TouchableOpacity
              style={[styles.navBtn, { backgroundColor: meta.color, borderColor: meta.color }]}
              onPress={goNext}
            >
              <Text style={[styles.navBtnText, { color: '#fff' }]}>Next →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.navBtn, { backgroundColor: Colors.teal800, borderColor: Colors.teal800 }]}
              onPress={onBack}
            >
              <Text style={[styles.navBtnText, { color: Colors.gold }]}>✓ Done</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Progress indicator */}
        <Text style={[styles.catProgress, { color: sub }]}>
          Category {catIndex + 1} of {CATEGORIES.length}
        </Text>
      </ScrollView>
    </View>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export default function ConfessionScreen() {
  const [screen, setScreen] = useState<SubScreen>('hub');

  if (screen === 'journal')     return <JournalScreen    onBack={() => setScreen('hub')} />;
  if (screen === 'session')     return <SessionScreen    onBack={() => setScreen('hub')} onComplete={() => setScreen('complete')} />;
  if (screen === 'complete')    return <CompleteScreen   onBack={() => setScreen('hub')} />;
  if (screen === 'examination') {
    return <ExaminationScreen onBack={() => setScreen('hub')} />;
  }
  return <ConfessionHub onNav={setScreen} />;
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  headerBar:       { marginHorizontal: -Spacing.lg, marginTop: -Spacing.lg, padding: Spacing.lg, marginBottom: Spacing.lg },
  headerTitle:     { color: '#2B2118', fontSize: 16, fontWeight: '500' },
  headerSub:       { color: '#5C1620', fontSize: 12, marginTop: 2 },
  sectionLabel:    { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 14 },
  moduleCard:      { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 0.5, borderRadius: Radius.lg, marginBottom: 8, backgroundColor: 'transparent' },
  moduleIcon:      { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  moduleTitle:     { fontSize: 14, fontWeight: '500' },
  moduleSub:       { fontSize: 12, marginTop: 2, lineHeight: 17 },
  lockBadge:       { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  lockBadgeText:   { fontSize: 16 },
  noticeCard:      { padding: 12, borderRadius: Radius.md, borderWidth: 0.5, marginTop: 16 },
  lockGate:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  lockGateIcon:    { fontSize: 44, marginBottom: 16 },
  lockGateTitle:   { fontSize: 20, fontWeight: '500', color: Colors.gold, marginBottom: 8 },
  lockGateBody:    { fontSize: 14, color: Colors.goldMuted, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  lockGateBtn:     { backgroundColor: Colors.purple600, paddingVertical: 14, paddingHorizontal: 32, borderRadius: Radius.md },
  lockGateBtnText: { color: Colors.gold, fontSize: 15, fontWeight: '500' },
  subHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, paddingTop: Spacing.xl },
  subHeaderTitle:  { fontSize: 15, fontWeight: '500', color: Colors.gold },
  journalCard:     { borderWidth: 0.5, borderRadius: Radius.lg, padding: 12, marginBottom: 8 },
  journalCardHeader:{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  journalCardTitle: { fontSize: 13, fontWeight: '500' },
  journalCardDate:  { fontSize: 11, marginTop: 2 },
  journalCardBody:  { fontSize: 12, lineHeight: 18, marginBottom: 8 },
  statusBadge:      { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, borderWidth: 0.5 },
  statusBadgeText:  { fontSize: 10, fontWeight: '500' },
  passionRow:       { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  passionTag:       { backgroundColor: Colors.purple50, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  passionTagText:   { fontSize: 10, color: Colors.purple800 },
  catCard:          { borderWidth: 0.5, borderRadius: Radius.lg, padding: 12, marginBottom: 10 },
  catLabel:         { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  sessionRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.08)' },
  sessionRowDone:   { opacity: 0.38 },
  sessionDot:       { width: 8, height: 8, borderRadius: 4 },
  sessionItemName:  { fontSize: 13, fontWeight: '500' },
  sessionItemSub:   { fontSize: 11, marginTop: 2 },
  strikethrough:    { textDecorationLine: 'line-through' },
  bigBtn:           { width: '100%', paddingVertical: 14, borderRadius: Radius.md, alignItems: 'center', marginTop: 10 },
  bigBtnText:       { color: Colors.gold, fontSize: 14, fontWeight: '500' },
  completeCross:    { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.teal50, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  completeTitle:    { fontSize: 22, fontWeight: '500', color: Colors.gold, marginBottom: 12 },
  completeVerse:    { fontSize: 13, color: Colors.goldMuted, textAlign: 'center', fontStyle: 'italic', lineHeight: 20, marginBottom: 6 },
  completeRef:      { fontSize: 12, color: Colors.teal200, fontWeight: '500', marginBottom: 24 },
  stepNum:          { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.navyMid, alignItems: 'center', justifyContent: 'center' },

  // Examination styles
  catPills:         { flexDirection: 'row', gap: Spacing.xs, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  catPill:          { width: 38, height: 38, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  catPillBadge:     { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  catPillBadgeText: { color: '#fff', fontSize: 9, fontWeight: '500' },
  catHeaderCard:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  catHeaderIcon:    { fontSize: 28 },
  catHeaderTitle:   { fontSize: 16, fontWeight: '500' },
  catHeaderCount:   { fontSize: 12, marginTop: 2 },
  freqLegend:       { flexDirection: 'row', gap: Spacing.lg, borderWidth: 0.5, borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.md, justifyContent: 'center' },
  freqLegendItem:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  freqDot:          { width: 8, height: 8, borderRadius: 4 },
  freqLegendText:   { fontSize: 11 },
  sinCard:          { borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  sinCardHeader:    { marginBottom: Spacing.sm },
  sinName:          { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  sinDesc:          { fontSize: 12, lineHeight: 18, marginBottom: 4 },
  sinScripture:     { fontSize: 11, fontWeight: '500' },
  freqRow:          { gap: 6 },
  freqLabel:        { fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.3 },
  freqBtns:         { flexDirection: 'row', gap: Spacing.xs },
  freqBtn:          { flex: 1, paddingVertical: 6, borderRadius: Radius.sm, borderWidth: 1, alignItems: 'center' },
  freqBtnText:      { fontSize: 11, fontWeight: '500' },
  navRow:           { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xl },
  navBtn:           { flex: 1, paddingVertical: 12, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center' },
  navBtnText:       { fontSize: 13, fontWeight: '500' },
  catProgress:      { textAlign: 'center', fontSize: 11, marginTop: Spacing.sm },
});
