// src/services/planStore.ts
// Persists reading-plan progress on-device with AsyncStorage.

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'nepsis.plans.progress';

export interface PlanProgress {
  startedAt: string;     // ISO
  completed: number[];   // day numbers marked done
}

async function readAll(): Promise<Record<string, PlanProgress>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, PlanProgress>) : {};
  } catch {
    return {};
  }
}
async function writeAll(map: Record<string, PlanProgress>): Promise<void> {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(map)); } catch {}
}

export async function loadAllProgress(): Promise<Record<string, PlanProgress>> {
  return readAll();
}

export async function saveProgress(planId: string, progress: PlanProgress): Promise<void> {
  const map = await readAll();
  map[planId] = progress;
  await writeAll(map);
}

export async function removeProgress(planId: string): Promise<void> {
  const map = await readAll();
  delete map[planId];
  await writeAll(map);
}

// The current day = the first day not yet completed (1-based), capped at totalDays+1.
export function currentDay(progress: PlanProgress, totalDays: number): number {
  const done = new Set(progress.completed);
  for (let d = 1; d <= totalDays; d++) {
    if (!done.has(d)) return d;
  }
  return totalDays + 1; // finished
}
