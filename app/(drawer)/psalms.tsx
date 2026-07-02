// app/(drawer)/psalms.tsx
// Psalms — memorize the Psalter (Agpeya text) with spaced repetition.

import React from 'react';
import SectionScreen, { Segment } from '../../src/components/SectionScreen';
import PsalmsBody from '../../src/modules/psalms';

const SEGMENTS: Segment[] = [{ key: 'psalms', label: 'Psalms' }];

export default function PsalmsRoute() {
  return (
    <SectionScreen
      title="Psalms"
      segments={SEGMENTS}
      active="psalms"
      onSelect={() => {}}
    >
      <PsalmsBody />
    </SectionScreen>
  );
}
