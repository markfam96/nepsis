// app/(drawer)/scripture.tsx
// Scripture — Bible reading plans with progress tracking.

import React from 'react';
import SectionScreen, { Segment } from '../../src/components/SectionScreen';
import PlansBody from '../../src/modules/plans';

const SEGMENTS: Segment[] = [{ key: 'plans', label: 'Plans' }];

export default function ScriptureRoute() {
  return (
    <SectionScreen
      title="Reading Plans"
      segments={SEGMENTS}
      active="plans"
      onSelect={() => {}}
    >
      <PlansBody />
    </SectionScreen>
  );
}
