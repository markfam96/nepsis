// src/modules/psalms.tsx
// Memorize the Psalms as prayed in the Coptic Agpeya. Psalms are grouped by the
// canonical hours, superscriptions omitted, in the Agpeya's own translation.
// Long Psalm 118 is broken into its 22 sections. Spaced repetition brings each
// passage back just as you're about to forget it.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, useColorScheme,
} from 'react-native';
import { Colors, Light, Dark, Spacing, Radius } from '../constants/theme';
import {
  PartCard, Grade, Streak, loadCards, loadSelection, saveSelection, review,
  computeStats, buildQueue, cardId, MASTERED_INTERVAL, loadStreak, recordReviewDay,
  loadNewPerDay, saveNewPerDay,
} from '../services/psalmStore';

// Cloze deletion: show the opening of a passage and blank out the completion,
// keeping trailing punctuation so the shape of the verse stays visible.
function clozeText(text: string): string {
  const words = text.split(/\s+/);
  const show = Math.max(3, Math.round(words.length * 0.45));
  const head = words.slice(0, show).join(' ');
  const tail = words.slice(show).map(w => {
    const core = w.replace(/[^A-Za-z’']/g, '');
    const blank = '＿'.repeat(Math.min(Math.max(core.length, 1), 7));
    const punct = w.match(/[.,;:!?)]+$/);
    return blank + (punct ? punct[0] : '');
  }).join(' ');
  return tail ? `${head} ${tail}` : head;
}
import { HOURS, getParts, getUnits, unitCount, leadUp, psalmHours, hourName } from '../data/agpeyaPsalter';
import { classify, CATEGORY_META } from '../data/psalmMeta';

function CategoryTag({ psalm }: { psalm: number }) {
  const meta = CATEGORY_META[classify(psalm)];
  return (
    <View style={[styles.tag, { backgroundColor: meta.color + '22', borderColor: meta.color + '55' }]}>
      <Text style={[styles.tagText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

export default function PsalmsBody() {
  const scheme = useColorScheme();
  const th = scheme === 'dark' ? Dark : Light;

  const [selection, setSelection] = useState<number[]>([]);
  const [cards, setCards]         = useState<Record<string, PartCard>>({});
  const [streak, setStreak]       = useState<Streak>({ current: 0, last: null });
  const [newPerDay, setNewPerDay] = useState(5);
  const [loading, setLoading]     = useState(true);

  const [view, setView]     = useState<'overview' | 'manage'>('overview');
  const [reader, setReader] = useState<number | null>(null);

  const [queue, setQueue]   = useState<{ psalm: number; part: number }[] | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([loadSelection(), loadCards(), loadStreak(), loadNewPerDay()]).then(([sel, c, st, npd]) => {
      setSelection(sel); setCards(c); setStreak(st); setNewPerDay(npd);
    }).finally(() => setLoading(false));
  }, []);

  const persistSelection = useCallback((next: number[]) => {
    setSelection(next); saveSelection(next);
  }, []);

  const toggle = useCallback((psalm: number) => {
    persistSelection(selection.includes(psalm) ? selection.filter(p => p !== psalm) : [...selection, psalm]);
  }, [selection, persistSelection]);

  const move = useCallback((i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= selection.length) return;
    const next = [...selection];
    [next[i], next[j]] = [next[j], next[i]];
    persistSelection(next);
  }, [selection, persistSelection]);

  const stats = computeStats(selection, cards);

  const startSession = useCallback(() => {
    const q = buildQueue(selection, cards, newPerDay);
    if (!q.length) return;
    setQueue(q); setQIndex(0); setReviewedCount(0); setRevealed(false);
  }, [selection, cards, newPerDay]);

  const changeNewPerDay = useCallback((n: number) => {
    const clamped = Math.max(0, Math.min(99, n));
    setNewPerDay(clamped);
    saveNewPerDay(clamped);
  }, []);

  const grade = useCallback(async (g: Grade) => {
    if (!queue || busy) return;
    setBusy(true);
    const { psalm, part } = queue[qIndex];
    try {
      const updated = await review(psalm, part, cards[cardId(psalm, part)], g);
      setCards(prev => ({ ...prev, [cardId(psalm, part)]: updated }));
      const st = await recordReviewDay();
      setStreak(st);
    } catch (e) {
      // best-effort; keep the session moving even if a write hiccups
    }
    setReviewedCount(c => c + 1);

    // 'Again' re-queues this portion later in the same session.
    const nextQueue = g === 'again' ? [...queue, { psalm, part }] : queue;
    const nextIndex = qIndex + 1;
    if (nextIndex < nextQueue.length) {
      setQueue(nextQueue);
      setQIndex(nextIndex);
      setRevealed(false);
    } else {
      setQueue(null);
    }
    setBusy(false);
  }, [queue, qIndex, cards, busy]);

  if (loading) {
    return <View style={[styles.center, { backgroundColor: th.background }]}><ActivityIndicator color={Colors.purple600} /></View>;
  }

  const hoursLabel = (n: number) => psalmHours(n).map(hourName).join(' · ');

  // ─── Reader ───────────────────────────────────────────────────────────────────
  if (reader != null) {
    const parts = getParts(reader);
    const meta = CATEGORY_META[classify(reader)];
    const selected = selection.includes(reader);
    return (
      <ScrollView style={{ flex: 1, backgroundColor: th.background }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}>
        <TouchableOpacity onPress={() => setReader(null)} style={{ marginBottom: Spacing.md }}>
          <Text style={{ color: Colors.purple600, fontSize: 14 }}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.readerHead}>
          <Text style={[styles.readerTitle, { color: th.text }]}>Psalm {reader}</Text>
          <CategoryTag psalm={reader} />
        </View>
        <Text style={[styles.readerHours, { color: th.textThird }]}>{hoursLabel(reader)}</Text>
        <Text style={[styles.readerBlurb, { color: th.textSecond }]}>{meta.blurb}</Text>
        <TouchableOpacity
          style={[styles.selBtn, { backgroundColor: selected ? th.backgroundThird : Colors.purple600 }]}
          onPress={() => toggle(reader)}
        >
          <Text style={[styles.selBtnText, { color: selected ? th.textSecond : Colors.gold }]}>
            {selected ? '✓ In your list — remove' : '+ Add to my psalms'}
          </Text>
        </TouchableOpacity>

        {parts.map((text, i) => (
          <View key={i} style={{ marginTop: Spacing.lg }}>
            {parts.length > 1 && (
              <Text style={[styles.partLabel, { color: meta.color }]}>Section {i + 1} of {parts.length}</Text>
            )}
            <Text style={[styles.psalmText, { color: th.text }]}>{text}</Text>
          </View>
        ))}
      </ScrollView>
    );
  }

  // ─── Review session ─────────────────────────────────────────────────────────
  if (queue) {
    const { psalm, part } = queue[qIndex];
    const text = getUnits(psalm)[part] ?? '';
    const lead = leadUp(psalm, part);
    const multi = unitCount(psalm) > 1;
    const isNew = !cards[cardId(psalm, part)];
    return (
      <View style={{ flex: 1, backgroundColor: th.background }}>
        <View style={styles.sessionTop}>
          <Text style={[styles.sessionProgress, { color: th.textThird }]}>{qIndex + 1} / {queue.length}</Text>
          <TouchableOpacity onPress={() => setQueue(null)}><Text style={{ color: Colors.purple600, fontSize: 14 }}>End</Text></TouchableOpacity>
        </View>
        <View style={styles.sessionHead}>
          <Text style={[styles.sessionTitle, { color: th.text }]}>
            Psalm {psalm}{multi ? `  ·  portion ${part + 1}/${unitCount(psalm)}` : ''}
          </Text>
          {isNew && <Text style={[styles.newTag, { color: Colors.teal600 }]}>NEW — read & learn</Text>}
        </View>

        <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
          <Text style={[styles.cueLabel, { color: th.textThird, marginBottom: 12 }]}>
            {revealed
              ? 'How well did you recall it?'
              : isNew
                ? 'New — fill in the blanks, then learn it'
                : 'Continue from memory — fill in the blanks'}
          </Text>
          <Text style={styles.psalmText}>
            {lead ? <Text style={{ color: th.textThird }}>{lead} </Text> : null}
            <Text style={{ color: revealed ? Colors.purple600 : th.text, fontWeight: '500' }}>
              {revealed ? text : clozeText(text)}
            </Text>
          </Text>
        </ScrollView>

        <View style={styles.sessionFoot}>
          {!revealed ? (
            <TouchableOpacity style={styles.revealBtn} onPress={() => setRevealed(true)}>
              <Text style={styles.revealBtnText}>Reveal & check</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.gradeRow, busy && { opacity: 0.5 }]} pointerEvents={busy ? 'none' : 'auto'}>
              <Grade2 label="Again" color={Colors.red600} onPress={() => grade('again')} />
              <Grade2 label="Hard"  color="#C4821A"        onPress={() => grade('hard')} />
              <Grade2 label="Good"  color={Colors.teal600} onPress={() => grade('good')} />
              <Grade2 label="Easy"  color="#1F4E8C"        onPress={() => grade('easy')} />
            </View>
          )}
        </View>
      </View>
    );
  }

  // ─── Manage (select by hour & order) ──────────────────────────────────────────
  if (view === 'manage') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: th.background }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}>
        <TouchableOpacity onPress={() => setView('overview')} style={{ marginBottom: Spacing.md }}>
          <Text style={{ color: Colors.purple600, fontSize: 14 }}>‹ Done</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionLabel, { color: th.textSecond }]}>My psalms · in order</Text>
        {selection.length === 0 && (
          <Text style={[styles.muted, { color: th.textThird }]}>None chosen yet — add from the hours below.</Text>
        )}
        {selection.map((p, i) => (
          <View key={p} style={[styles.row, { backgroundColor: th.backgroundSecond, borderColor: th.border }]}>
            <Text style={[styles.rowNum, { color: th.textThird }]}>{i + 1}</Text>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => setReader(p)}>
              <Text style={[styles.rowTitle, { color: th.text }]}>Psalm {p}</Text>
              <Text style={[styles.rowSub, { color: th.textThird }]}>{unitCount(p)} portion{unitCount(p) > 1 ? "s" : ""}</Text>
            </TouchableOpacity>
            <CategoryTag psalm={p} />
            <View style={styles.arrows}>
              <TouchableOpacity onPress={() => move(i, -1)} hitSlop={6}><Text style={[styles.arrow, { color: i === 0 ? th.border : Colors.purple600 }]}>▲</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => move(i, 1)} hitSlop={6}><Text style={[styles.arrow, { color: i === selection.length - 1 ? th.border : Colors.purple600 }]}>▼</Text></TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => toggle(p)} hitSlop={6}><Text style={styles.remove}>✕</Text></TouchableOpacity>
          </View>
        ))}

        {HOURS.map(hour => (
          <View key={hour.key}>
            <Text style={[styles.sectionLabel, { color: th.textSecond, marginTop: Spacing.lg }]}>{hour.name}</Text>
            {hour.psalms.map(p => {
              const on = selection.includes(p);
              return (
                <TouchableOpacity key={p} style={[styles.row, { backgroundColor: th.backgroundSecond, borderColor: on ? Colors.purple600 + '66' : th.border }]} onPress={() => toggle(p)}>
                  <Text style={[styles.addPlus, { color: on ? Colors.teal600 : Colors.purple600 }]}>{on ? '✓' : '+'}</Text>
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => setReader(p)}>
                    <Text style={[styles.rowTitle, { color: th.text }]}>Psalm {p}</Text>
                    <Text style={[styles.rowSub, { color: th.textThird }]}>{unitCount(p)} portion{unitCount(p) > 1 ? "s" : ""}</Text>
                  </TouchableOpacity>
                  <CategoryTag psalm={p} />
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
    );
  }

  // ─── Overview ───────────────────────────────────────────────────────────────
  const masteredPct = stats.totalParts ? Math.round((stats.mastered / stats.totalParts) * 100) : 0;
  const queueSize = buildQueue(selection, cards, newPerDay).length;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: th.background }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 32 }}>
      {reviewedCount > 0 && (
        <View style={[styles.doneBanner, { backgroundColor: Colors.teal50, borderColor: Colors.teal600 }]}>
          <Text style={{ color: Colors.teal600, fontSize: 13, fontWeight: '500' }}>
            ✦  Reviewed {reviewedCount} {reviewedCount === 1 ? 'passage' : 'passages'} — glory to God.
          </Text>
        </View>
      )}

      {selection.length === 0 ? (
        <View style={[styles.empty, { borderColor: th.border }]}>
          <Text style={[styles.emptyTitle, { color: th.text }]}>Memorize the Agpeya Psalms</Text>
          <Text style={[styles.emptyText, { color: th.textSecond }]}>
            Choose psalms from the canonical hours to hide in your heart. They appear as in the Agpeya —
            without the superscriptions — and Psalm 118 is broken into its 22 sections. Spaced repetition
            brings each passage back just as you're about to forget it.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setView('manage')}>
            <Text style={styles.primaryBtnText}>Choose psalms</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={[styles.hero, { backgroundColor: Colors.navy }]}>
            <Text style={styles.heroLabel}>MEMORIZE THE PSALTER</Text>
            <Text style={styles.heroBig}>{stats.mastered} <Text style={styles.heroOf}>/ {stats.totalParts} passages mature</Text></Text>
            <View style={styles.heroBarTrack}><View style={[styles.heroBarFill, { width: `${masteredPct}%` }]} /></View>
            {streak.current > 0 && (
              <Text style={styles.heroStreak}>🔥  {streak.current}-day streak</Text>
            )}
          </View>

          <View style={styles.statRow}>
            <Stat label="New" value={stats.newCount} color={th.textSecond} th={th} />
            <Stat label="Learning" value={stats.learning} color={Colors.amber600} th={th} />
            <Stat label="Memorized" value={stats.mastered} color={Colors.teal600} th={th} />
          </View>

          <TouchableOpacity
            style={[styles.reviewBtn, { backgroundColor: queueSize ? Colors.purple600 : th.backgroundThird }]}
            onPress={startSession}
            disabled={queueSize === 0}
          >
            <Text style={[styles.reviewBtnText, { color: queueSize ? Colors.gold : th.textThird }]}>
              {queueSize > 0 ? `Review ${queueSize} today` : 'All caught up for today ✦'}
            </Text>
          </TouchableOpacity>

          {/* New cards per day */}
          <Text style={[styles.sectionLabel, { color: th.textSecond, marginBottom: Spacing.sm }]}>New passages per day</Text>
          <View style={styles.npdRow}>
            <TouchableOpacity style={[styles.npdStep, { borderColor: th.border }]} onPress={() => changeNewPerDay(newPerDay - 1)}>
              <Text style={[styles.npdStepText, { color: Colors.purple600 }]}>−</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.npdInput, { color: th.text, borderColor: th.border }]}
              keyboardType="number-pad"
              value={String(newPerDay)}
              selectTextOnFocus
              maxLength={2}
              onChangeText={t => {
                const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
                if (!Number.isNaN(n)) changeNewPerDay(n);
                else if (t === '') setNewPerDay(0);
              }}
            />
            <TouchableOpacity style={[styles.npdStep, { borderColor: th.border }]} onPress={() => changeNewPerDay(newPerDay + 1)}>
              <Text style={[styles.npdStepText, { color: Colors.purple600 }]}>+</Text>
            </TouchableOpacity>
            <Text style={[styles.npdHint, { color: th.textThird }]}>new passages each day</Text>
          </View>

          <View style={styles.listHead}>
            <Text style={[styles.sectionLabel, { color: th.textSecond }]}>My psalms</Text>
            <TouchableOpacity onPress={() => setView('manage')}><Text style={{ color: Colors.purple600, fontSize: 13, fontWeight: '500' }}>Manage</Text></TouchableOpacity>
          </View>

          {selection.map(p => {
            const parts = unitCount(p);
            let mastered = 0;
            for (let i = 0; i < parts; i++) {
              const c = cards[cardId(p, i)];
              if (c && c.intervalDays >= MASTERED_INTERVAL) mastered++;
            }
            return (
              <TouchableOpacity key={p} style={[styles.row, { backgroundColor: th.backgroundSecond, borderColor: th.border }]} onPress={() => setReader(p)}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: th.text }]}>Psalm {p}</Text>
                  <Text style={[styles.rowSub, { color: th.textThird }]}>{mastered}/{parts} memorized</Text>
                </View>
                <CategoryTag psalm={p} />
              </TouchableOpacity>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

function Grade2({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.gradeBtn, { backgroundColor: color }]} onPress={onPress}>
      <Text style={styles.gradeText}>{label}</Text>
    </TouchableOpacity>
  );
}

function Stat({ label, value, color, th }: { label: string; value: number; color: string; th: any }) {
  return (
    <View style={[styles.statCard, { backgroundColor: th.backgroundSecond, borderColor: th.border }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: th.textThird }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted:         { fontSize: 13, marginBottom: Spacing.sm },

  tag:           { borderWidth: 0.5, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  tagText:       { fontSize: 10, fontWeight: '500' },

  hero:          { borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.md },
  heroLabel:     { color: Colors.goldMuted, fontSize: 11, letterSpacing: 1, marginBottom: 8 },
  heroBig:       { color: Colors.gold, fontSize: 24, fontWeight: '500' },
  heroOf:        { fontSize: 13, color: Colors.goldMuted, fontWeight: '400' },
  heroBarTrack:  { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden', marginTop: 12 },
  heroBarFill:   { height: '100%', borderRadius: 3, backgroundColor: Colors.gold },
  heroStreak:    { color: Colors.goldMuted, fontSize: 13, fontWeight: '500', marginTop: 10 },

  statRow:       { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  statCard:      { flex: 1, borderWidth: 0.5, borderRadius: Radius.lg, paddingVertical: Spacing.md, alignItems: 'center' },
  statValue:     { fontSize: 22, fontWeight: '500' },
  statLabel:     { fontSize: 11, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.4 },

  reviewBtn:     { paddingVertical: 16, borderRadius: Radius.md, alignItems: 'center', marginBottom: Spacing.lg },
  reviewBtnText: { fontSize: 16, fontWeight: '500' },
  npdRow:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  npdStep:       { width: 40, height: 40, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  npdStepText:   { fontSize: 22, fontWeight: '500' },
  npdInput:      { width: 56, height: 40, borderRadius: Radius.md, borderWidth: 1, textAlign: 'center', fontSize: 16, fontWeight: '500' },
  npdHint:       { fontSize: 12, flex: 1 },

  listHead:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionLabel:  { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },

  row:           { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: 6 },
  rowNum:        { fontSize: 12, fontWeight: '500', width: 20 },
  rowTitle:      { fontSize: 14, fontWeight: '500' },
  rowSub:        { fontSize: 11, marginTop: 2 },
  arrows:        { alignItems: 'center', justifyContent: 'center' },
  arrow:         { fontSize: 12, paddingVertical: 1 },
  remove:        { color: Colors.red600, fontSize: 14, paddingHorizontal: 4 },
  addPlus:       { fontSize: 18, width: 20, textAlign: 'center' },

  empty:         { borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.xl, alignItems: 'center' },
  emptyTitle:    { fontSize: 18, fontWeight: '500', marginBottom: 8 },
  emptyText:     { fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: Spacing.lg },
  primaryBtn:    { backgroundColor: Colors.purple600, paddingVertical: 12, paddingHorizontal: 28, borderRadius: Radius.md },
  primaryBtnText:{ color: Colors.gold, fontSize: 15, fontWeight: '500' },

  doneBanner:    { borderWidth: 0.5, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },

  readerHead:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 2 },
  readerTitle:   { fontSize: 22, fontWeight: '500' },
  readerHours:   { fontSize: 12, marginBottom: 6 },
  readerBlurb:   { fontSize: 13, lineHeight: 20, marginBottom: Spacing.md },
  selBtn:        { paddingVertical: 11, borderRadius: Radius.md, alignItems: 'center' },
  selBtnText:    { fontSize: 14, fontWeight: '500' },
  partLabel:     { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  psalmText:     { fontSize: 16, lineHeight: 28 },

  sessionTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  sessionProgress:{ fontSize: 13, fontWeight: '500' },
  sessionHead:   { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  sessionTitle:  { fontSize: 17, fontWeight: '500' },
  newTag:        { fontSize: 11, fontWeight: '500', letterSpacing: 0.5, marginTop: 4 },
  cueBox:        { paddingTop: 40, alignItems: 'center' },
  cueLabel:      { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 },
  cueText:       { fontSize: 19, lineHeight: 30, fontStyle: 'italic', textAlign: 'center' },
  sessionFoot:   { padding: Spacing.lg },
  revealBtn:     { backgroundColor: Colors.purple600, paddingVertical: 14, borderRadius: Radius.md, alignItems: 'center' },
  revealBtnText: { color: Colors.gold, fontSize: 15, fontWeight: '500' },
  gradeRow:      { flexDirection: 'row', gap: 6 },
  gradeBtn:      { flex: 1, paddingVertical: 13, borderRadius: Radius.md, alignItems: 'center' },
  gradeText:     { color: Colors.gold, fontSize: 14, fontWeight: '500' },
});
