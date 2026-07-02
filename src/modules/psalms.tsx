// src/modules/psalms.tsx
// Memorize the Psalms as prayed in the Coptic Agpeya. The unit of memorization
// is an "item": a whole psalm, or a single section of Psalm 118 (its 22 Agpeya
// sections). Spaced repetition with cloze-deletion and lead-up context.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, useColorScheme,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { Colors, Light, Dark, Spacing, Radius } from '../constants/theme';
import {
  PartCard, Grade, Streak, loadCards, loadSelection, saveSelection, review,
  computeStats, dueQueue, newQueue, cardId, loadStreak, recordReviewDay,
  loadNewPerDay, saveNewPerDay, learningItem,
  ReciteCard, ReciteGrade, loadRecite, reviewRecite, reciteState, portionsMature,
} from '../services/psalmStore';
import {
  HOURS, itemsForPsalm, itemUnits, itemUnitCount, itemLeadUp, itemLabel,
  itemPsalm, itemReaderText, psalmHours, hourName,
} from '../data/agpeyaPsalter';
import { classify, CATEGORY_META } from '../data/psalmMeta';

// Cloze deletion: show the opening, blank the completion (keep punctuation).
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

function CategoryTag({ item }: { item: string }) {
  const meta = CATEGORY_META[classify(itemPsalm(item))];
  return (
    <View style={[styles.tag, { backgroundColor: meta.color + '22', borderColor: meta.color + '55' }]}>
      <Text style={[styles.tagText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

const PICKER_ITEM = 56;

function NumberPicker({ value, onScrub, onCommit, min, max, th }: {
  value: number; onScrub: (n: number) => void; onCommit: (n: number) => void;
  min: number; max: number; th: any;
}) {
  const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const ref = useRef<ScrollView>(null);
  const [w, setW] = useState(0);
  const pad = w > 0 ? (w - PICKER_ITEM) / 2 : 0;

  useEffect(() => {
    if (w > 0) ref.current?.scrollTo({ x: (value - min) * PICKER_ITEM, animated: false });
  }, [w]); // eslint-disable-line react-hooks/exhaustive-deps

  const numberAt = (x: number) => {
    const i = Math.max(0, Math.min(nums.length - 1, Math.round(x / PICKER_ITEM)));
    return nums[i];
  };

  return (
    <View onLayout={e => setW(e.nativeEvent.layout.width)} style={styles.pickerWrap}>
      <View pointerEvents="none" style={[styles.pickerHighlight, { borderColor: Colors.goldAccent }]} />
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={PICKER_ITEM}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: pad }}
        scrollEventThrottle={16}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => onScrub(numberAt(e.nativeEvent.contentOffset.x))}
        onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => onCommit(numberAt(e.nativeEvent.contentOffset.x))}
      >
        {nums.map(n => (
          <View key={n} style={styles.pickerItem}>
            <Text style={{ fontSize: n === value ? 26 : 18, fontWeight: '500', color: n === value ? Colors.purple600 : th.textThird }}>{n}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
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

export default function PsalmsBody() {
  const scheme = useColorScheme();
  const th = scheme === 'dark' ? Dark : Light;

  const [selection, setSelection] = useState<string[]>([]);
  const [cards, setCards]         = useState<Record<string, PartCard>>({});
  const [streak, setStreak]       = useState<Streak>({ current: 0, last: null });
  const [newPerDay, setNewPerDay] = useState(5);
  const [loading, setLoading]     = useState(true);

  const [recite, setRecite] = useState<Record<string, ReciteCard>>({});
  const [testItem, setTestItem] = useState<string | null>(null);
  const [testRevealed, setTestRevealed] = useState(false);

  const [view, setView]     = useState<'overview' | 'manage'>('overview');
  const [reader, setReader] = useState<string | null>(null);

  const [queue, setQueue]   = useState<{ item: string; part: number }[] | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([loadSelection(), loadCards(), loadStreak(), loadNewPerDay(), loadRecite()]).then(([sel, c, st, npd, rec]) => {
      setSelection(sel); setCards(c); setStreak(st); setNewPerDay(npd); setRecite(rec);
    }).finally(() => setLoading(false));
  }, []);

  const persistSelection = useCallback((next: string[]) => {
    setSelection(next); saveSelection(next);
  }, []);

  const toggle = useCallback((item: string) => {
    persistSelection(selection.includes(item) ? selection.filter(p => p !== item) : [...selection, item]);
  }, [selection, persistSelection]);

  const move = useCallback((i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= selection.length) return;
    const next = [...selection];
    [next[i], next[j]] = [next[j], next[i]];
    persistSelection(next);
  }, [selection, persistSelection]);

  const changeNewPerDay = useCallback((n: number) => {
    const clamped = Math.max(1, Math.min(100, n));
    setNewPerDay(clamped);
    saveNewPerDay(clamped);
  }, []);

  const openTest = useCallback((item: string) => { setTestItem(item); setTestRevealed(false); }, []);

  const finishTest = useCallback(async (g: ReciteGrade) => {
    if (testItem == null) return;
    const updated = await reviewRecite(testItem, recite[testItem], g);
    setRecite(prev => ({ ...prev, [testItem]: updated }));
    recordReviewDay().then(setStreak);
    setTestItem(null);
  }, [testItem, recite]);

  const stats = computeStats(selection, cards);

  const startSession = useCallback((mode: 'review' | 'new') => {
    const q = mode === 'review' ? dueQueue(selection, cards) : newQueue(selection, cards, newPerDay);
    if (!q.length) return;
    setQueue(q); setQIndex(0); setReviewedCount(0); setRevealed(false);
  }, [selection, cards, newPerDay]);

  const grade = useCallback(async (g: Grade) => {
    if (!queue || busy) return;
    setBusy(true);
    const { item, part } = queue[qIndex];
    try {
      const updated = await review(item, part, cards[cardId(item, part)], g);
      setCards(prev => ({ ...prev, [cardId(item, part)]: updated }));
      const st = await recordReviewDay();
      setStreak(st);
    } catch (e) { /* keep the session moving */ }
    setReviewedCount(c => c + 1);

    const nextQueue = g === 'again' ? [...queue, { item, part }] : queue;
    const nextIndex = qIndex + 1;
    if (nextIndex < nextQueue.length) {
      setQueue(nextQueue); setQIndex(nextIndex); setRevealed(false);
    } else {
      setQueue(null);
    }
    setBusy(false);
  }, [queue, qIndex, cards, busy]);

  if (loading) {
    return <View style={[styles.center, { backgroundColor: th.background }]}><ActivityIndicator color={Colors.purple600} /></View>;
  }

  // ─── Reader ───────────────────────────────────────────────────────────────────
  if (reader != null) {
    const sections = itemReaderText(reader);
    const meta = CATEGORY_META[classify(itemPsalm(reader))];
    const selected = selection.includes(reader);
    return (
      <ScrollView style={{ flex: 1, backgroundColor: th.background }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}>
        <TouchableOpacity onPress={() => setReader(null)} style={{ marginBottom: Spacing.md }}>
          <Text style={{ color: Colors.purple600, fontSize: 14 }}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.readerHead}>
          <Text style={[styles.readerTitle, { color: th.text }]}>{itemLabel(reader)}</Text>
          <CategoryTag item={reader} />
        </View>
        <Text style={[styles.readerHours, { color: th.textThird }]}>{psalmHours(itemPsalm(reader)).map(hourName).join(' · ')}</Text>
        <Text style={[styles.readerBlurb, { color: th.textSecond }]}>{meta.blurb}</Text>
        <TouchableOpacity
          style={[styles.selBtn, { backgroundColor: selected ? th.backgroundThird : Colors.purple600 }]}
          onPress={() => toggle(reader)}
        >
          <Text style={[styles.selBtnText, { color: selected ? th.textSecond : Colors.gold }]}>
            {selected ? '✓ In your list — remove' : '+ Add to my psalms'}
          </Text>
        </TouchableOpacity>

        {sections.map((text, i) => (
          <View key={i} style={{ marginTop: Spacing.lg }}>
            {sections.length > 1 && <Text style={[styles.partLabel, { color: meta.color }]}>Section {i + 1} of {sections.length}</Text>}
            <Text style={[styles.psalmText, { color: th.text }]}>{text}</Text>
          </View>
        ))}
      </ScrollView>
    );
  }

  // ─── Recitation test ────────────────────────────────────────────────────────
  if (testItem != null) {
    const sections = itemReaderText(testItem);
    const meta = CATEGORY_META[classify(itemPsalm(testItem))];
    return (
      <View style={{ flex: 1, backgroundColor: th.background }}>
        <View style={styles.sessionTop}>
          <Text style={[styles.sessionProgress, { color: th.textThird }]}>Full recitation</Text>
          <TouchableOpacity onPress={() => setTestItem(null)}><Text style={{ color: Colors.purple600, fontSize: 14 }}>End</Text></TouchableOpacity>
        </View>
        <View style={styles.sessionHead}>
          <Text style={[styles.sessionTitle, { color: th.text }]}>{itemLabel(testItem)}</Text>
          <Text style={[styles.newTag, { color: meta.color }]}>Recite it in full from memory</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
          {testRevealed ? (
            sections.map((t, i) => (
              <View key={i} style={{ marginBottom: Spacing.md }}>
                {sections.length > 1 && <Text style={[styles.partLabel, { color: meta.color }]}>Section {i + 1} of {sections.length}</Text>}
                <Text style={[styles.psalmText, { color: th.text }]}>{t}</Text>
              </View>
            ))
          ) : (
            <Text style={[styles.testPrompt, { color: th.textSecond }]}>
              Recite {itemLabel(testItem)} aloud in full, then reveal the text to check yourself.
            </Text>
          )}
        </ScrollView>

        <View style={styles.sessionFoot}>
          {!testRevealed ? (
            <TouchableOpacity style={styles.revealBtn} onPress={() => setTestRevealed(true)}>
              <Text style={styles.revealBtnText}>Reveal text</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.gradeRow}>
              <Grade2 label="Forgot"     color={Colors.red600} onPress={() => finishTest('fail')} />
              <Grade2 label="Some slips" color="#C4821A"        onPress={() => finishTest('partial')} />
              <Grade2 label="✓ Recited"  color={Colors.teal600} onPress={() => finishTest('pass')} />
            </View>
          )}
        </View>
      </View>
    );
  }

  // ─── Review session ─────────────────────────────────────────────────────────
  if (queue) {
    const { item, part } = queue[qIndex];
    const text = itemUnits(item)[part] ?? '';
    const lead = itemLeadUp(item, part);
    const multi = itemUnitCount(item) > 1;
    const isNew = !cards[cardId(item, part)];
    return (
      <View style={{ flex: 1, backgroundColor: th.background }}>
        <View style={styles.sessionTop}>
          <Text style={[styles.sessionProgress, { color: th.textThird }]}>{qIndex + 1} / {queue.length}</Text>
          <TouchableOpacity onPress={() => setQueue(null)}><Text style={{ color: Colors.purple600, fontSize: 14 }}>End</Text></TouchableOpacity>
        </View>
        <View style={styles.sessionHead}>
          <Text style={[styles.sessionTitle, { color: th.text }]}>
            {itemLabel(item)}{multi ? `  ·  portion ${part + 1}/${itemUnitCount(item)}` : ''}
          </Text>
          {isNew && <Text style={[styles.newTag, { color: Colors.teal600 }]}>NEW — read & learn</Text>}
        </View>

        <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
          <Text style={[styles.cueLabel, { color: th.textThird, marginBottom: 12 }]}>
            {revealed ? 'How well did you recall it?' : isNew ? 'New — fill in the blanks, then learn it' : 'Continue from memory — fill in the blanks'}
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
              <Grade2 label="Wrong" color={Colors.red600} onPress={() => grade('again')} />
              <Grade2 label="Hard"  color="#C4821A"        onPress={() => grade('hard')} />
              <Grade2 label="Good"  color={Colors.teal600} onPress={() => grade('good')} />
              <Grade2 label="Easy"  color="#1F4E8C"        onPress={() => grade('easy')} />
            </View>
          )}
        </View>
      </View>
    );
  }

  // ─── Manage ───────────────────────────────────────────────────────────────────
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
        {selection.map((item, i) => (
          <View key={item} style={[styles.row, { backgroundColor: th.backgroundSecond, borderColor: th.border }]}>
            <Text style={[styles.rowNum, { color: th.textThird }]}>{i + 1}</Text>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => setReader(item)}>
              <Text style={[styles.rowTitle, { color: th.text }]}>{itemLabel(item)}</Text>
              <Text style={[styles.rowSub, { color: th.textThird }]}>{itemUnitCount(item)} portion{itemUnitCount(item) > 1 ? 's' : ''}</Text>
            </TouchableOpacity>
            <CategoryTag item={item} />
            <View style={styles.arrows}>
              <TouchableOpacity onPress={() => move(i, -1)} hitSlop={6}><Text style={[styles.arrow, { color: i === 0 ? th.border : Colors.purple600 }]}>▲</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => move(i, 1)} hitSlop={6}><Text style={[styles.arrow, { color: i === selection.length - 1 ? th.border : Colors.purple600 }]}>▼</Text></TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => toggle(item)} hitSlop={6}><Text style={styles.remove}>✕</Text></TouchableOpacity>
          </View>
        ))}

        {HOURS.map(hour => (
          <View key={hour.key}>
            <Text style={[styles.sectionLabel, { color: th.textSecond, marginTop: Spacing.lg }]}>{hour.name}</Text>
            {hour.psalms.flatMap(itemsForPsalm).map(item => {
              const on = selection.includes(item);
              return (
                <TouchableOpacity key={item} style={[styles.row, { backgroundColor: th.backgroundSecond, borderColor: on ? Colors.purple600 + '66' : th.border }]} onPress={() => toggle(item)}>
                  <Text style={[styles.addPlus, { color: on ? Colors.teal600 : Colors.purple600 }]}>{on ? '✓' : '+'}</Text>
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => setReader(item)}>
                    <Text style={[styles.rowTitle, { color: th.text }]}>{itemLabel(item)}</Text>
                    <Text style={[styles.rowSub, { color: th.textThird }]}>{itemUnitCount(item)} portion{itemUnitCount(item) > 1 ? 's' : ''}</Text>
                  </TouchableOpacity>
                  <CategoryTag item={item} />
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
  const dueCount = dueQueue(selection, cards).length;
  const newAvailable = newQueue(selection, cards, newPerDay).length;
  const lp = learningItem(selection, cards);

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
            Choose psalms from the canonical hours to hide in your heart. Psalm 118 is offered as its 22
            Agpeya sections. Spaced repetition brings each passage back just as you're about to forget it.
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
            {streak.current > 0 && <Text style={styles.heroStreak}>🔥  {streak.current}-day streak</Text>}
          </View>

          <View style={styles.statRow}>
            <Stat label="New" value={stats.newCount} color={th.textSecond} th={th} />
            <Stat label="Learning" value={stats.learning} color={Colors.amber600} th={th} />
            <Stat label="Memorized" value={stats.mastered} color={Colors.teal600} th={th} />
          </View>

          {dueCount === 0 && newAvailable === 0 ? (
            <View style={[styles.reviewBtn, { backgroundColor: th.backgroundThird }]}>
              <Text style={[styles.reviewBtnText, { color: th.textThird }]}>All caught up for today ✦</Text>
            </View>
          ) : (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: dueCount ? Colors.purple600 : th.backgroundThird }]}
                onPress={() => startSession('review')}
                disabled={dueCount === 0}
              >
                <Text style={[styles.actionBtnText, { color: dueCount ? Colors.gold : th.textThird }]}>Review {dueCount}</Text>
                <Text style={[styles.actionBtnSub, { color: dueCount ? Colors.goldMuted : th.textThird }]}>due today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: newAvailable ? Colors.teal600 : th.backgroundThird }]}
                onPress={() => startSession('new')}
                disabled={newAvailable === 0}
              >
                <Text style={[styles.actionBtnText, { color: newAvailable ? Colors.gold : th.textThird }]}>Learn {newAvailable}</Text>
                <Text style={[styles.actionBtnSub, { color: newAvailable ? Colors.goldMuted : th.textThird }]}>new</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={[styles.sectionLabel, { color: th.textSecond, marginBottom: Spacing.xs }]}>Number of new cards per day</Text>
          <NumberPicker value={newPerDay} onScrub={setNewPerDay} onCommit={changeNewPerDay} min={1} max={100} th={th} />
          <View style={{ marginBottom: Spacing.lg }} />

          <View style={styles.listHead}>
            <Text style={[styles.sectionLabel, { color: th.textSecond }]}>My psalms</Text>
            <TouchableOpacity onPress={() => setView('manage')}><Text style={{ color: Colors.purple600, fontSize: 13, fontWeight: '500' }}>Manage</Text></TouchableOpacity>
          </View>

          {selection.map(item => {
            const { mature, total } = portionsMature(item, cards);
            const st = reciteState(item, cards, recite);
            const hasStarted = Array.from({ length: total }).some((_, i) => cards[cardId(item, i)]);
            const sub =
              st === 'learning'
                ? (item === lp ? `Learning now · ${mature}/${total} portions` : !hasStarted ? 'Up next — finish earlier psalms first' : `${mature}/${total} portions memorized`)
              : st === 'ready'   ? 'All portions memorized — ready to test'
              : st === 'retest'  ? 'Whole-psalm re-test due'
              : '✓ Memorized — recited in full';
            const subColor =
              st === 'memorized' ? Colors.teal600
              : st === 'retest'  ? Colors.amber600
              : st === 'ready'   ? Colors.purple600
              : item === lp      ? Colors.purple600
              : th.textThird;
            return (
              <View key={item} style={[styles.row, { backgroundColor: th.backgroundSecond, borderColor: th.border }]}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => setReader(item)}>
                  <Text style={[styles.rowTitle, { color: th.text }]}>{itemLabel(item)}</Text>
                  <Text style={[styles.rowSub, { color: subColor }]}>{sub}</Text>
                </TouchableOpacity>
                {st === 'ready' || st === 'retest' ? (
                  <TouchableOpacity style={styles.testBtn} onPress={() => openTest(item)}>
                    <Text style={styles.testBtnText}>Test</Text>
                  </TouchableOpacity>
                ) : st === 'memorized' ? (
                  <Text style={styles.crown}>✓</Text>
                ) : (
                  <CategoryTag item={item} />
                )}
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
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
  actionRow:     { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  actionBtn:     { flex: 1, paddingVertical: 14, borderRadius: Radius.md, alignItems: 'center' },
  actionBtnText: { fontSize: 16, fontWeight: '500' },
  actionBtnSub:  { fontSize: 11, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
  pickerWrap:      { height: 56, justifyContent: 'center' },
  pickerHighlight: { position: 'absolute', left: '50%', marginLeft: -PICKER_ITEM / 2, width: PICKER_ITEM, height: 44, borderRadius: Radius.md, borderWidth: 1.5 },
  pickerItem:      { width: PICKER_ITEM, height: 56, alignItems: 'center', justifyContent: 'center' },

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
  testPrompt:    { fontSize: 15, lineHeight: 24, textAlign: 'center', paddingVertical: 40, paddingHorizontal: Spacing.md },
  testBtn:       { backgroundColor: Colors.purple600, paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.md },
  testBtnText:   { color: Colors.gold, fontSize: 13, fontWeight: '500' },
  crown:         { color: Colors.teal600, fontSize: 18, fontWeight: '500', paddingHorizontal: 6 },
  cueLabel:      { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.6 },
  sessionFoot:   { padding: Spacing.lg },
  revealBtn:     { backgroundColor: Colors.purple600, paddingVertical: 14, borderRadius: Radius.md, alignItems: 'center' },
  revealBtnText: { color: Colors.gold, fontSize: 15, fontWeight: '500' },
  gradeRow:      { flexDirection: 'row', gap: 6 },
  gradeBtn:      { flex: 1, paddingVertical: 13, borderRadius: Radius.md, alignItems: 'center' },
  gradeText:     { color: Colors.gold, fontSize: 14, fontWeight: '500' },
});
