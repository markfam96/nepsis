// src/services/psalmStore.ts
// Spaced-repetition store for memorizing the Psalms, one passage ("part") at a
// time. The user picks which psalms to learn and in what order; each part is an
// SM-2-style card. Persisted in its own SQLite DB.

import * as SQLite from 'expo-sqlite';
import { partCount as segmentCount } from '../data/agpeyaPsalter';

const DB_NAME = 'nepsis_psalms.db';

export const NEW_PER_SESSION = 5;
export const MASTERED_INTERVAL = 21; // days — a part is considered memorized

let _db: SQLite.SQLiteDatabase | null = null;

export type Grade = 'again' | 'good' | 'easy';

export interface PartCard {
  psalm: number;
  part: number;
  reps: number;
  intervalDays: number;
  ease: number;
  due: string;   // YYYY-MM-DD
}

export const cardId = (psalm: number, part: number) => `${psalm}:${part}`;

function todayStr(): string { return new Date().toISOString().slice(0, 10); }
function addDaysStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  await _db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS psalm_cards (
      card_id  TEXT PRIMARY KEY,
      psalm    INTEGER NOT NULL,
      part     INTEGER NOT NULL,
      reps     INTEGER NOT NULL,
      interval INTEGER NOT NULL,
      ease     REAL NOT NULL,
      due      TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS psalm_selection (
      psalm INTEGER PRIMARY KEY,
      ord   INTEGER NOT NULL
    );
  `);
  return _db;
}

// ─── Selection (which psalms, in what order) ──────────────────────────────────

export async function loadSelection(): Promise<number[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ psalm: number }>(
    `SELECT psalm FROM psalm_selection ORDER BY ord ASC`,
  );
  return rows.map(r => r.psalm);
}

export async function saveSelection(psalms: number[]): Promise<void> {
  const db = await getDB();
  await db.execAsync(`DELETE FROM psalm_selection`);
  for (let i = 0; i < psalms.length; i++) {
    await db.runAsync(`INSERT INTO psalm_selection (psalm, ord) VALUES (?, ?)`, [psalms[i], i]);
  }
}

// ─── Cards ────────────────────────────────────────────────────────────────────

export async function loadCards(): Promise<Record<string, PartCard>> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ psalm: number; part: number; reps: number; interval: number; ease: number; due: string }>(
    `SELECT psalm, part, reps, interval, ease, due FROM psalm_cards`,
  );
  const map: Record<string, PartCard> = {};
  for (const r of rows) {
    map[cardId(r.psalm, r.part)] = {
      psalm: r.psalm, part: r.part, reps: r.reps,
      intervalDays: r.interval, ease: r.ease, due: r.due,
    };
  }
  return map;
}

async function saveCard(c: PartCard): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `INSERT OR REPLACE INTO psalm_cards (card_id, psalm, part, reps, interval, ease, due)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [cardId(c.psalm, c.part), c.psalm, c.part, c.reps, c.intervalDays, c.ease, c.due],
  );
}

export async function review(psalm: number, part: number, existing: PartCard | undefined, grade: Grade): Promise<PartCard> {
  let reps = existing?.reps ?? 0;
  let intervalDays = existing?.intervalDays ?? 0;
  let ease = existing?.ease ?? 2.5;

  if (grade === 'again') {
    reps = 0;
    intervalDays = 0;
    ease = Math.max(1.3, ease - 0.2);
  } else {
    if (reps === 0)      intervalDays = grade === 'easy' ? 2 : 1;
    else if (reps === 1) intervalDays = grade === 'easy' ? 6 : 3;
    else                 intervalDays = Math.round(intervalDays * ease * (grade === 'easy' ? 1.3 : 1));
    reps += 1;
    if (grade === 'easy') ease += 0.15;
  }

  const card: PartCard = {
    psalm, part, reps, intervalDays, ease,
    due: intervalDays <= 0 ? todayStr() : addDaysStr(intervalDays),
  };
  await saveCard(card);
  return card;
}

// ─── Queue & stats (scoped to the selected psalms) ────────────────────────────

export function isDue(card: PartCard): boolean {
  return card.due <= todayStr();
}

export interface PsalmStats {
  totalParts: number;
  newCount: number;
  learning: number;
  mastered: number;
  dueToday: number;
}

export function computeStats(selection: number[], cards: Record<string, PartCard>): PsalmStats {
  let totalParts = 0, learning = 0, mastered = 0, dueToday = 0, started = 0;
  for (const p of selection) {
    const parts = segmentCount(p);
    totalParts += parts;
    for (let i = 0; i < parts; i++) {
      const c = cards[cardId(p, i)];
      if (!c) continue;
      started++;
      if (c.intervalDays >= MASTERED_INTERVAL) mastered++; else learning++;
      if (isDue(c)) dueToday++;
    }
  }
  return { totalParts, newCount: totalParts - started, learning, mastered, dueToday };
}

// Today's queue: due review parts (in selection order), then up to
// NEW_PER_SESSION brand-new parts from the selected psalms, in order.
export function buildQueue(selection: number[], cards: Record<string, PartCard>): { psalm: number; part: number }[] {
  const due: { psalm: number; part: number }[] = [];
  const fresh: { psalm: number; part: number }[] = [];
  for (const p of selection) {
    const parts = segmentCount(p);
    for (let i = 0; i < parts; i++) {
      const c = cards[cardId(p, i)];
      if (!c) {
        if (fresh.length < NEW_PER_SESSION) fresh.push({ psalm: p, part: i });
      } else if (isDue(c)) {
        due.push({ psalm: p, part: i });
      }
    }
  }
  return [...due, ...fresh];
}
