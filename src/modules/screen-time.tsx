// app/(tabs)/screen-time.tsx
// Screen time accountability — set limits and optionally share with spiritual father

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, useColorScheme, Switch,
} from 'react-native';
import { Colors, Light, Dark, Spacing, Radius } from '../constants/theme';
import type { ScreenTimeLimit } from '../types';

// ─── Simulated current week data ─────────────────────────────────────────────

const WEEK_DATA = [
  { day: 'Mon', socialMins: 48,  totalMins: 180 },
  { day: 'Tue', socialMins: 92,  totalMins: 265 },
  { day: 'Wed', socialMins: 110, totalMins: 310 },
  { day: 'Thu', socialMins: 35,  totalMins: 140 },
  { day: 'Fri', socialMins: 67,  totalMins: 195 },
  { day: 'Sat', socialMins: 88,  totalMins: 240 },
  { day: 'Sun', socialMins: 22,  totalMins: 90  },
];

const SOCIAL_LIMIT  = 120;
const TOTAL_LIMIT   = 240;

function minsToLabel(m: number) {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

const SOCIAL_LIMIT_OPTIONS = [30, 60, 90, 120, 180];
const TOTAL_LIMIT_OPTIONS  = [120, 180, 240, 360, 480];

export default function ScreenTimeBody() {
  const scheme = useColorScheme();
  const th = scheme === 'dark' ? Dark : Light;
  const [limits, setLimits] = useState<ScreenTimeLimit>({
    socialMediaDailyMinutes: SOCIAL_LIMIT,
    totalDailyMinutes:       TOTAL_LIMIT,
    shareWeeklyWithFather:   false,
  });
  const [editSocial, setEditSocial] = useState(false);
  const [editTotal,  setEditTotal]  = useState(false);

  const maxBar = Math.max(...WEEK_DATA.map(d => d.totalMins));

  // Weekly averages
  const avgSocial = Math.round(WEEK_DATA.reduce((s, d) => s + d.socialMins, 0) / 7);
  const avgTotal  = Math.round(WEEK_DATA.reduce((s, d) => s + d.totalMins, 0) / 7);

  return (
    <View style={{ flex: 1, backgroundColor: th.background }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 32 }}>
        {/* This week summary */}
        <Text style={[styles.sectionLabel, { color: th.textSecond }]}>This week</Text>

        <View style={[styles.summaryRow, { backgroundColor: th.backgroundSecond, borderColor: th.border }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: avgSocial > limits.socialMediaDailyMinutes ? Colors.red600 : Colors.teal600 }]}>
              {minsToLabel(avgSocial)}
            </Text>
            <Text style={[styles.summaryLabel, { color: th.textThird }]}>Avg social / day</Text>
            <Text style={[styles.summaryLimit, { color: th.textThird }]}>limit {minsToLabel(limits.socialMediaDailyMinutes)}</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: th.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: avgTotal > limits.totalDailyMinutes ? Colors.red600 : Colors.teal600 }]}>
              {minsToLabel(avgTotal)}
            </Text>
            <Text style={[styles.summaryLabel, { color: th.textThird }]}>Avg total / day</Text>
            <Text style={[styles.summaryLimit, { color: th.textThird }]}>limit {minsToLabel(limits.totalDailyMinutes)}</Text>
          </View>
        </View>

        {/* Bar chart */}
        <View style={[styles.chartCard, { backgroundColor: th.backgroundSecond, borderColor: th.border }]}>
          <View style={styles.chartBars}>
            {WEEK_DATA.map(d => {
              const heightPct   = d.totalMins / maxBar;
              const socialPct   = d.socialMins / d.totalMins;
              const overSocial  = d.socialMins > limits.socialMediaDailyMinutes;
              const overTotal   = d.totalMins  > limits.totalDailyMinutes;
              return (
                <View key={d.day} style={styles.chartBarCol}>
                  <View style={[styles.chartBarWrap, { height: 80 }]}>
                    <View style={{ flex: 1 }} />
                    <View style={[styles.chartBar, {
                      height: `${heightPct * 100}%`,
                      backgroundColor: overTotal ? Colors.red600 + 'AA' : '#24334AAA',
                    }]}>
                      {/* Social portion */}
                      <View style={[styles.chartBarSocial, {
                        height: `${socialPct * 100}%`,
                        backgroundColor: overSocial ? Colors.red600 : '#D4AF37',
                      }]} />
                    </View>
                  </View>
                  <Text style={[styles.chartDay, { color: th.textThird }]}>{d.day}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#D4AF37' }]} />
              <Text style={[styles.legendText, { color: th.textThird }]}>Social media</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#24334A' }]} />
              <Text style={[styles.legendText, { color: th.textThird }]}>Other screen time</Text>
            </View>
          </View>
        </View>

        {/* Limits */}
        <Text style={[styles.sectionLabel, { color: th.textSecond }]}>Daily limits</Text>

        {/* Social limit */}
        <View style={[styles.limitCard, { backgroundColor: th.backgroundSecond, borderColor: th.border }]}>
          <View style={styles.limitHeader}>
            <Text style={[styles.limitTitle, { color: th.text }]}>Social media</Text>
            <TouchableOpacity onPress={() => { setEditSocial(e => !e); setEditTotal(false); }}>
              <Text style={[styles.limitValue, { color: Colors.purple600 }]}>{minsToLabel(limits.socialMediaDailyMinutes)} ▾</Text>
            </TouchableOpacity>
          </View>
          {editSocial && (
            <View style={styles.optionRow}>
              {SOCIAL_LIMIT_OPTIONS.map(v => (
                <TouchableOpacity
                  key={v}
                  style={[styles.optionBtn, { borderColor: limits.socialMediaDailyMinutes === v ? Colors.purple600 : th.border, backgroundColor: limits.socialMediaDailyMinutes === v ? Colors.purple50 : 'transparent' }]}
                  onPress={() => { setLimits(l => ({ ...l, socialMediaDailyMinutes: v })); setEditSocial(false); }}
                >
                  <Text style={[styles.optionText, { color: limits.socialMediaDailyMinutes === v ? Colors.purple800 : th.textSecond }]}>{minsToLabel(v)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Total limit */}
        <View style={[styles.limitCard, { backgroundColor: th.backgroundSecond, borderColor: th.border }]}>
          <View style={styles.limitHeader}>
            <Text style={[styles.limitTitle, { color: th.text }]}>Total screen time</Text>
            <TouchableOpacity onPress={() => { setEditTotal(e => !e); setEditSocial(false); }}>
              <Text style={[styles.limitValue, { color: Colors.purple600 }]}>{minsToLabel(limits.totalDailyMinutes)} ▾</Text>
            </TouchableOpacity>
          </View>
          {editTotal && (
            <View style={styles.optionRow}>
              {TOTAL_LIMIT_OPTIONS.map(v => (
                <TouchableOpacity
                  key={v}
                  style={[styles.optionBtn, { borderColor: limits.totalDailyMinutes === v ? Colors.purple600 : th.border, backgroundColor: limits.totalDailyMinutes === v ? Colors.purple50 : 'transparent' }]}
                  onPress={() => { setLimits(l => ({ ...l, totalDailyMinutes: v })); setEditTotal(false); }}
                >
                  <Text style={[styles.optionText, { color: limits.totalDailyMinutes === v ? Colors.purple800 : th.textSecond }]}>{minsToLabel(v)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Share with father */}
        <View style={[styles.limitCard, { backgroundColor: th.backgroundSecond, borderColor: th.border }]}>
          <View style={styles.limitHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.limitTitle, { color: th.text }]}>Share with spiritual father</Text>
              <Text style={[styles.limitDesc, { color: th.textThird }]}>Send a weekly summary to your father of confession</Text>
            </View>
            <Switch
              value={limits.shareWeeklyWithFather}
              onValueChange={v => setLimits(l => ({ ...l, shareWeeklyWithFather: v }))}
              trackColor={{ true: Colors.teal600, false: th.border }}
              thumbColor={limits.shareWeeklyWithFather ? Colors.teal200 : th.textThird}
            />
          </View>
        </View>

        {/* Notice */}
        <View style={[styles.noticeCard, { backgroundColor: Colors.amber50, borderColor: Colors.amber200 + '55' }]}>
          <Text style={{ fontSize: 12, color: Colors.amber600, lineHeight: 18 }}>
            ⚠️  Nepsis cannot enforce these limits on other apps. These are accountability tools — honest self-reporting and the fear of God are the only true guards.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header:         { backgroundColor: Colors.goldAccent, padding: Spacing.lg, paddingTop: Spacing.xl },
  headerTitle:    { color: '#2B2118', fontSize: 18, fontWeight: '500' },
  headerSub:      { color: '#5C1620', fontSize: 12, marginTop: 4 },
  sectionLabel:   { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm, marginTop: Spacing.md },
  summaryRow:     { flexDirection: 'row', borderWidth: 0.5, borderRadius: Radius.lg, overflow: 'hidden' },
  summaryItem:    { flex: 1, padding: Spacing.md, alignItems: 'center' },
  summaryValue:   { fontSize: 22, fontWeight: '500' },
  summaryLabel:   { fontSize: 11, marginTop: 2 },
  summaryLimit:   { fontSize: 10, marginTop: 1 },
  summaryDivider: { width: 0.5 },
  chartCard:      { borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  chartBars:      { flexDirection: 'row', gap: Spacing.xs, alignItems: 'flex-end', height: 104 },
  chartBarCol:    { flex: 1, alignItems: 'center', gap: 4 },
  chartBarWrap:   { width: '100%', justifyContent: 'flex-end' },
  chartBar:       { width: '100%', borderRadius: 3, justifyContent: 'flex-end', overflow: 'hidden' },
  chartBarSocial: { width: '100%', borderRadius: 3 },
  chartDay:       { fontSize: 9, fontWeight: '500' },
  chartLegend:    { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm, justifyContent: 'center' },
  legendItem:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:      { width: 8, height: 8, borderRadius: 4 },
  legendText:     { fontSize: 10 },
  limitCard:      { borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  limitHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  limitTitle:     { fontSize: 13, fontWeight: '500' },
  limitDesc:      { fontSize: 11, marginTop: 2 },
  limitValue:     { fontSize: 15, fontWeight: '500' },
  optionRow:      { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm, flexWrap: 'wrap' },
  optionBtn:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1 },
  optionText:     { fontSize: 12, fontWeight: '500' },
  noticeCard:     { borderRadius: Radius.md, borderWidth: 0.5, padding: Spacing.md, marginTop: Spacing.sm },
});
