// src/components/SectionScreen.tsx
// Shared scaffold for a consolidated drawer destination: a gold header bar with
// a menu button (opens the drawer) and a segmented switcher, then the body.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { Colors, Spacing, Radius } from '../constants/theme';

export interface Segment {
  key: string;
  label: string;
}

interface Props {
  title: string;
  segments: Segment[];
  active: string;
  onSelect: (key: string) => void;
  background?: string;        // outer background (defaults to parchment)
  children: React.ReactNode;  // the selected body, fills remaining space
}

export default function SectionScreen({
  title, segments, active, onSelect, background = '#FAF4E8', children,
}: Props) {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: background }}>
      {/* Gold header bar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.openDrawer?.()}
          hitSlop={10}
          style={styles.menuBtn}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.menuBtn} />
      </View>

      {/* Segmented switcher */}
      {segments.length > 1 && (
        <View style={[styles.segmented, { backgroundColor: background }]}>
          {segments.map(s => {
            const on = s.key === active;
            return (
              <TouchableOpacity
                key={s.key}
                style={[styles.segBtn, on && styles.segBtnActive]}
                onPress={() => onSelect(s.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.segText, on && styles.segTextActive]}>{s.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Body */}
      <View style={{ flex: 1 }}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header:        { backgroundColor: Colors.goldAccent, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  menuBtn:       { width: 32, alignItems: 'flex-start', justifyContent: 'center' },
  menuIcon:      { fontSize: 22, color: '#2B2118' },
  title:         { color: '#2B2118', fontSize: 18, fontWeight: '500' },
  segmented:     { flexDirection: 'row', gap: Spacing.xs, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  segBtn:        { flex: 1, paddingVertical: 7, borderRadius: Radius.md, alignItems: 'center', borderWidth: 0.5, borderColor: 'rgba(122,31,43,0.25)' },
  segBtnActive:  { backgroundColor: Colors.purple600, borderColor: Colors.purple600 },
  segText:       { fontSize: 13, color: '#5C1620', fontWeight: '500' },
  segTextActive: { color: Colors.gold },
});
