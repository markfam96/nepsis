// app/(drawer)/index.tsx
// Home hub — liturgical date, verse of the day, today's readings, and the
// gateway cards into the four sections of the app.

import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useNavigation } from 'expo-router';
import { Colors, Light, Dark, Spacing, Radius } from '../../src/constants/theme';
import CopticCross from '../../src/components/CopticCross';
import Harp from '../../src/components/Harp';
import { copticToday } from '../../src/utils/copticDate';

const VERSE_OF_DAY = {
  text: 'I can do all things through Christ who strengthens me.',
  ref:  'Philippians 4:13',
};

const SECTIONS = [
  { route: '/stillness',  icon: '🕯️', label: 'Watchfulness',  sub: 'Prayer · feeling · anchor' },
  { route: '/psalms',     icon: '🎵', label: 'Psalms',        sub: 'Memorize the Psalter'      },
  { route: '/scripture',  icon: '📖', label: 'Reading Plans', sub: 'Read & track the Bible'    },
  { route: '/rule',       icon: '🙏', label: 'Canon',         sub: 'Prayer rule · screen time' },
  { route: '/confession', icon: '🕊', label: 'Confession',    sub: 'Examine · journal · log'   },
] as const;

export default function HomeHub() {
  const scheme = useColorScheme();
  const th = scheme === 'dark' ? Dark : Light;
  const router = useRouter();
  const navigation = useNavigation<any>();

  const copticDate = copticToday().label;
  const gregorian  = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: th.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* ── Hero banner ── */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <TouchableOpacity onPress={() => navigation.openDrawer?.()} hitSlop={10}>
              <Text style={styles.menuIcon}>☰</Text>
            </TouchableOpacity>
            <CopticCross size={30} color="#5C1620" />
            <View>
              <Text style={styles.heroGreeting}>Peace be with you</Text>
              <Text style={styles.heroCoptic}>{copticDate}</Text>
              <Text style={styles.heroGregorian}>{gregorian}</Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: Spacing.lg }}>
          {/* ── Verse of the day ── */}
          <View style={[styles.verseCard, { backgroundColor: th.backgroundSecond, borderColor: Colors.purple200 + '55' }]}>
            <Text style={[styles.verseText, { color: th.text }]}>"{VERSE_OF_DAY.text}"</Text>
            <Text style={[styles.verseRef, { color: Colors.purple600 }]}>{VERSE_OF_DAY.ref}</Text>
          </View>

          {/* ── Section navigation ── */}
          <Text style={[styles.sectionLabel, { color: th.textSecond }]}>Explore</Text>
          <View style={styles.grid}>
            {SECTIONS.map(card => (
              <TouchableOpacity
                key={card.route}
                style={[styles.card, { backgroundColor: th.backgroundSecond, borderColor: th.border }]}
                activeOpacity={0.75}
                onPress={() => router.push(card.route as any)}
              >
                {card.route === '/psalms'
                  ? <View style={{ marginBottom: 6 }}><Harp size={24} color={Colors.purple600} /></View>
                  : <Text style={styles.cardIcon}>{card.icon}</Text>}
                <Text style={[styles.cardLabel, { color: th.text }]}>{card.label}</Text>
                <Text style={[styles.cardSub, { color: th.textThird }]}>{card.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero:            { backgroundColor: Colors.goldAccent, padding: Spacing.xl, paddingTop: Spacing.lg },
  heroTop:         { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIcon:        { fontSize: 22, color: '#2B2118' },
  heroGreeting:    { color: '#5C1620', fontSize: 13, letterSpacing: 0.5, marginBottom: 2 },
  heroCoptic:      { color: '#2B2118', fontSize: 22, fontWeight: '500' },
  heroGregorian:   { color: '#5C1620', fontSize: 12, marginTop: 2 },
  feastBadge:      { alignSelf: 'flex-start', marginTop: 10, backgroundColor: Colors.purple600, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 4 },
  feastBadgeText:  { color: Colors.gold, fontSize: 12, fontWeight: '500' },
  sectionLabel:    { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: Spacing.xl, marginBottom: Spacing.sm },
  verseCard:       { borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.lg, marginTop: Spacing.lg },
  verseText:       { fontSize: 15, fontStyle: 'italic', lineHeight: 24, marginBottom: 6 },
  verseRef:        { fontSize: 12, fontWeight: '500' },
  readingsCard:    { borderRadius: Radius.lg, borderWidth: 0.5, overflow: 'hidden' },
  readingRow:      { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(122,31,43,0.12)' },
  readingLabel:    { fontSize: 12, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.3, width: 70 },
  readingRef:      { fontSize: 13, flex: 1, textAlign: 'right' },
  synaxCard:       { borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.md },
  grid:            { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  card:            { width: '47.5%', borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.md },
  cardIcon:        { fontSize: 22, marginBottom: 6 },
  cardLabel:       { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  cardSub:         { fontSize: 11 },
});
