// src/modules/plans.tsx
// Bible reading plans with on-device progress tracking. Browse plans, start one,
// and check off each day; the plan remembers where you are.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, useColorScheme,
} from 'react-native';
import { Colors, Light, Dark, Spacing, Radius } from '../constants/theme';
import { READING_PLANS, getPlan, ReadingPlan } from '../data/readingPlans';
import {
  PlanProgress, loadAllProgress, saveProgress, removeProgress, currentDay,
} from '../services/planStore';

export default function PlansBody() {
  const scheme = useColorScheme();
  const th = scheme === 'dark' ? Dark : Light;

  const [tab, setTab]           = useState<'mine' | 'browse'>('mine');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, PlanProgress>>({});
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    loadAllProgress().then(setProgress).finally(() => setLoading(false));
  }, []);

  const persist = useCallback((planId: string, p: PlanProgress) => {
    setProgress(prev => ({ ...prev, [planId]: p }));
    saveProgress(planId, p);
  }, []);

  const startPlan = useCallback((plan: ReadingPlan) => {
    if (!progress[plan.id]) {
      persist(plan.id, { startedAt: new Date().toISOString(), completed: [] });
    }
    setDetailId(plan.id);
  }, [progress, persist]);

  const toggleDay = useCallback((planId: string, day: number) => {
    const p = progress[planId] ?? { startedAt: new Date().toISOString(), completed: [] };
    const set = new Set(p.completed);
    set.has(day) ? set.delete(day) : set.add(day);
    persist(planId, { ...p, completed: [...set].sort((a, b) => a - b) });
  }, [progress, persist]);

  const abandon = useCallback((planId: string) => {
    Alert.alert('Abandon plan', 'Your progress for this plan will be cleared. Start over anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Abandon', style: 'destructive',
        onPress: () => {
          setProgress(prev => { const n = { ...prev }; delete n[planId]; return n; });
          removeProgress(planId);
          setDetailId(null);
          setTab('browse');
        },
      },
    ]);
  }, []);

  // ─── Plan detail / preview ────────────────────────────────────────────────────
  if (detailId) {
    const plan = getPlan(detailId)!;
    const started = !!progress[detailId];
    const prog = progress[detailId] ?? { startedAt: '', completed: [] };
    const done = new Set(prog.completed);
    const cur  = currentDay(prog, plan.totalDays);
    const finished = cur > plan.totalDays;
    const pct = Math.round((done.size / plan.totalDays) * 100);

    return (
      <ScrollView style={{ flex: 1, backgroundColor: th.background }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 32 }}>
        <TouchableOpacity onPress={() => setDetailId(null)} style={{ marginBottom: Spacing.md }}>
          <Text style={{ color: Colors.purple600, fontSize: 14 }}>‹ All plans</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={[styles.detailHead, { backgroundColor: plan.color }]}>
          <Text style={styles.detailIcon}>{plan.icon}</Text>
          <Text style={styles.detailName}>{plan.name}</Text>
          {started ? (
            <>
              <Text style={styles.detailMeta}>{done.size} of {plan.totalDays} days · {pct}%</Text>
              <View style={styles.detailBarTrack}>
                <View style={[styles.detailBarFill, { width: `${pct}%` }]} />
              </View>
            </>
          ) : (
            <Text style={styles.detailMeta}>{plan.totalDays} days</Text>
          )}
        </View>

        {/* Preview: Start button + description */}
        {!started && (
          <>
            <TouchableOpacity style={styles.startTopBtn} onPress={() => startPlan(plan)}>
              <Text style={styles.startTopBtnText}>Start this plan</Text>
            </TouchableOpacity>
            <Text style={[styles.previewDesc, { color: th.textSecond }]}>{plan.description}</Text>
            <Text style={[styles.sectionLabel, { color: th.textSecond }]}>What you'll read</Text>
          </>
        )}

        {/* Tracking: Continue card */}
        {started && (finished ? (
          <View style={[styles.continueCard, { borderColor: Colors.teal600, backgroundColor: Colors.teal50 }]}>
            <Text style={[styles.continueLabel, { color: Colors.teal600 }]}>✦  Plan complete</Text>
            <Text style={[styles.continueReading, { color: th.text }]}>Glory to God — you finished {plan.name}.</Text>
          </View>
        ) : (
          <View style={[styles.continueCard, { borderColor: Colors.goldAccent, backgroundColor: th.backgroundSecond }]}>
            <Text style={[styles.continueLabel, { color: Colors.purple600 }]}>Continue — Day {cur}</Text>
            <Text style={[styles.continueReading, { color: th.text }]}>{plan.days[cur - 1].label}</Text>
            <TouchableOpacity style={styles.markBtn} onPress={() => toggleDay(plan.id, cur)}>
              <Text style={styles.markBtnText}>✓  Mark day {cur} complete</Text>
            </TouchableOpacity>
          </View>
        ))}

        {started && <Text style={[styles.sectionLabel, { color: th.textSecond }]}>Full schedule</Text>}

        {/* Schedule — interactive once started, read-only in preview */}
        {plan.days.map(d => {
          const isDone = done.has(d.day);
          const isCurrent = started && d.day === cur && !finished;
          const Row = started ? TouchableOpacity : View;
          return (
            <Row
              key={d.day}
              style={[styles.dayRow, {
                backgroundColor: th.backgroundSecond,
                borderColor: isCurrent ? Colors.goldAccent : th.border,
              }]}
              {...(started ? { onPress: () => toggleDay(plan.id, d.day), activeOpacity: 0.8 } : {})}
            >
              <Text style={[styles.dayNum, { color: th.textThird }]}>Day {d.day}</Text>
              <Text style={[styles.dayLabel, { color: isDone ? th.textThird : th.text }, isDone && styles.strike]}>
                {d.label}
              </Text>
              {started && (
                <View style={[styles.check, { borderColor: isDone ? Colors.teal600 : th.border, backgroundColor: isDone ? Colors.teal600 : 'transparent' }]}>
                  {isDone && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
                </View>
              )}
            </Row>
          );
        })}

        {started && (
          <TouchableOpacity style={[styles.abandonBtn, { borderColor: th.border }]} onPress={() => abandon(plan.id)}>
            <Text style={[styles.abandonText, { color: Colors.red600 }]}>Abandon plan</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  }

  // ─── List view ──────────────────────────────────────────────────────────────
  const activePlans = READING_PLANS.filter(p => progress[p.id]);

  return (
    <View style={{ flex: 1, backgroundColor: th.background }}>
      <View style={[styles.tabBar, { backgroundColor: th.background }]}>
        {(['mine', 'browse'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'mine' ? 'My plans' : 'Browse'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 32 }}>
        {loading && (
          <View style={{ paddingVertical: 48, alignItems: 'center' }}>
            <ActivityIndicator color={Colors.purple600} />
          </View>
        )}

        {!loading && tab === 'mine' && (
          activePlans.length > 0 ? (
            activePlans.map(plan => {
              const prog = progress[plan.id];
              const done = prog.completed.length;
              const pct = Math.round((done / plan.totalDays) * 100);
              const cur = currentDay(prog, plan.totalDays);
              const finished = cur > plan.totalDays;
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[styles.planCard, { backgroundColor: th.backgroundSecond, borderColor: th.border }]}
                  onPress={() => setDetailId(plan.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.planHead}>
                    <View style={[styles.planIconWrap, { backgroundColor: plan.color + '22' }]}>
                      <Text style={styles.planIcon}>{plan.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.planName, { color: th.text }]}>{plan.name}</Text>
                      <Text style={[styles.planSub, { color: th.textThird }]}>
                        {finished ? 'Complete ✦' : `Day ${cur} of ${plan.totalDays}`} · {pct}%
                      </Text>
                    </View>
                    <Text style={{ color: Colors.purple600, fontSize: 13, fontWeight: '500' }}>
                      {finished ? 'Review' : 'Continue'}
                    </Text>
                  </View>
                  <View style={[styles.barTrack, { backgroundColor: th.backgroundThird }]}>
                    <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: plan.color }]} />
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={[styles.empty, { borderColor: th.border }]}>
              <Text style={[styles.emptyText, { color: th.textThird }]}>
                You haven't started a plan yet.
              </Text>
              <TouchableOpacity style={styles.browseBtn} onPress={() => setTab('browse')}>
                <Text style={styles.browseBtnText}>Browse plans</Text>
              </TouchableOpacity>
            </View>
          )
        )}

        {!loading && tab === 'browse' && READING_PLANS.map(plan => {
          const started = !!progress[plan.id];
          return (
            <TouchableOpacity
              key={plan.id}
              style={[styles.browseCard, { backgroundColor: th.backgroundSecond, borderColor: th.border }]}
              onPress={() => setDetailId(plan.id)}
              activeOpacity={0.85}
            >
              <View style={[styles.planIconWrap, { backgroundColor: plan.color + '22' }]}>
                <Text style={styles.planIcon}>{plan.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.planName, { color: th.text }]}>{plan.name}</Text>
                <Text style={[styles.planDesc, { color: th.textSecond }]}>{plan.description}</Text>
                <Text style={[styles.planDays, { color: plan.color }]}>
                  {plan.totalDays} days{started ? '  ·  in progress' : ''}
                </Text>
              </View>
              <Text style={{ color: th.textThird, fontSize: 20 }}>›</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar:        { flexDirection: 'row', gap: Spacing.xs, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  tabBtn:        { flex: 1, paddingVertical: 7, borderRadius: Radius.md, alignItems: 'center', borderWidth: 0.5, borderColor: 'rgba(122,31,43,0.25)' },
  tabBtnActive:  { backgroundColor: Colors.purple600, borderColor: Colors.purple600 },
  tabText:       { fontSize: 13, color: '#5C1620', fontWeight: '500' },
  tabTextActive: { color: Colors.gold },

  sectionLabel:  { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm, marginTop: Spacing.md },

  // My plans
  planCard:      { borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.sm },
  planHead:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  planIconWrap:  { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  planIcon:      { fontSize: 22 },
  planName:      { fontSize: 14, fontWeight: '500' },
  planSub:       { fontSize: 12, marginTop: 2 },
  barTrack:      { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill:       { height: '100%', borderRadius: 3 },

  // Browse
  browseCard:    { flexDirection: 'row', gap: Spacing.md, borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, alignItems: 'flex-start' },
  planDesc:      { fontSize: 12, lineHeight: 18, marginTop: 2 },
  planDays:      { fontSize: 11, fontWeight: '500', marginTop: 4 },
  startBtn:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.md, alignSelf: 'flex-start', marginTop: 2 },
  startBtnText:  { color: Colors.gold, fontSize: 12, fontWeight: '500' },

  // Empty
  empty:         { borderWidth: 0.5, borderRadius: Radius.lg, borderStyle: 'dashed', padding: Spacing.xl, alignItems: 'center', gap: Spacing.md },
  emptyText:     { fontSize: 13, textAlign: 'center' },
  browseBtn:     { backgroundColor: Colors.purple600, paddingHorizontal: 24, paddingVertical: 10, borderRadius: Radius.md },
  browseBtnText: { color: Colors.gold, fontWeight: '500', fontSize: 13 },

  // Preview
  startTopBtn:   { backgroundColor: Colors.purple600, paddingVertical: 14, borderRadius: Radius.md, alignItems: 'center', marginBottom: Spacing.md },
  startTopBtnText:{ color: Colors.gold, fontSize: 15, fontWeight: '500' },
  previewDesc:   { fontSize: 14, lineHeight: 21, marginBottom: Spacing.sm },

  // Detail
  detailHead:    { borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.md },
  detailIcon:    { fontSize: 26 },
  detailName:    { color: '#F5E6C8', fontSize: 18, fontWeight: '500', marginTop: 6 },
  detailMeta:    { color: '#E8C76A', fontSize: 13, marginTop: 4, marginBottom: 10 },
  detailBarTrack:{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
  detailBarFill: { height: '100%', borderRadius: 3, backgroundColor: '#E8C76A' },
  continueCard:  { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md },
  continueLabel: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  continueReading:{ fontSize: 16, fontWeight: '500', lineHeight: 24, marginBottom: 12 },
  markBtn:       { backgroundColor: Colors.teal600, paddingVertical: 12, borderRadius: Radius.md, alignItems: 'center' },
  markBtnText:   { color: Colors.gold, fontSize: 14, fontWeight: '500' },
  dayRow:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 0.5, borderRadius: Radius.md, padding: Spacing.md, marginBottom: 6 },
  dayNum:        { fontSize: 11, fontWeight: '500', width: 48 },
  dayLabel:      { flex: 1, fontSize: 13 },
  strike:        { textDecorationLine: 'line-through' },
  check:         { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  abandonBtn:    { marginTop: Spacing.lg, padding: Spacing.md, borderWidth: 0.5, borderRadius: Radius.md, alignItems: 'center' },
  abandonText:   { fontSize: 12, fontWeight: '500' },
});
