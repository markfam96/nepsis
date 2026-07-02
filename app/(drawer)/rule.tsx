// app/(drawer)/rule.tsx
// Canon — your daily prayer rule and screen-time accountability.

import React, { useState } from 'react';
import SectionScreen, { Segment } from '../../src/components/SectionScreen';
import CanonBody from '../../src/modules/canon';
import ScreenTimeBody from '../../src/modules/screen-time';

const SEGMENTS: Segment[] = [
  { key: 'rule',   label: 'Prayer Rule' },
  { key: 'screen', label: 'Screen Time' },
];

export default function CanonRoute() {
  const [active, setActive] = useState('rule');

  return (
    <SectionScreen
      title="Canon"
      segments={SEGMENTS}
      active={active}
      onSelect={setActive}
    >
      {active === 'rule'   && <CanonBody />}
      {active === 'screen' && <ScreenTimeBody />}
    </SectionScreen>
  );
}
