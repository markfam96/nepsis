// src/services/planStore.ts
// Persists reading-plan progress on-device with expo-sqlite (non-sensitive,
// so it lives in its own simple key-value DB).

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'nepsis_plans.db';

let _db: SQLite.SQLiteDatabase | null = null;

export interface PlanProgress {
  startedAt: string;     // ISO
  completed: number[];   // day numbers marked done
}

async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  await _db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS plan_progress (
      plan_id TEXT PRIMARY KEY,
      data    TEXT NOT NULL
    );
  `);
  return _db;
}

export async function loadAllProgress(): Promise<Record<string, PlanProgress>> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ plan_id: string; data: string }>(
    `SELECT plan_id, data FROM plan_progress`,
  );
  const map: Record<string, PlanProgress> = {};
  for (const r of rows) {
    try { map[r.plan_id] = JSON.parse(r.data) as PlanProgress; } catch {}
  }
  return map;
}

export async function saveProgress(planId: string, progress: PlanProgress): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `INSERT OR REPLACE INTO plan_progress (plan_id, data) VALUES (?, ?)`,
    [planId, JSON.stringify(progress)],
  );
}

export async function removeProgress(planId: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM plan_progress WHERE plan_id = ?`, [planId]);
}

// The current day = the first day not yet completed (1-based), capped at totalDays+1.
export function currentDay(progress: PlanProgress, totalDays: number): number {
  const done = new Set(progress.completed);
  for (let d = 1; d <= totalDays; d++) {
    if (!done.has(d)) return d;
  }
  return totalDays + 1; // finished
}
