// app/(drawer)/rule.tsx
// Rule of Life — your daily canon and screen-time accountability.

import React, { useState } from 'react';
import SectionScreen, { Segment } from '../../src/components/SectionScreen';
import CanonBody from '../../src/modules/canon';
import ScreenTimeBody from '../../src/modules/screen-time';

const SEGMENTS: Segment[] = [
  { key: 'canon',  label: 'Canon'       },
  { key: 'screen', label: 'Screen time' },
];

export default function RuleRoute() {
  const [active, setActive] = useState('canon');

  return (
    <SectionScreen
      title="Rule of Life"
      segments={SEGMENTS}
      active={active}
      onSelect={setActive}
    >
      {active === 'canon'  && <CanonBody />}
      {active === 'screen' && <ScreenTimeBody />}
    </SectionScreen>
  );
}
