// app/(tabs)/canon.tsx
// Daily Canon — the user's personal spiritual rule. Check off items each day.

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, useColorScheme,
} from 'react-native';
import { Colors, Light, Dark, Spacing, Radius } from '../constants/theme';
import type { CanonItem } from '../types';

// ─── Default canon items (user-editable in production) ───────────────────────

const DEFAULT_CANON: CanonItem[] = [
  { id: 'c1', label: 'Agpeya — Morning Prayer',  type: 'agpeya_hour',    description: 'Prime and Terce' },
  { id: 'c2', label: 'Agpeya — Evening Prayer',  type: 'agpeya_hour',    description: 'Vespers and Compline' },
  { id: 'c3', label: 'Prostrations',             type: 'prostrations',   targetCount: 10, description: '10 prostrations during prayer' },
  { id: 'c4', label: 'Daily Scripture reading',  type: 'reading',        targetMinutes: 15, description: '15 min reading from your plan' },
  { id: 'c5', label: 'Quiet time / stillness',   type: 'quiet_time',     targetMinutes: 10, description: '10+ minutes of silent prayer' },
  { id: 'c6', label: 'Midnight praise',          type: 'agpeya_hour',    description: 'Midnight prayers (Psalm 118–119)' },
];

const TYPE_ICONS: Record<CanonItem['type'], string> = {
  agpeya_hour:  '🕊',
  prostrations: '🙇',
  quiet_time:   '🌙',
  reading:      '📖',
  custom:       '✦',
};

const TYPE_COLORS: Record<CanonItem['type'], string> = {
  agpeya_hour:  Colors.purple600,
  prostrations: Colors.teal600,
  quiet_time:   Colors.navy,
  reading:      Colors.amber600,
  custom:       Colors.gray600,
};

// ─── Streak display ───────────────────────────────────────────────────────────

const WEEK_DAYS = ['S','M','T','W','T','F','S'];
// Simulated — last 7 days completion
const WEEK_DONE = [true, true, false, true, true, true, false];

export default function CanonBody() {
  const scheme = useColorScheme();
  const th = scheme === 'dark' ? Dark : Light;
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setCompleted(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const doneCount = completed.size;
  const total     = DEFAULT_CANON.length;
  const allDone   = doneCount === total;

  const today = new Date();
  const todayStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <View style={{ flex: 1, backgroundColor: th.background }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 32 }}>
        <Text style={[styles.todayLabel, { color: th.textSecond }]}>{todayStr}</Text>
        {/* Progress summary */}
        <View style={[styles.progressCard, { backgroundColor: allDone ? Colors.teal900 : th.backgroundSecond, borderColor: allDone ? Colors.teal600 : th.border }]}>
          <View style={styles.progressRow}>
            <Text style={[styles.progressCount, { color: allDone ? Colors.teal200 : th.text }]}>
              {doneCount}/{total}
            </Text>
            <Text style={[styles.progressLabel, { color: allDone ? Colors.teal200 : th.textSecond }]}>
              {allDone ? '✦ Canon complete — glory to God!' : 'items completed today'}
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: th.backgroundThird }]}>
            <View style={[styles.progressFill, { width: `${(doneCount / total) * 100}%`, backgroundColor: allDone ? Colors.teal600 : Colors.purple600 }]} />
          </View>
        </View>

        {/* Week streak */}
        <Text style={[styles.sectionLabel, { color: th.textSecond }]}>This week</Text>
        <View style={[styles.weekRow, { backgroundColor: th.backgroundSecond, borderColor: th.border }]}>
          {WEEK_DAYS.map((d, i) => {
            const isToday = i === today.getDay();
            const done    = WEEK_DONE[i];
            return (
              <View key={i} style={styles.dayCol}>
                <Text style={[styles.dayLetter, { color: isToday ? Colors.purple600 : th.textThird }]}>{d}</Text>
                <View style={[styles.dayCircle, {
                  backgroundColor: done ? Colors.teal600 : (isToday ? Colors.purple50 : 'transparent'),
                  borderColor: isToday ? Colors.purple600 : (done ? Colors.teal600 : th.border),
                }]}>
                  {done && <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>}
                </View>
              </View>
            );
          })}
        </View>

        {/* Canon checklist */}
        <Text style={[styles.sectionLabel, { color: th.textSecond }]}>Today's items</Text>
        {DEFAULT_CANON.map(item => {
          const done = completed.has(item.id);
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.canonRow, { backgroundColor: th.backgroundSecond, borderColor: done ? TYPE_COLORS[item.type] + '44' : th.border }]}
              onPress={() => toggle(item.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.canonIcon, { backgroundColor: done ? TYPE_COLORS[item.type] + '22' : th.backgroundThird }]}>
                <Text style={{ fontSize: 18 }}>{TYPE_ICONS[item.type]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.canonLabel, { color: done ? th.textSecond : th.text }, done && styles.strikethrough]}>
                  {item.label}
                </Text>
                {item.description && (
                  <Text style={[styles.canonDesc, { color: th.textThird }]}>{item.description}</Text>
                )}
                {item.targetMinutes && (
                  <Text style={[styles.canonTarget, { color: TYPE_COLORS[item.type] }]}>{item.targetMinutes} min</Text>
                )}
                {item.targetCount && (
                  <Text style={[styles.canonTarget, { color: TYPE_COLORS[item.type] }]}>×{item.targetCount}</Text>
                )}
              </View>
              <View style={[styles.checkBox, { borderColor: done ? TYPE_COLORS[item.type] : th.border, backgroundColor: done ? TYPE_COLORS[item.type] : 'transparent' }]}>
                {done && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Note */}
        <View style={[styles.noteCard, { backgroundColor: Colors.purple50, borderColor: Colors.purple200 + '55' }]}>
          <Text style={{ fontSize: 12, color: Colors.purple800, lineHeight: 18 }}>
            Your canon is a gift you give to God each day. Even partial completion is faithfulness.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  todayLabel:    { fontSize: 13, fontWeight: '500', marginBottom: Spacing.sm },
  sectionLabel:  { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm, marginTop: Spacing.md },
  progressCard:  { borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm },
  progressRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  progressCount: { fontSize: 22, fontWeight: '500' },
  progressLabel: { fontSize: 13, flex: 1 },
  progressBar:   { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 3 },
  weekRow:       { flexDirection: 'row', borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.md, justifyContent: 'space-around' },
  dayCol:        { alignItems: 'center', gap: 6 },
  dayLetter:     { fontSize: 11, fontWeight: '500' },
  dayCircle:     { width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  canonRow:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  canonIcon:     { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  canonLabel:    { fontSize: 13, fontWeight: '500' },
  canonDesc:     { fontSize: 11, marginTop: 2 },
  canonTarget:   { fontSize: 11, fontWeight: '500', marginTop: 2 },
  strikethrough: { textDecorationLine: 'line-through' },
  checkBox:      { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  noteCard:      { borderRadius: Radius.md, borderWidth: 0.5, padding: Spacing.md, marginTop: Spacing.md },
});
