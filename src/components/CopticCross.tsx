// src/components/CopticCross.tsx
// A Coptic cross — four equal arms that flare outward (pattée) and end in a
// forked tip, giving the characteristic star-like silhouette, with a small
// central medallion. Rendered as SVG so it scales crisply at any size.

import React from 'react';
import Svg, { G, Path, Circle } from 'react-native-svg';
import { Colors } from '../constants/theme';

interface Props {
  size?: number;
  color?: string;
}

// One arm pointing up: narrow at the centre, flaring out to wide shoulders,
// ending in three outward points (a trefoil) with two shallow notches between.
const ARM = 'M44 47 L40 26 L34 10 L43 17 L50 3 L57 17 L66 10 L60 26 L56 47 Z';

export default function CopticCross({ size = 32, color = Colors.gold }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Four flared, forked arms radiating from the centre */}
      <Path d={ARM} fill={color} />
      <G rotation={90}  origin="50, 50"><Path d={ARM} fill={color} /></G>
      <G rotation={180} origin="50, 50"><Path d={ARM} fill={color} /></G>
      <G rotation={270} origin="50, 50"><Path d={ARM} fill={color} /></G>

      {/* Central medallion */}
      <Circle cx="50" cy="50" r="10" fill={color} />
    </Svg>
  );
}
