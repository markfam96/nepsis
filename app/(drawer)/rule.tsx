// app/(drawer)/rule.tsx
// Canon — your daily prayer rule, memorizing the Psalms, and screen-time accountability.

import React, { useState } from 'react';
import SectionScreen, { Segment } from '../../src/components/SectionScreen';
import CanonBody from '../../src/modules/canon';
import PsalmsBody from '../../src/modules/psalms';
import ScreenTimeBody from '../../src/modules/screen-time';

const SEGMENTS: Segment[] = [
  { key: 'rule',   label: 'Prayer Rule' },
  { key: 'psalms', label: 'Psalms'      },
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
      {active === 'psalms' && <PsalmsBody />}
      {active === 'screen' && <ScreenTimeBody />}
    </SectionScreen>
  );
}
