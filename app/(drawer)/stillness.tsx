// app/(drawer)/stillness.tsx
// Stillness & Soul — silent prayer timer, emotional comfort, and your anchor verse.

import React, { useState } from 'react';
import SectionScreen, { Segment } from '../../src/components/SectionScreen';
import StillnessBody from '../../src/modules/quiet';
import FeelingBody from '../../src/modules/feeling';
import AnchorBody from '../../src/modules/anchor';

const SEGMENTS: Segment[] = [
  { key: 'stillness', label: 'Stillness' },
  { key: 'feeling',   label: 'Feeling'   },
  { key: 'anchor',    label: 'Anchor'    },
];

export default function WatchfulnessRoute() {
  const [active, setActive] = useState('stillness');

  return (
    <SectionScreen
      title="Watchfulness"
      segments={SEGMENTS}
      active={active}
      onSelect={setActive}
    >
      {active === 'stillness' && <StillnessBody />}
      {active === 'feeling'   && <FeelingBody />}
      {active === 'anchor'    && <AnchorBody />}
    </SectionScreen>
  );
}
