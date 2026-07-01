// src/modules/canon.tsx
// The daily Canon (prayer rule) — set with your father of confession. Today's
// view shows the items due today (built from the rule for this weekday); the
// editor lets you configure the rule per day of the week.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, useColorScheme,
} from 'react-native';
import { Colors, Light, Dark, Spacing, Radius } from '../constants/theme';
import {
  RuleConfig, DayPlan, ReadMode, loadRule, saveRule,
  AGPEYA_HOURS, SERVICES, CONFESSION_OPTIONS, FAST_UNTIL_OPTIONS, WEEKDAYS,
} from '../services/ruleStore';
import { isFastDay, prostrationsAllowed } from '../utils/fasting';

const hourName = (k: string) => AGPEYA_HOURS.find(h => h.key === k)?.name ?? k;
const serviceName = (k: string) => SERVICES.find(s => s.key === k)?.name ?? k;
const readLabel = (mode: ReadMode, n: number) => `${n} ${mode === 'chapters' ? (n === 1 ? 'chapter' : 'chapters') : 'min'}`;

interface Item { key: string; label: string; }

function todayItems(rule: RuleConfig, date: Date): Item[] {
  const d = rule.days[date.getDay()];
  const items: Item[] = [];
  for (const h of d.hours) items.push({ key: `hour_${h}`, label: `Pray the ${hourName(h)}` });
  for (const sv of d.services) items.push({ key: `svc_${sv}`, label: `Attend ${serviceName(sv)}` });
  if (isFastDay(date)) items.push({ key: 'fast', label: `Fast — abstain from food until ${rule.fastUntil}` });
  if (rule.prostrations > 0 && prostrationsAllowed(date)) items.push({ key: 'prostrations', label: `${rule.prostrations} prostrations (metanias)` });
  if (rule.quietMinutes > 0) items.push({ key: 'quiet', label: `${rule.quietMinutes} min of quiet time` });
  if (rule.bible.amount > 0) items.push({ key: 'bible', label: `Bible reading — ${readLabel(rule.bible.mode, rule.bible.amount)}` });
  if (rule.book && rule.book.amount > 0) items.push({ key: 'book', label: `${rule.book.title || 'Spiritual book'} — ${readLabel(rule.book.mode, rule.book.amount)}` });
  return items;
}

// ─── Small controls ───────────────────────────────────────────────────────────

function Stepper({ value, onChange, min = 0, max = 999, step = 1, unit, th }: {
  value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number; unit?: string; th: any;
}) {
  return (
    <View style={s.stepperRow}>
      <TouchableOpacity style={[s.stepBtn, { borderColor: th.border }]} onPress={() => onChange(Math.max(min, value - step))}>
        <Text style={[s.stepBtnText, { color: Colors.purple600 }]}>−</Text>
      </TouchableOpacity>
      <Text style={[s.stepValue, { color: th.text }]}>{value}{unit ? ` ${unit}` : ''}</Text>
      <TouchableOpacity style={[s.stepBtn, { borderColor: th.border }]} onPress={() => onChange(Math.min(max, value + step))}>
        <Text style={[s.stepBtnText, { color: Colors.purple600 }]}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function Chip({ label, on, onPress, th }: { label: string; on: boolean; onPress: () => void; th: any }) {
  return (
    <TouchableOpacity
      style={[s.chip, { borderColor: on ? Colors.purple600 : th.border, backgroundColor: on ? Colors.purple600 : 'transparent' }]}
      onPress={onPress}
    >
      <Text style={{ color: on ? Colors.gold : th.textSecond, fontSize: 12, fontWeight: '500' }}>{label}</Text>
    </TouchableOpacity>
  );
}

function FieldRow({ label, children, th }: { label: string; children: React.ReactNode; th: any }) {
  return (
    <View style={[s.fieldRow, { borderColor: th.border }]}>
      <Text style={[s.fieldLabel, { color: th.text }]}>{label}</Text>
      {children}
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CanonBody() {
  const scheme = useColorScheme();
  const th = scheme === 'dark' ? Dark : Light;

  const [rule, setRule] = useState<RuleConfig | null>(null);
  const [mode, setMode] = useState<'today' | 'edit'>('today');
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  useEffect(() => { loadRule().then(setRule); }, []);

  const update = useCallback((next: RuleConfig) => {
    setRule(next);
    saveRule(next);
  }, []);

  if (!rule) {
    return <View style={s.center}><ActivityIndicator color={Colors.purple600} /></View>;
  }

  const today = new Date().getDay();
  const todayName = WEEKDAYS[today];

  // ─── Editor ───────────────────────────────────────────────────────────────────
  if (mode === 'edit') {
    const setDay = (i: number, patch: Partial<DayPlan>) => {
      const days = rule.days.map((d, idx) => (idx === i ? { ...d, ...patch } : d));
      update({ ...rule, days });
    };
    const toggleIn = (arr: string[], k: string) => (arr.includes(k) ? arr.filter(x => x !== k) : [...arr, k]);

    return (
      <ScrollView style={{ flex: 1, backgroundColor: th.background }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}>
        <TouchableOpacity onPress={() => setMode('today')} style={{ marginBottom: Spacing.md }}>
          <Text style={{ color: Colors.purple600, fontSize: 14 }}>‹ Done</Text>
        </TouchableOpacity>
        <Text style={[s.note, { color: th.textSecond }]}>
          Set your rule together with your father of confession. Add only what you can keep faithfully.
        </Text>

        {/* Daily */}
        <Text style={[s.sectionLabel, { color: th.textSecond }]}>Every day</Text>
        <FieldRow label="Prostrations (metanias)" th={th}>
          <Stepper value={rule.prostrations} onChange={n => update({ ...rule, prostrations: n })} max={500} th={th} />
        </FieldRow>
        <Text style={[s.fieldNote, { color: th.textThird }]}>Not done on Saturdays, Sundays, or during the Holy Fifty.</Text>
        <FieldRow label="Quiet time" th={th}>
          <Stepper value={rule.quietMinutes} onChange={n => update({ ...rule, quietMinutes: n })} step={5} max={180} unit="min" th={th} />
        </FieldRow>

        {/* Fasting */}
        <View style={[s.card, { borderColor: th.border }]}>
          <Text style={[s.cardTitle, { color: th.text }]}>Fast until (on fasting days)</Text>
          <View style={[s.chipRow, { flexWrap: 'wrap' }]}>
            {FAST_UNTIL_OPTIONS.map(opt => (
              <Chip key={opt} label={opt} on={rule.fastUntil === opt} onPress={() => update({ ...rule, fastUntil: opt })} th={th} />
            ))}
          </View>
          <Text style={[s.fieldNote, { color: th.textThird, marginTop: 4 }]}>
            Wednesdays and Fridays are fasting days automatically, except during the Holy Fifty.
          </Text>
        </View>

        {/* Bible reading */}
        <View style={[s.card, { borderColor: th.border }]}>
          <Text style={[s.cardTitle, { color: th.text }]}>Bible reading</Text>
          <View style={s.chipRow}>
            <Chip label="Chapters" on={rule.bible.mode === 'chapters'} onPress={() => update({ ...rule, bible: { ...rule.bible, mode: 'chapters' } })} th={th} />
            <Chip label="Minutes"  on={rule.bible.mode === 'minutes'}  onPress={() => update({ ...rule, bible: { ...rule.bible, mode: 'minutes' } })} th={th} />
            <View style={{ flex: 1 }} />
            <Stepper value={rule.bible.amount} onChange={n => update({ ...rule, bible: { ...rule.bible, amount: n } })} step={rule.bible.mode === 'minutes' ? 5 : 1} max={180} th={th} />
          </View>
        </View>

        {/* Spiritual book */}
        <View style={[s.card, { borderColor: th.border }]}>
          <View style={s.cardHead}>
            <Text style={[s.cardTitle, { color: th.text }]}>Spiritual book</Text>
            {rule.book ? (
              <TouchableOpacity onPress={() => update({ ...rule, book: null })}><Text style={{ color: Colors.red600, fontSize: 12 }}>Remove</Text></TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => update({ ...rule, book: { title: '', mode: 'chapters', amount: 1 } })}><Text style={{ color: Colors.purple600, fontSize: 12, fontWeight: '500' }}>+ Add</Text></TouchableOpacity>
            )}
          </View>
          {rule.book && (
            <>
              <TextInput
                style={[s.input, { color: th.text, borderColor: th.border }]}
                placeholder="Book title (e.g. The Spiritual Ladder)"
                placeholderTextColor={th.textThird}
                value={rule.book.title}
                onChangeText={t => update({ ...rule, book: { ...rule.book!, title: t } })}
              />
              <View style={[s.chipRow, { marginTop: Spacing.sm }]}>
                <Chip label="Chapters" on={rule.book.mode === 'chapters'} onPress={() => update({ ...rule, book: { ...rule.book!, mode: 'chapters' } })} th={th} />
                <Chip label="Minutes"  on={rule.book.mode === 'minutes'}  onPress={() => update({ ...rule, book: { ...rule.book!, mode: 'minutes' } })} th={th} />
                <View style={{ flex: 1 }} />
                <Stepper value={rule.book.amount} onChange={n => update({ ...rule, book: { ...rule.book!, amount: n } })} step={rule.book.mode === 'minutes' ? 5 : 1} max={180} th={th} />
              </View>
            </>
          )}
        </View>

        {/* Confession */}
        <View style={[s.card, { borderColor: th.border }]}>
          <Text style={[s.cardTitle, { color: th.text }]}>Confession frequency</Text>
          <View style={[s.chipRow, { flexWrap: 'wrap' }]}>
            {CONFESSION_OPTIONS.map(opt => (
              <Chip key={opt} label={opt} on={rule.confession === opt} onPress={() => update({ ...rule, confession: opt })} th={th} />
            ))}
          </View>
        </View>

        {/* By day of week */}
        <Text style={[s.sectionLabel, { color: th.textSecond, marginTop: Spacing.lg }]}>For each day of the week</Text>
        {WEEKDAYS.map((name, i) => {
          const d = rule.days[i];
          const open = expandedDay === i;
          const autoFast = i === 3 || i === 5;
          const summary = [
            d.hours.length ? `${d.hours.length} hours` : null,
            d.services.length ? `${d.services.length} services` : null,
            autoFast ? 'fast day' : null,
          ].filter(Boolean).join(' · ') || 'Nothing set';
          return (
            <View key={i} style={[s.dayCard, { borderColor: open ? Colors.goldAccent : th.border, backgroundColor: th.backgroundSecond }]}>
              <TouchableOpacity style={s.dayHead} onPress={() => setExpandedDay(open ? null : i)}>
                <View>
                  <Text style={[s.dayName, { color: th.text }]}>{name}{i === today ? '  · today' : ''}</Text>
                  <Text style={[s.daySummary, { color: th.textThird }]}>{summary}</Text>
                </View>
                <Text style={{ color: th.textThird, fontSize: 16 }}>{open ? '▲' : '▾'}</Text>
              </TouchableOpacity>

              {open && (
                <View style={{ paddingTop: Spacing.sm }}>
                  <Text style={[s.subLabel, { color: th.textSecond }]}>Agpeya hours</Text>
                  <View style={[s.chipRow, { flexWrap: 'wrap' }]}>
                    {AGPEYA_HOURS.map(h => (
                      <Chip key={h.key} label={h.name} on={d.hours.includes(h.key)} onPress={() => setDay(i, { hours: toggleIn(d.hours, h.key) })} th={th} />
                    ))}
                  </View>
                  <Text style={[s.subLabel, { color: th.textSecond, marginTop: Spacing.sm }]}>Church services</Text>
                  <View style={[s.chipRow, { flexWrap: 'wrap' }]}>
                    {SERVICES.map(sv => (
                      <Chip key={sv.key} label={sv.name} on={d.services.includes(sv.key)} onPress={() => setDay(i, { services: toggleIn(d.services, sv.key) })} th={th} />
                    ))}
                  </View>
                  {autoFast && (
                    <Text style={[s.fieldNote, { color: th.textThird, marginTop: Spacing.sm }]}>
                      ✦ Automatically a fasting day (except during the Holy Fifty).
                    </Text>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    );
  }

  // ─── Today ────────────────────────────────────────────────────────────────────
  const now = new Date();
  const items = todayItems(rule, now);
  const fastingToday = isFastDay(now);
  const doneCount = items.filter(it => completed.has(it.key)).length;
  const allDone = items.length > 0 && doneCount === items.length;

  const toggle = (k: string) => setCompleted(prev => {
    const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n;
  });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: th.background }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 32 }}>
      <View style={s.head}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[s.todayName, { color: th.text }]}>{todayName}</Text>
            {fastingToday && (
              <View style={s.fastBadge}><Text style={s.fastBadgeText}>Fasting day</Text></View>
            )}
          </View>
          <Text style={[s.todayDate, { color: th.textThird }]}>{now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</Text>
        </View>
        <TouchableOpacity onPress={() => setMode('edit')}><Text style={{ color: Colors.purple600, fontSize: 13, fontWeight: '500' }}>Edit rule</Text></TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <View style={[s.empty, { borderColor: th.border }]}>
          <Text style={[s.emptyText, { color: th.textSecond }]}>No rule set for {todayName} yet.</Text>
          <TouchableOpacity style={s.editBtn} onPress={() => setMode('edit')}>
            <Text style={s.editBtnText}>Set your prayer rule</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={[s.progressCard, { backgroundColor: allDone ? Colors.teal50 : th.backgroundSecond, borderColor: allDone ? Colors.teal600 : th.border }]}>
            <Text style={[s.progressCount, { color: allDone ? Colors.teal600 : th.text }]}>{doneCount}/{items.length}</Text>
            <Text style={[s.progressLabel, { color: allDone ? Colors.teal600 : th.textSecond }]}>
              {allDone ? '✦ Canon complete — glory to God!' : 'items completed today'}
            </Text>
          </View>

          {items.map(it => {
            const done = completed.has(it.key);
            return (
              <TouchableOpacity key={it.key} style={[s.itemRow, { backgroundColor: th.backgroundSecond, borderColor: done ? Colors.teal600 + '55' : th.border }]} onPress={() => toggle(it.key)} activeOpacity={0.8}>
                <Text style={[s.itemLabel, { color: done ? th.textThird : th.text }, done && s.strike]}>{it.label}</Text>
                <View style={[s.check, { borderColor: done ? Colors.teal600 : th.border, backgroundColor: done ? Colors.teal600 : 'transparent' }]}>
                  {done && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </>
      )}

      <View style={[s.confCard, { backgroundColor: Colors.purple50, borderColor: Colors.purple200 + '55' }]}>
        <Text style={{ fontSize: 12, color: Colors.purple800 }}>Confession — {rule.confession.toLowerCase()}</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  note:          { fontSize: 12, lineHeight: 18, fontStyle: 'italic', marginBottom: Spacing.lg },
  sectionLabel:  { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm },
  subLabel:      { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },

  fieldRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  fieldLabel:    { fontSize: 14, flex: 1 },
  fieldNote:     { fontSize: 11, lineHeight: 16, marginBottom: Spacing.sm, marginTop: -2 },
  fastBadge:     { backgroundColor: Colors.purple600, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  fastBadgeText: { color: Colors.gold, fontSize: 11, fontWeight: '500' },

  stepperRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepBtn:       { width: 34, height: 34, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepBtnText:   { fontSize: 20, fontWeight: '500' },
  stepValue:     { fontSize: 15, fontWeight: '500', minWidth: 56, textAlign: 'center' },

  card:          { borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  cardHead:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle:     { fontSize: 14, fontWeight: '500', marginBottom: Spacing.sm },
  chipRow:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  chip:          { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6, marginRight: 6, marginBottom: 6 },
  input:         { borderWidth: 0.5, borderRadius: Radius.md, padding: Spacing.sm, fontSize: 14 },

  dayCard:       { borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  dayHead:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayName:       { fontSize: 14, fontWeight: '500' },
  daySummary:    { fontSize: 12, marginTop: 2 },
  fastRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },

  head:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  todayName:     { fontSize: 20, fontWeight: '500' },
  todayDate:     { fontSize: 13, marginTop: 2 },
  empty:         { borderWidth: 0.5, borderRadius: Radius.lg, borderStyle: 'dashed', padding: Spacing.xl, alignItems: 'center', gap: Spacing.md },
  emptyText:     { fontSize: 13, textAlign: 'center' },
  editBtn:       { backgroundColor: Colors.purple600, paddingHorizontal: 24, paddingVertical: 10, borderRadius: Radius.md },
  editBtnText:   { color: Colors.gold, fontSize: 14, fontWeight: '500' },
  progressCard:  { borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  progressCount: { fontSize: 22, fontWeight: '500' },
  progressLabel: { fontSize: 13, flex: 1 },
  itemRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: 6 },
  itemLabel:     { fontSize: 14, flex: 1, marginRight: Spacing.sm },
  strike:        { textDecorationLine: 'line-through' },
  check:         { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  confCard:      { borderWidth: 0.5, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.lg },
});
