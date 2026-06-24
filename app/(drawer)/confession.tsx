// app/(drawer)/confession.tsx
// Confession stands alone — it manages its own hub, journal, examination,
// in-session notes, and completion flow internally.

import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import ConfessionScreen from '../../src/modules/confession';

export default function ConfessionRoute() {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FAF4E8' }}>
      <ConfessionScreen />
    </SafeAreaView>
  );
}
