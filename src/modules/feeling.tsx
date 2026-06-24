// app/(tabs)/feeling.tsx
// Emotional wellness — user selects an emotion and receives scripture + patristic comfort

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, useColorScheme,
} from 'react-native';
import { Colors, Light, Dark, Spacing, Radius } from '../constants/theme';
import type { Emotion, EmotionContent } from '../types';

// ─── Content library ──────────────────────────────────────────────────────────

const EMOTIONS: { id: Emotion; label: string; icon: string; color: string }[] = [
  { id: 'sad',      label: 'Sad',       icon: '😔', color: Colors.purple400 },
  { id: 'angry',    label: 'Angry',     icon: '😠', color: Colors.red600    },
  { id: 'anxious',  label: 'Anxious',   icon: '😰', color: Colors.amber600  },
  { id: 'stressed', label: 'Stressed',  icon: '😤', color: Colors.amber200  },
  { id: 'lonely',   label: 'Lonely',    icon: '🌑', color: Colors.gray400   },
  { id: 'hopeless', label: 'Hopeless',  icon: '💔', color: Colors.red600    },
  { id: 'fearful',  label: 'Fearful',   icon: '😨', color: Colors.purple600 },
  { id: 'unwell',   label: 'Unwell',    icon: '🤕', color: Colors.teal600   },
];

const CONTENT: Record<Emotion, EmotionContent> = {
  sad: {
    emotion: 'sad',
    verses: [
      { text: 'The Lord is close to the brokenhearted and saves those who are crushed in spirit.', reference: 'Psalm 34:18' },
      { text: 'He heals the brokenhearted and binds up their wounds.', reference: 'Psalm 147:3' },
      { text: 'Blessed are those who mourn, for they will be comforted.', reference: 'Matthew 5:4' },
    ],
    patristic: [
      { quote: 'Sadness that comes from God is a gift. It cleanses the soul as fire cleanses gold.', source: 'St. John Climacus' },
      { quote: 'Do not be saddened at the thought of your sins, but rather rejoice that you have recognized them.', source: 'St. Seraphim of Sarov' },
    ],
  },
  angry: {
    emotion: 'angry',
    verses: [
      { text: 'Be angry and do not sin; do not let the sun go down on your anger.', reference: 'Ephesians 4:26' },
      { text: 'A fool gives full vent to his spirit, but a wise man quietly holds it back.', reference: 'Proverbs 29:11' },
      { text: 'Know this, my beloved brothers: let every person be quick to hear, slow to speak, slow to anger.', reference: 'James 1:19' },
    ],
    patristic: [
      { quote: 'Anger is a kind of temporary madness. The man who does not control his anger is worse than a beast.', source: 'St. Basil the Great' },
      { quote: 'Never be angry about trivial things. And if you must be angry, let it be against your own faults.', source: 'St. John Chrysostom' },
    ],
  },
  anxious: {
    emotion: 'anxious',
    verses: [
      { text: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.', reference: 'Philippians 4:6' },
      { text: 'Cast all your anxiety on him because he cares for you.', reference: '1 Peter 5:7' },
      { text: 'Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled.', reference: 'John 14:27' },
    ],
    patristic: [
      { quote: 'Anxiety is the greatest enemy of prayer. Give your worries to God with confidence and return to Him with peace.', source: 'St. Theophan the Recluse' },
      { quote: 'Put your trust in God. He who feeds the birds of the air and clothes the lilies will not forget you.', source: 'St. Paisios of the Holy Mountain' },
    ],
  },
  stressed: {
    emotion: 'stressed',
    verses: [
      { text: 'Come to me, all you who are weary and burdened, and I will give you rest.', reference: 'Matthew 11:28' },
      { text: 'The Lord is my shepherd; I shall not want. He makes me lie down in green pastures.', reference: 'Psalm 23:1–2' },
    ],
    patristic: [
      { quote: 'When you feel overwhelmed, stop. Breathe. Say "Lord have mercy" slowly three times and let the peace of God descend.', source: 'St. Porphyrios of Kavsokalyvia' },
    ],
  },
  lonely: {
    emotion: 'lonely',
    verses: [
      { text: 'I will never leave you nor forsake you.', reference: 'Hebrews 13:5' },
      { text: 'Even if my father and mother forsake me, the Lord will receive me.', reference: 'Psalm 27:10' },
    ],
    patristic: [
      { quote: 'In solitude, you are never truly alone. God fills every silence, every empty room, every hour.', source: 'St. Isaac the Syrian' },
    ],
  },
  hopeless: {
    emotion: 'hopeless',
    verses: [
      { text: 'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.', reference: 'Jeremiah 29:11' },
      { text: 'But those who hope in the Lord will renew their strength. They will soar on wings like eagles.', reference: 'Isaiah 40:31' },
      { text: 'Why, my soul, are you downcast? Put your hope in God, for I will yet praise him.', reference: 'Psalm 42:11' },
    ],
    patristic: [
      { quote: "Despair is the enemy's greatest weapon. To struggle is to hope. To pray is to live.", source: 'St. Paisios of the Holy Mountain' },
    ],
  },
  fearful: {
    emotion: 'fearful',
    verses: [
      { text: 'For God gave us a spirit not of fear but of power and love and self-control.', reference: '2 Timothy 1:7' },
      { text: 'Even though I walk through the darkest valley, I will fear no evil, for you are with me.', reference: 'Psalm 23:4' },
    ],
    patristic: [
      { quote: 'Fear is conquered not by courage but by love. He who loves God fears nothing.', source: 'St. John the Theologian' },
    ],
  },
  unwell: {
    emotion: 'unwell',
    verses: [
      { text: 'He took up our pain and bore our suffering.', reference: 'Isaiah 53:4' },
      { text: 'Is anyone among you sick? Let them call the elders of the church to pray over them.', reference: 'James 5:14' },
    ],
    patristic: [
      { quote: 'Illness is permitted by God for the purification of the soul. Accept it with patience as a gift of His love.', source: 'St. Seraphim of Sarov' },
    ],
  },
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function FeelingBody() {
  const scheme = useColorScheme();
  const th = scheme === 'dark' ? Dark : Light;
  const [selected, setSelected] = useState<Emotion | null>(null);

  const content = selected ? CONTENT[selected] : null;

  return (
    <View style={{ flex: 1, backgroundColor: th.background }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 32 }}>
        {/* Emotion grid */}
        <View style={styles.emotionGrid}>
          {EMOTIONS.map(e => {
            const active = selected === e.id;
            return (
              <TouchableOpacity
                key={e.id}
                style={[
                  styles.emotionBtn,
                  { borderColor: active ? e.color : th.border, backgroundColor: active ? e.color + '18' : th.backgroundSecond },
                ]}
                onPress={() => setSelected(active ? null : e.id)}
                activeOpacity={0.75}
              >
                <Text style={styles.emotionIcon}>{e.icon}</Text>
                <Text style={[styles.emotionLabel, { color: active ? e.color : th.textSecond }]}>{e.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Content area */}
        {content && (
          <>
            <Text style={[styles.sectionLabel, { color: th.textSecond }]}>Scripture</Text>
            {content.verses.map((v, i) => (
              <View key={i} style={[styles.verseCard, { backgroundColor: Colors.purple50, borderColor: Colors.purple200 + '55' }]}>
                <Text style={[styles.verseText, { color: Colors.purple900 }]}>"{v.text}"</Text>
                <Text style={[styles.verseRef, { color: Colors.purple600 }]}>{v.reference}</Text>
              </View>
            ))}

            <Text style={[styles.sectionLabel, { color: th.textSecond }]}>From the Fathers</Text>
            {content.patristic.map((p, i) => (
              <View key={i} style={[styles.patriCard, { backgroundColor: th.backgroundSecond, borderColor: th.border }]}>
                <Text style={styles.patriQuote}>❝</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.patriText, { color: th.text }]}>{p.quote}</Text>
                  <Text style={[styles.patriSource, { color: th.textThird }]}>— {p.source}</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.clearBtn, { borderColor: th.border }]}
              onPress={() => setSelected(null)}
            >
              <Text style={[styles.clearBtnText, { color: th.textSecond }]}>← Choose a different feeling</Text>
            </TouchableOpacity>
          </>
        )}

        {!content && (
          <View style={[styles.emptyState, { borderColor: th.border }]}>
            <Text style={[styles.emptyText, { color: th.textThird }]}>
              Select how you're feeling above to receive comfort from Scripture and the Holy Fathers.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header:       { backgroundColor: Colors.goldAccent, padding: Spacing.lg, paddingTop: Spacing.xl },
  headerTitle:  { color: '#2B2118', fontSize: 18, fontWeight: '500' },
  headerSub:    { color: '#5C1620', fontSize: 12, marginTop: 4 },
  emotionGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  emotionBtn:   { width: '22%', aspectRatio: 1, borderWidth: 0.5, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', gap: 4 },
  emotionIcon:  { fontSize: 22 },
  emotionLabel: { fontSize: 10, fontWeight: '500' },
  sectionLabel: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  verseCard:    { borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.md, marginBottom: Spacing.sm },
  verseText:    { fontSize: 14, fontStyle: 'italic', lineHeight: 22, marginBottom: 6 },
  verseRef:     { fontSize: 12, fontWeight: '500' },
  patriCard:    { flexDirection: 'row', gap: Spacing.sm, borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  patriQuote:   { fontSize: 22, color: Colors.purple400, lineHeight: 28 },
  patriText:    { fontSize: 13, lineHeight: 20, fontStyle: 'italic', marginBottom: 4 },
  patriSource:  { fontSize: 11, fontWeight: '500' },
  emptyState:   { borderWidth: 0.5, borderRadius: Radius.lg, borderStyle: 'dashed', padding: Spacing.xl, alignItems: 'center', marginTop: Spacing.lg },
  emptyText:    { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  clearBtn:     { marginTop: Spacing.lg, padding: Spacing.md, borderWidth: 0.5, borderRadius: Radius.md, alignItems: 'center' },
  clearBtnText: { fontSize: 13 },
});
