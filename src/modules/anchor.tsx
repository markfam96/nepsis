// app/(tabs)/anchor.tsx
// Anchor — a saved verse or prayer that the user returns to as their spiritual anchor.
// They can set one verse and see it in full-screen "breath" mode.

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, useColorScheme, Modal,
} from 'react-native';
import { Colors, Light, Dark, Spacing, Radius } from '../constants/theme';

const SUGGESTED_ANCHORS = [
  { text: 'Lord Jesus Christ, Son of God, have mercy on me, a sinner.', ref: 'Jesus Prayer' },
  { text: 'I can do all things through Christ who strengthens me.', ref: 'Philippians 4:13' },
  { text: 'Be still and know that I am God.', ref: 'Psalm 46:10' },
  { text: 'The Lord is my shepherd; I shall not want.', ref: 'Psalm 23:1' },
  { text: 'For I am convinced that neither death nor life… shall be able to separate us from the love of God.', ref: 'Romans 8:38–39' },
  { text: 'Come to me, all you who are weary and burdened, and I will give you rest.', ref: 'Matthew 11:28' },
];

export default function AnchorBody() {
  const scheme = useColorScheme();
  const th = scheme === 'dark' ? Dark : Light;
  const [anchor, setAnchor] = useState({ text: 'Lord Jesus Christ, Son of God, have mercy on me, a sinner.', ref: 'Jesus Prayer' });
  const [breathMode, setBreathMode] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ text: '', ref: '' });

  const startEdit = () => {
    setDraft({ text: anchor.text, ref: anchor.ref });
    setEditing(true);
  };

  const startBlank = () => {
    setDraft({ text: '', ref: '' });
    setEditing(true);
  };

  const saveEdit = () => {
    if (draft.text.trim()) setAnchor({ text: draft.text.trim(), ref: draft.ref.trim() });
    setEditing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: th.background }}>
      {/* Breath / meditation modal */}
      <Modal visible={breathMode} animationType="fade" statusBarTranslucent>
        <View style={styles.breathModal}>
          <Text style={styles.breathText}>{anchor.text}</Text>
          <Text style={styles.breathRef}>{anchor.ref}</Text>
          <TouchableOpacity style={styles.breathClose} onPress={() => setBreathMode(false)}>
            <Text style={{ color: Colors.goldMuted, fontSize: 14 }}>✕  Return</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 32 }}>
        {/* Current anchor */}
        <TouchableOpacity
          style={[styles.anchorCard, { backgroundColor: '#7A1F2B', borderColor: Colors.goldAccent }]}
          onPress={() => setBreathMode(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.anchorText}>{anchor.text}</Text>
          <Text style={styles.anchorRef}>{anchor.ref}</Text>
          <Text style={[styles.anchorHint, { color: '#D9B88A' }]}>Tap to enter prayer mode</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.editBtn, { borderColor: Colors.goldAccent }]} onPress={startEdit}>
          <Text style={[styles.editBtnText, { color: Colors.purple600 }]}>✎  Edit my anchor</Text>
        </TouchableOpacity>

        {/* Edit panel */}
        {editing && (
          <View style={[styles.editPanel, { backgroundColor: th.backgroundSecond, borderColor: th.border }]}>
            <Text style={[styles.editLabel, { color: th.textSecond }]}>Verse / Prayer</Text>
            <TextInput
              style={[styles.editInput, { color: th.text, borderColor: th.border }]}
              value={draft.text}
              onChangeText={t => setDraft(d => ({ ...d, text: t }))}
              multiline
              placeholder="Enter your anchor text…"
              placeholderTextColor={th.textThird}
            />
            <Text style={[styles.editLabel, { color: th.textSecond, marginTop: Spacing.sm }]}>Reference</Text>
            <TextInput
              style={[styles.editInputSingle, { color: th.text, borderColor: th.border }]}
              value={draft.ref}
              onChangeText={r => setDraft(d => ({ ...d, ref: r }))}
              placeholder="e.g. John 3:16"
              placeholderTextColor={th.textThird}
            />
            <View style={styles.editBtns}>
              <TouchableOpacity style={[styles.editActionBtn, { backgroundColor: Colors.purple600 }]} onPress={saveEdit}>
                <Text style={{ color: Colors.gold, fontWeight: '500' }}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.editActionBtn, { backgroundColor: th.backgroundThird }]} onPress={() => setEditing(false)}>
                <Text style={{ color: th.textSecond }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Write your own */}
        <TouchableOpacity
          style={[styles.writeOwnCard, { borderColor: Colors.goldAccent, backgroundColor: th.backgroundSecond }]}
          onPress={startBlank}
          activeOpacity={0.8}
        >
          <Text style={styles.writeOwnIcon}>✎</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.writeOwnTitle, { color: th.text }]}>Write your own anchor</Text>
            <Text style={[styles.writeOwnSub, { color: th.textThird }]}>A verse, prayer, or words of your own</Text>
          </View>
        </TouchableOpacity>

        {/* Suggestions */}
        <Text style={[styles.sectionLabel, { color: th.textSecond }]}>Suggested anchors</Text>
        {SUGGESTED_ANCHORS.map((s, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.suggCard, { backgroundColor: th.backgroundSecond, borderColor: th.border }]}
            onPress={() => { setAnchor(s); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.suggText, { color: th.text }]} numberOfLines={2}>{s.text}</Text>
            <Text style={[styles.suggRef, { color: Colors.purple600 }]}>{s.ref}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header:          { backgroundColor: Colors.goldAccent, padding: Spacing.lg, paddingTop: Spacing.xl },
  headerTitle:     { color: '#2B2118', fontSize: 18, fontWeight: '500' },
  headerSub:       { color: '#5C1620', fontSize: 12, marginTop: 4 },
  anchorCard:      { borderWidth: 1, borderRadius: Radius.xl, padding: Spacing.xl, marginBottom: Spacing.md },
  anchorText:      { color: '#F5E6C8', fontSize: 16, lineHeight: 26, fontStyle: 'italic', marginBottom: 10 },
  anchorRef:       { color: '#E8C76A', fontSize: 13, fontWeight: '500', marginBottom: 12 },
  anchorHint:      { fontSize: 11, letterSpacing: 0.3 },
  editBtn:         { borderWidth: 0.5, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.lg },
  editBtnText:     { fontSize: 13, fontWeight: '500' },
  editPanel:       { borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.lg },
  editLabel:       { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  editInput:       { borderWidth: 0.5, borderRadius: Radius.md, padding: Spacing.sm, minHeight: 80, textAlignVertical: 'top', fontSize: 13, lineHeight: 20 },
  editInputSingle: { borderWidth: 0.5, borderRadius: Radius.md, padding: Spacing.sm, fontSize: 13 },
  editBtns:        { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  editActionBtn:   { flex: 1, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'center' },
  sectionLabel:    { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm },
  suggCard:        { borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  suggText:        { fontSize: 13, lineHeight: 20, marginBottom: 4 },
  suggRef:         { fontSize: 11, fontWeight: '500' },
  writeOwnCard:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.lg },
  writeOwnIcon:    { fontSize: 20, color: Colors.purple600 },
  writeOwnTitle:   { fontSize: 14, fontWeight: '500' },
  writeOwnSub:     { fontSize: 11, marginTop: 2 },
  breathModal:     { flex: 1, backgroundColor: '#7A1F2B', alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  breathText:      { color: '#F5E6C8', fontSize: 20, lineHeight: 34, textAlign: 'center', fontStyle: 'italic', marginBottom: 16 },
  breathRef:       { color: '#E8C76A', fontSize: 14, fontWeight: '500', marginBottom: 48 },
  breathClose:     { position: 'absolute', top: 56, right: 24 },
});
