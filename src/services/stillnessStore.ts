// src/services/stillnessStore.ts
// Records completed stillness (silent-prayer) sessions and derives progress
// stats. Device-only, AsyncStorage — same pattern as the other stores.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QuietTimeTier } from '../types';

const KEY = 'nepsis.stillness';

export interface StillnessSession {
  ts: number;        // epoch ms at completion
  day: string;       // local 'YYYY-MM-DD'
  seconds: number;
  tier: QuietTimeTier;
}

export function tierForSeconds(seconds: number): QuietTimeTier {
  const mins = seconds / 60;
  if (mins >= 30) return 'deep';
  if (mins >= 15) return 'practiced';
  if (mins >= 5)  return 'growing';
  return 'beginner';
}

function localDay(d = new Date()): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function loadSessions(): Promise<StillnessSession[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a: StillnessSession, b: StillnessSession) => b.ts - a.ts); // newest first
  } catch {
    return [];
  }
}

export async function recordSession(seconds: number): Promise<StillnessSession[]> {
  const list = await loadSessions();
  const session: StillnessSession = {
    ts: Date.now(),
    day: localDay(),
    seconds,
    tier: tierForSeconds(seconds),
  };
  const next = [session, ...list];
  try { await AsyncStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  return next;
}

export interface StillnessStats {
  totalSessions: number;
  totalSeconds: number;
  currentStreak: number;   // consecutive days ending today or yesterday
  bestSeconds: number;
  thisWeekSeconds: number;
  daysPracticed: number;   // distinct days ever
}

export function computeStats(sessions: StillnessSession[]): StillnessStats {
  const totalSessions = sessions.length;
  const totalSeconds  = sessions.reduce((sum, s) => sum + s.seconds, 0);
  const bestSeconds   = sessions.reduce((max, s) => Math.max(max, s.seconds), 0);

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeekSeconds = sessions.filter(s => s.ts >= weekAgo).reduce((sum, s) => sum + s.seconds, 0);

  const days = new Set(sessions.map(s => s.day));
  const daysPracticed = days.size;

  // Streak: count back from today (or yesterday, if today isn't practiced yet).
  let currentStreak = 0;
  const cursor = new Date();
  if (!days.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(localDay(cursor))) {
    currentStreak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { totalSessions, totalSeconds, currentStreak, bestSeconds, thisWeekSeconds, daysPracticed };
}
