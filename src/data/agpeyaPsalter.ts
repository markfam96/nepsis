// src/data/agpeyaPsalter.ts
// The Psalms exactly as they appear in the Coptic Agpeya — superscriptions
// omitted, in the Agpeya's own English translation, grouped by the canonical
// hours. Psalm 118 is divided into its 22 traditional sections; every other
// psalm is a single part, as the Agpeya prays it.

import RAW from './agpeyaPsalms.json';

export interface AgpeyaHour {
  key: string;
  name: string;
  psalms: number[];
}

interface PsalmEntry {
  parts: string[];
  hours: string[];
}

const DATA = RAW as unknown as {
  hours: AgpeyaHour[];
  psalms: Record<string, PsalmEntry>;
};

export const HOURS: AgpeyaHour[] = DATA.hours;

export const PSALM_NUMBERS: number[] = Object.keys(DATA.psalms)
  .map(n => parseInt(n, 10))
  .sort((a, b) => a - b);

export function getParts(psalm: number): string[] {
  return DATA.psalms[String(psalm)]?.parts ?? [];
}

export function partCount(psalm: number): number {
  return getParts(psalm).length;
}

export function psalmHours(psalm: number): string[] {
  return DATA.psalms[String(psalm)]?.hours ?? [];
}

export function hourName(key: string): string {
  return HOURS.find(h => h.key === key)?.name ?? key;
}
