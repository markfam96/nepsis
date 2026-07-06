// app/(tabs)/confession.tsx
// The confession module — three sub-screens:
//   1. Journal (requires re-authentication to open)
//   2. Examination of conscience (private, on-device only)
//   3. In-session notes (used during the actual confession)

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Vibration, Keyboard,
  KeyboardAvoidingView, Platform, StyleSheet, Alert, useColorScheme,
} from 'react-native';
import { useNavigation } from 'expo-router';
import { Colors, Light, Dark, Spacing, Radius } from '../constants/theme';
import { authenticateForJournal, verifyPIN, setPIN, hasPINSet, getBiometricCapability } from '../services/authService';
import type { SinCategory, SinFrequency, CheckedSin } from '../types';
import { SIN_CATALOGUE, CATEGORY_META } from '../data/sinCatalogue';
import {
  JournalIncident, JournalCategory, loadIncidents, addIncident, deleteIncident, clearIncidents,
} from '../services/journalStore';
import { ExamChecks, loadExam, saveExam, clearExam } from '../services/examinationStore';
import CopticCross from '../components/CopticCross';

const FREQ_LABEL: Record<SinFrequency, string> = { once: 'Once', few: 'A few times', often: 'Often' };

// Meta for each journal domain — the six examination categories plus "Other".
type DomainMeta = { label: string; icon: string; color: string; colorLight: string };
const DOMAIN_META: Record<JournalCategory, DomainMeta> = {
  ...(CATEGORY_META as Record<SinCategory, DomainMeta>),
  other: { label: 'Other', icon: '📝', color: '#4E5D6C', colorLight: '#E7ECF0' },
};

// The six examination domains plus "Other", in display order.
const DOMAINS: JournalCategory[] = ['tongue', 'thoughts', 'hearing', 'eyes', 'actions', 'neglected_practices', 'other'];

// Friendly relative time for a journal timestamp.
function relTime(ms: number): string {
  const d = new Date(ms);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return `Today · ${time}`;
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday · ${time}`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ` · ${time}`;
}

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
            Log the big things and write notes as they happen
          </Text>
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
            Review each day and before confession — carries into your notes
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
          🔒  Everything in this section is stored only on this device and requires Face ID or your PIN to open. Nothing is shared with your spiritual father unless you choose to.
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Section lock (guards the whole confession section) ─────────────────────────

const PIN_PAD = ['1','2','3','4','5','6','7','8','9','','0','⌫'] as const;

function SectionLock({ onUnlock }: { onUnlock: () => void }) {
  const navigation = useNavigation<any>();
  const [pinSet, setPinSet]         = useState<boolean | null>(null);   // null = still loading
  const [bioAvailable, setBioAvailable] = useState(false);
  const [checking, setChecking]     = useState(false);
  const [pinMode, setPinMode]       = useState(false);
  const [pin, setPin]               = useState('');
  const [error, setError]           = useState('');

  // First-time passcode creation
  const [createPhase, setCreatePhase] = useState<'create' | 'confirm'>('create');
  const [firstPin, setFirstPin]     = useState('');

  useEffect(() => {
    Promise.all([hasPINSet(), getBiometricCapability()]).then(([set, cap]) => {
      setBioAvailable(cap.available);
      setPinSet(set);
    });
  }, []);

  const tryBiometric = useCallback(async () => {
    setChecking(true);
    const ok = await authenticateForJournal();
    setChecking(false);
    if (ok) onUnlock();
    else setPinMode(true);   // fall back to PIN entry
  }, [onUnlock]);

  // Unlock (returning user)
  const handleUnlockPad = useCallback(async (key: string) => {
    if (key === '⌫') { setPin(p => p.slice(0, -1)); setError(''); return; }
    if (key === '') return;
    const next = pin + key;
    setPin(next);
    setError('');
    if (next.length === 6) {
      const ok = await verifyPIN(next);
      if (ok) {
        onUnlock();
      } else {
        Vibration.vibrate([0, 60, 60, 60]);
        setTimeout(() => { setPin(''); setError('Incorrect PIN. Please try again.'); }, 250);
      }
    }
  }, [pin, onUnlock]);

  // First-time: create + confirm a passcode
  const handleCreatePad = useCallback(async (key: string) => {
    if (key === '⌫') { setPin(p => p.slice(0, -1)); setError(''); return; }
    if (key === '') return;
    const next = pin + key;
    setPin(next);
    setError('');
    if (next.length < 6) return;
    if (createPhase === 'create') {
      setFirstPin(next);
      setPin('');
      setCreatePhase('confirm');
    } else {
      if (next === firstPin) {
        await setPIN(next);
        onUnlock();
      } else {
        Vibration.vibrate([0, 60, 60, 60]);
        setTimeout(() => { setPin(''); setFirstPin(''); setCreatePhase('create'); setError("Passcodes didn't match. Start again."); }, 300);
      }
    }
  }, [pin, createPhase, firstPin, onUnlock]);

  const MenuLink = (
    <TouchableOpacity onPress={() => navigation.openDrawer?.()} style={{ marginTop: 20 }}>
      <Text style={{ color: Colors.goldMuted, fontSize: 14 }}>☰  Menu</Text>
    </TouchableOpacity>
  );

  const Dots = (
    <View style={styles.pinDotsRow}>
      {Array.from({ length: 6 }, (_, i) => (
        <View key={i} style={[styles.pinDot, i < pin.length && styles.pinDotFilled]} />
      ))}
    </View>
  );

  const Pad = (onKey: (k: string) => void) => (
    <View style={styles.pad}>
      {PIN_PAD.map((key, i) => key === '' ? <View key={i} style={styles.padKey} /> : (
        <TouchableOpacity key={i} style={[styles.padKey, styles.padKeyActive]} onPress={() => onKey(key)} activeOpacity={0.6}>
          <Text style={styles.padKeyText}>{key}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Still checking whether a passcode exists — keep the navy background, no flicker.
  if (pinSet === null) {
    return <View style={[styles.lockGate, { backgroundColor: Colors.navy }]} />;
  }

  // First time entering Confession — set a passcode for the section.
  if (!pinSet) {
    return (
      <View style={[styles.lockGate, { backgroundColor: Colors.navy }]}>
        <Text style={styles.lockGateIcon}>🔒</Text>
        <Text style={styles.lockGateTitle}>Protect your confession</Text>
        <Text style={styles.lockGateBody}>
          {createPhase === 'create'
            ? 'Set a 6-digit passcode. You’ll use it (or Face ID) to open your confession journal, examination, and notes.'
            : 'Enter the same passcode again to confirm.'}
        </Text>
        {Dots}
        {!!error && <Text style={styles.pinError}>{error}</Text>}
        {Pad(handleCreatePad)}
        {MenuLink}
      </View>
    );
  }

  // Returning — unlock with Face ID / passcode.
  return (
    <View style={[styles.lockGate, { backgroundColor: Colors.navy }]}>
      <Text style={styles.lockGateIcon}>🔒</Text>
      <Text style={styles.lockGateTitle}>Confession</Text>

      {pinMode ? (
        <>
          <Text style={styles.lockGateBody}>Enter your passcode to open this section.</Text>
          {Dots}
          {!!error && <Text style={styles.pinError}>{error}</Text>}
          {Pad(handleUnlockPad)}
          {bioAvailable && (
            <TouchableOpacity onPress={tryBiometric} style={{ marginTop: 12 }}>
              <Text style={{ color: Colors.goldMuted, fontSize: 14 }}>Use Face ID / fingerprint</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <>
          <Text style={styles.lockGateBody}>This section is private. Authenticate to open your journal, examination, and confession notes.</Text>
          {bioAvailable && (
            <TouchableOpacity style={styles.lockGateBtn} onPress={tryBiometric} disabled={checking}>
              <Text style={styles.lockGateBtnText}>{checking ? 'Checking…' : '🔓  Use Face ID'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.lockGateBtn, bioAvailable && { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.purple600, marginTop: 10 }]} onPress={() => setPinMode(true)}>
            <Text style={styles.lockGateBtnText}>🔢  Enter passcode</Text>
          </TouchableOpacity>
        </>
      )}

      {MenuLink}
    </View>
  );
}

// ─── Journal ───────────────────────────────────────────────────────────────────

function JournalScreen({ onBack }: { onBack: () => void }) {
  const scheme = useColorScheme();
  const bg   = scheme === 'dark' ? Dark.background : Light.background;
  const text = scheme === 'dark' ? Dark.text : Light.text;
  const sub  = scheme === 'dark' ? Dark.textSecond : Light.textSecond;
  const bdr  = scheme === 'dark' ? Dark.border : Light.border;
  return <JournalContent onBack={onBack} bg={bg} text={text} sub={sub} bdr={bdr} />;
}

// ─── Journal content (unlocked) ────────────────────────────────────────────────

function JournalContent({ onBack, bg, text, sub, bdr }: {
  onBack: () => void; bg: string; text: string; sub: string; bdr: string;
}) {
  const [incidents, setIncidents] = useState<JournalIncident[]>([]);
  const [loaded, setLoaded]       = useState(false);
  const [adding, setAdding]       = useState(false);

  useEffect(() => { loadIncidents().then(list => { setIncidents(list); setLoaded(true); }); }, []);

  const remove = (id: string) => {
    Alert.alert('Remove entry', 'Delete this journal entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => setIncidents(await deleteIncident(id)) },
    ]);
  };

  if (adding) {
    return (
      <IncidentComposer
        bg={bg} text={text} sub={sub} bdr={bdr}
        onCancel={() => setAdding(false)}
        onSave={async (input) => { setIncidents(await addIncident(input)); setAdding(false); }}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View style={[styles.subHeader, { backgroundColor: Colors.navy }]}>
        <TouchableOpacity onPress={onBack}>
          <Text style={{ color: Colors.goldMuted, fontSize: 14 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.subHeaderTitle}>Journal</Text>
        <TouchableOpacity onPress={() => setAdding(true)} hitSlop={12}>
          <Text style={{ color: Colors.gold, fontSize: 26, marginTop: -2 }}>＋</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
        <Text style={[styles.sectionLabel, { color: sub }]}>
          {incidents.length > 0 ? 'Since your last confession' : ''}
        </Text>

        {loaded && incidents.length === 0 && (
          <View style={[styles.emptyCard, { borderColor: bdr }]}>
            <Text style={{ fontSize: 32, marginBottom: 10 }}>📓</Text>
            <Text style={[styles.emptyTitle, { color: text }]}>Nothing logged yet</Text>
            <Text style={[styles.emptyBody, { color: sub }]}>
              As things happen through the day, tap ＋ to note them under one of the six examination
              domains. Whatever you record here will be waiting in your confession notes.
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setAdding(true)}>
              <Text style={styles.emptyBtnText}>＋  Log an incident</Text>
            </TouchableOpacity>
          </View>
        )}

        {incidents.map(inc => {
          const m = DOMAIN_META[inc.category];
          const sin = inc.sinId ? SIN_CATALOGUE.find(s => s.id === inc.sinId) : undefined;
          return (
            <View key={inc.id} style={[styles.journalCard, { borderColor: bdr }]}>
              <View style={styles.journalCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.journalCardTitle, { color: text }]}>{inc.title}</Text>
                  <Text style={[styles.journalCardDate, { color: sub }]}>{relTime(inc.createdAt)}</Text>
                </View>
                <TouchableOpacity onPress={() => remove(inc.id)} hitSlop={10}>
                  <Text style={{ fontSize: 16, color: sub }}>✕</Text>
                </TouchableOpacity>
              </View>
              {!!sin && (
                <Text style={[styles.journalCardExplain, { color: sub }]}>
                  {sin.description}  <Text style={{ color: m.color, fontStyle: 'normal' }}>{sin.scripture}</Text>
                </Text>
              )}
              {!!inc.note && <Text style={[styles.journalCardBody, { color: text }]}>{inc.note}</Text>}
              <View style={styles.passionRow}>
                <View style={[styles.domainTag, { backgroundColor: m.colorLight, borderColor: m.color + '44' }]}>
                  <Text style={{ fontSize: 12 }}>{m.icon}</Text>
                  <Text style={[styles.domainTagText, { color: m.color }]}>{m.label}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Incident composer ─────────────────────────────────────────────────────────

function IncidentComposer({ bg, text, sub, bdr, onCancel, onSave }: {
  bg: string; text: string; sub: string; bdr: string;
  onCancel: () => void;
  onSave: (input: { category: JournalCategory; sinId?: string; title: string; note: string }) => void;
}) {
  const [category, setCategory]     = useState<JournalCategory | null>(null);
  const [sinId, setSinId]           = useState<string | null>(null);
  const [note, setNote]             = useState('');
  const [noteFocused, setNoteFocused] = useState(false);

  const catItems = category ? SIN_CATALOGUE.filter(s => s.category === category) : [];
  const selectedSin = SIN_CATALOGUE.find(s => s.id === sinId);
  const canSave = !!category && (!!sinId || note.trim().length > 0);

  const save = () => {
    if (!category) return;
    const title = selectedSin?.name || note.trim().split('\n')[0].slice(0, 60) || DOMAIN_META[category].label;
    onSave({ category, sinId: sinId ?? undefined, title, note });
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View style={[styles.subHeader, { backgroundColor: Colors.navy }]}>
        <TouchableOpacity onPress={onCancel}>
          <Text style={{ color: Colors.goldMuted, fontSize: 14 }}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.subHeaderTitle}>New entry</Text>
        <TouchableOpacity onPress={save} disabled={!canSave} hitSlop={10}>
          <Text style={{ color: canSave ? Colors.gold : Colors.goldMuted + '66', fontSize: 14, fontWeight: '600' }}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Domain */}
        <Text style={[styles.sectionLabel, { color: sub }]}>Which domain?</Text>
        <View style={styles.domainGrid}>
          {DOMAINS.map(cat => {
            const m = DOMAIN_META[cat];
            const active = category === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.domainChip, {
                  borderColor: active ? m.color : bdr,
                  backgroundColor: active ? m.colorLight : 'transparent',
                }]}
                onPress={() => { setCategory(cat); setSinId(null); }}
              >
                <Text style={{ fontSize: 16 }}>{m.icon}</Text>
                <Text style={[styles.domainChipText, { color: active ? m.color : text }]}>{m.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Optional specific item within the domain — with the same explanations
            as the examination of conscience. */}
        {!!category && catItems.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: sub, marginTop: 20 }]}>
              What was it?  <Text style={{ textTransform: 'none', letterSpacing: 0 }}>(optional — tap to select)</Text>
            </Text>
            {catItems.map(s => {
              const active = sinId === s.id;
              const m = DOMAIN_META[category];
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.pickCard, {
                    borderColor: active ? m.color : bdr,
                    backgroundColor: active ? m.colorLight : 'transparent',
                  }]}
                  onPress={() => setSinId(active ? null : s.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.pickCardHead}>
                    <Text style={[styles.pickCardName, { color: text }]}>{s.name}</Text>
                    <View style={[styles.pickRadio, { borderColor: active ? m.color : bdr, backgroundColor: active ? m.color : 'transparent' }]}>
                      {active && <Text style={styles.pickRadioTick}>✓</Text>}
                    </View>
                  </View>
                  <Text style={[styles.pickCardDesc, { color: sub }]}>{s.description}</Text>
                  <Text style={[styles.pickCardRef, { color: m.color }]}>{s.scripture}</Text>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Note */}
        <View style={styles.noteLabelRow}>
          <Text style={[styles.sectionLabel, { color: sub, marginBottom: 0 }]}>
            What happened?
            {catItems.length > 0 && <Text style={{ textTransform: 'none', letterSpacing: 0 }}>  (optional)</Text>}
          </Text>
          {noteFocused && (
            <TouchableOpacity onPress={() => Keyboard.dismiss()} hitSlop={10}>
              <Text style={[styles.doneLink, { color: Colors.purple600 }]}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
        <TextInput
          style={[styles.noteInput, { color: text, borderColor: bdr, backgroundColor: Light.backgroundSecond }]}
          placeholder={category === 'other' ? 'Describe what you want to confess…' : 'Describe the moment in your own words…'}
          placeholderTextColor={sub}
          multiline
          value={note}
          onChangeText={setNote}
          onFocus={() => setNoteFocused(true)}
          onBlur={() => setNoteFocused(false)}
          textAlignVertical="top"
        />

        <Text style={{ fontSize: 12, color: sub, lineHeight: 18, marginTop: 12 }}>
          🔒  Swipe down or tap Done to close the keyboard. This stays on your device and appears in
          your confession notes. It clears when you delete your notes after confession.
        </Text>
      </ScrollView>
      </KeyboardAvoidingView>
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

  const [incidents, setIncidents] = useState<JournalIncident[]>([]);
  const [exam, setExam]           = useState<ExamChecks>({});
  const [loaded, setLoaded]       = useState(false);
  const [spoken, setSpoken]       = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([loadIncidents(), loadExam()]).then(([list, checks]) => {
      setIncidents(list); setExam(checks); setLoaded(true);
    });
  }, []);

  const toggle = (id: string) => {
    setSpoken(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Unified confession-note items, drawn from both the examination of conscience
  // and the journal. Both feed the confession notes.
  type NoteItem = { id: string; category: JournalCategory; title: string; detail?: string };

  const examItems: NoteItem[] = Object.entries(exam)
    .map(([sinId, freq]): NoteItem | null => {
      const sin = SIN_CATALOGUE.find(s => s.id === sinId);
      if (!sin) return null;
      return { id: `exam:${sinId}`, category: sin.category, title: sin.name, detail: `${FREQ_LABEL[freq]} · ${sin.scripture}` };
    })
    .filter((x): x is NoteItem => x !== null);

  const journalItems: NoteItem[] = incidents.map(inc => ({
    id: inc.id, category: inc.category, title: inc.title, detail: inc.note || undefined,
  }));

  const allItems = [...examItems, ...journalItems];
  const remaining = allItems.length - spoken.size;

  // Group everything by domain, in canonical order.
  const grouped = DOMAINS
    .map(cat => ({ cat, items: allItems.filter(i => i.category === cat) }))
    .filter(g => g.items.length > 0);

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View style={[styles.subHeader, { backgroundColor: '#7A1F2B' }]}>
        <TouchableOpacity onPress={onBack}>
          <Text style={{ color: '#E8C76A', fontSize: 14 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.subHeaderTitle, { color: '#F5E6C8' }]}>In confession</Text>
        <Text style={{ color: '#E8C76A', fontSize: 13 }}>{allItems.length > 0 ? `${remaining} left` : ''}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
        <Text style={[{ fontSize: 12, color: sub, marginBottom: 14, lineHeight: 18 }]}>
          Everything from your examination of conscience and your journal, grouped by domain. Tap each
          as you speak it aloud. Everything stays on this device only.
        </Text>

        {loaded && allItems.length === 0 && (
          <View style={[styles.emptyCard, { borderColor: bdr }]}>
            <Text style={{ fontSize: 32, marginBottom: 10 }}>🕊</Text>
            <Text style={[styles.emptyTitle, { color: text }]}>Nothing noted this period</Text>
            <Text style={[styles.emptyBody, { color: sub }]}>
              Whatever you mark in your examination of conscience or log in your journal will appear
              here, ready to speak. You can still confess freely from the heart.
            </Text>
          </View>
        )}

        {grouped.map(({ cat, items }) => {
          const m = DOMAIN_META[cat];
          return (
            <View key={cat} style={[styles.catCard, { borderColor: bdr }]}>
              <View style={styles.sessionCatHead}>
                <Text style={{ fontSize: 14 }}>{m.icon}</Text>
                <Text style={[styles.catLabel, { color: m.color, marginBottom: 0 }]}>{m.label}</Text>
              </View>
              {items.map(item => {
                const done = spoken.has(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.sessionRow, done && styles.sessionRowDone]}
                    onPress={() => toggle(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.sessionDot, { backgroundColor: done ? Colors.teal600 : m.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.sessionItemName, { color: done ? sub : text }, done && styles.strikethrough]}>
                        {item.title}
                      </Text>
                      {!!item.detail && (
                        <Text style={[styles.sessionItemSub, { color: sub }, done && styles.strikethrough]}>
                          {item.detail}
                        </Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 18, color: done ? Colors.teal600 : bdr, marginTop: 1 }}>
                      {done ? '✓' : '○'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}

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
          onPress: async () => {
            await Promise.all([clearIncidents(), clearExam()]);   // wipe journal + examination
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
          'Update your Canon with any changes your father of confession gave you, if applicable',
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

  // Load any previously saved examination for this period.
  useEffect(() => { loadExam().then(obj => setChecked(new Map(Object.entries(obj) as [string, SinFrequency][]))); }, []);

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
      saveExam(Object.fromEntries(next));   // persist so it flows into confession notes
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
  const [unlocked, setUnlocked] = useState(false);
  const [screen, setScreen]     = useState<SubScreen>('hub');

  // The whole section is locked — unlock once to reach the journal, examination,
  // and confession notes together.
  if (!unlocked) return <SectionLock onUnlock={() => setUnlocked(true)} />;

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
  pinDotsRow:      { flexDirection: 'row', gap: 16, marginTop: 8, marginBottom: 8 },
  pinDot:          { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: Colors.goldMuted, backgroundColor: 'transparent' },
  pinDotFilled:    { backgroundColor: Colors.gold, borderColor: Colors.gold },
  pinError:        { color: Colors.red200, fontSize: 13, marginBottom: 8, textAlign: 'center' },
  pad:             { flexDirection: 'row', flexWrap: 'wrap', width: 264, marginTop: 12, gap: 10, justifyContent: 'center' },
  padKey:          { width: 78, height: 78, alignItems: 'center', justifyContent: 'center' },
  padKeyActive:    { borderRadius: 39, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)' },
  padKeyText:      { fontSize: 26, color: Colors.gold, fontWeight: '400' },
  subHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, paddingTop: Spacing.xl },
  subHeaderTitle:  { fontSize: 15, fontWeight: '500', color: Colors.gold },
  journalCard:     { borderWidth: 0.5, borderRadius: Radius.lg, padding: 12, marginBottom: 8 },
  journalCardHeader:{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  journalCardTitle: { fontSize: 13, fontWeight: '500' },
  journalCardDate:  { fontSize: 11, marginTop: 2 },
  journalCardExplain:{ fontSize: 12, lineHeight: 18, fontStyle: 'italic', marginBottom: 6 },
  journalCardBody:  { fontSize: 12, lineHeight: 18, marginBottom: 8 },
  statusBadge:      { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, borderWidth: 0.5 },
  statusBadgeText:  { fontSize: 10, fontWeight: '500' },
  passionRow:       { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  passionTag:       { backgroundColor: Colors.purple50, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  passionTagText:   { fontSize: 10, color: Colors.purple800 },
  domainTag:        { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 0.5, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  domainTagText:    { fontSize: 11, fontWeight: '500' },

  // Empty states
  emptyCard:        { borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.xl, alignItems: 'center', marginTop: 8 },
  emptyTitle:       { fontSize: 15, fontWeight: '500', marginBottom: 6 },
  emptyBody:        { fontSize: 13, lineHeight: 20, textAlign: 'center' },
  emptyBtn:         { marginTop: 16, backgroundColor: Colors.navy, paddingVertical: 11, paddingHorizontal: 22, borderRadius: Radius.md },
  emptyBtnText:     { color: Colors.gold, fontSize: 13, fontWeight: '500' },

  // Incident composer
  domainGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  domainChip:       { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: 12, minWidth: '47%', flexGrow: 1 },
  domainChipText:   { fontSize: 13, fontWeight: '500' },
  pickCard:         { borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.md, marginTop: Spacing.sm },
  pickCardHead:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  pickCardName:     { flex: 1, fontSize: 13, fontWeight: '500' },
  pickRadio:        { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  pickRadioTick:    { color: '#fff', fontSize: 12, fontWeight: '600' },
  pickCardDesc:     { fontSize: 12, lineHeight: 18, marginTop: 4, marginBottom: 4 },
  pickCardRef:      { fontSize: 11, fontWeight: '500' },
  noteLabelRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 8 },
  doneLink:         { fontSize: 13, fontWeight: '600' },
  noteInput:        { borderWidth: 0.5, borderRadius: Radius.md, padding: 12, minHeight: 110, fontSize: 14, lineHeight: 20 },
  sessionCatHead:   { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  catCard:          { borderWidth: 0.5, borderRadius: Radius.lg, padding: 12, marginBottom: 10 },
  catLabel:         { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  sessionRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.08)' },
  sessionRowDone:   { opacity: 0.38 },
  sessionDot:       { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
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
