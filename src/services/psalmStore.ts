// src/services/psalmStore.ts
// Spaced-repetition store for memorizing the Psalms, one passage ("part") at a
// time. The user picks which psalms to learn and in what order; each part is an
// SM-2-style card. Persisted in its own SQLite DB.

import * as SQLite from 'expo-sqlite';
import { unitCount as segmentCount } from '../data/agpeyaPsalter';

const DB_NAME = 'nepsis_psalms.db';

export const NEW_PER_SESSION = 5;        // default new cards/day
export const NEW_PER_DAY_OPTIONS = [1, 3, 5, 10, 15, 20];
export const MAX_REVIEWS_PER_SESSION = 20;
export const MASTERED_INTERVAL = 21; // days — a part is considered "mature"

let _db: SQLite.SQLiteDatabase | null = null;

export type Grade = 'again' | 'hard' | 'good' | 'easy';

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
    CREATE TABLE IF NOT EXISTS psalm_meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS psalm_recite (
      psalm    INTEGER PRIMARY KEY,
      reps     INTEGER NOT NULL,
      interval INTEGER NOT NULL,
      due      TEXT NOT NULL,
      last     TEXT NOT NULL
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
  let prev = existing?.intervalDays ?? 0;
  let ease = existing?.ease ?? 2.5;
  const isNew = reps === 0;

  let intervalDays: number;
  switch (grade) {
    case 'again':
      ease = Math.max(1.3, ease - 0.2);
      reps = 0;
      intervalDays = 1;                                  // relearn tomorrow
      break;
    case 'hard':
      ease = Math.max(1.3, ease - 0.15);
      intervalDays = isNew ? 1 : Math.max(1, Math.round(prev * 1.2));
      reps += 1;
      break;
    case 'good':
      intervalDays = isNew ? 1 : Math.max(1, Math.round(prev * ease));   // ease ≈ 2.5
      reps += 1;
      break;
    case 'easy':
    default:
      ease = ease + 0.15;
      intervalDays = isNew ? 3 : Math.max(1, Math.round(prev * ease * 1.5)); // ≈ ×4
      reps += 1;
      break;
  }

  const card: PartCard = { psalm, part, reps, intervalDays, ease, due: addDaysStr(intervalDays) };
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
// The psalm currently being learned: the first in the user's order that isn't
// yet fully memorized (some portion not mature). New cards are drawn only from
// it, so the user learns one psalm at a time — and the next psalm doesn't begin
// until the current one is fully learned.
export function learningPsalm(selection: number[], cards: Record<string, PartCard>): number | null {
  for (const p of selection) {
    const { mature, total } = portionsMature(p, cards);
    if (total > 0 && mature < total) return p;
  }
  return null;
}

export function buildQueue(
  selection: number[],
  cards: Record<string, PartCard>,
  newLimit: number = NEW_PER_SESSION,
): { psalm: number; part: number }[] {
  // Due reviews come from every learned psalm.
  const due: { psalm: number; part: number }[] = [];
  for (const p of selection) {
    const parts = segmentCount(p);
    for (let i = 0; i < parts; i++) {
      const c = cards[cardId(p, i)];
      if (c && isDue(c)) due.push({ psalm: p, part: i });
    }
  }

  // New portions come only from the one psalm currently being learned.
  const fresh: { psalm: number; part: number }[] = [];
  const lp = learningPsalm(selection, cards);
  if (lp != null) {
    const parts = segmentCount(lp);
    for (let i = 0; i < parts && fresh.length < newLimit; i++) {
      if (!cards[cardId(lp, i)]) fresh.push({ psalm: lp, part: i });
    }
  }

  return [...due.slice(0, MAX_REVIEWS_PER_SESSION), ...fresh];
}

// ─── New-cards-per-day setting ────────────────────────────────────────────────

export async function loadNewPerDay(): Promise<number> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ value: string }>(`SELECT value FROM psalm_meta WHERE key = 'newPerDay'`);
  const n = row ? parseInt(row.value, 10) : NEW_PER_SESSION;
  return Number.isFinite(n) ? n : NEW_PER_SESSION;
}

export async function saveNewPerDay(n: number): Promise<void> {
  const db = await getDB();
  await db.runAsync(`INSERT OR REPLACE INTO psalm_meta (key, value) VALUES ('newPerDay', ?)`, [String(n)]);
}

// ─── Streak (consecutive days reviewed) ───────────────────────────────────────

export interface Streak { current: number; last: string | null; }

export async function loadStreak(): Promise<Streak> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ value: string }>(`SELECT value FROM psalm_meta WHERE key = 'streak'`);
  if (!row) return { current: 0, last: null };
  try { return JSON.parse(row.value) as Streak; } catch { return { current: 0, last: null }; }
}

// ─── Whole-psalm recitation test ──────────────────────────────────────────────
// A psalm graduates to a full-recitation test once all its portions are mature.
// Passing schedules a periodic re-test so whole-psalm recall stays fresh.

export type ReciteState = 'learning' | 'ready' | 'memorized' | 'retest';

export interface ReciteCard {
  psalm: number;
  reps: number;          // successful full recitations
  intervalDays: number;
  due: string;
  last: string;
}

export function portionsMature(psalm: number, cards: Record<string, PartCard>): { mature: number; total: number } {
  const total = segmentCount(psalm);
  let mature = 0;
  for (let i = 0; i < total; i++) {
    const c = cards[cardId(psalm, i)];
    if (c && c.intervalDays >= MASTERED_INTERVAL) mature++;
  }
  return { mature, total };
}

export function reciteState(psalm: number, cards: Record<string, PartCard>, recite: Record<number, ReciteCard>): ReciteState {
  const { mature, total } = portionsMature(psalm, cards);
  if (total === 0 || mature < total) return 'learning';
  const r = recite[psalm];
  if (!r || r.reps === 0) return 'ready';
  return r.due <= todayStr() ? 'retest' : 'memorized';
}

export async function loadRecite(): Promise<Record<number, ReciteCard>> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ psalm: number; reps: number; interval: number; due: string; last: string }>(
    `SELECT psalm, reps, interval, due, last FROM psalm_recite`,
  );
  const map: Record<number, ReciteCard> = {};
  for (const r of rows) map[r.psalm] = { psalm: r.psalm, reps: r.reps, intervalDays: r.interval, due: r.due, last: r.last };
  return map;
}

// Re-test schedule for whole-psalm recitation. Starts short (like a portion
// card) and lengthens as the psalm proves durable.
const RECITE_LADDER = [1, 3, 7, 16, 35, 75, 150, 365];

export type ReciteGrade = 'pass' | 'partial' | 'fail';

const ladderInterval = (reps: number) =>
  reps <= 0 ? 0 : RECITE_LADDER[Math.min(reps - 1, RECITE_LADDER.length - 1)];

export async function reviewRecite(psalm: number, existing: ReciteCard | undefined, grade: ReciteGrade): Promise<ReciteCard> {
  let reps = existing?.reps ?? 0;
  let intervalDays: number;
  if (grade === 'pass') {
    reps += 1;                                  // advance a rung
    intervalDays = ladderInterval(reps);
  } else if (grade === 'partial') {
    reps = Math.max(1, reps - 1);               // step back, keep some progress
    intervalDays = ladderInterval(reps);
  } else {
    reps = 0;                                   // full reset — re-test next session
    intervalDays = 0;
  }
  const card: ReciteCard = {
    psalm, reps, intervalDays,
    due: intervalDays <= 0 ? todayStr() : addDaysStr(intervalDays),
    last: todayStr(),
  };
  const db = await getDB();
  await db.runAsync(
    `INSERT OR REPLACE INTO psalm_recite (psalm, reps, interval, due, last) VALUES (?, ?, ?, ?, ?)`,
    [psalm, card.reps, card.intervalDays, card.due, card.last],
  );
  return card;
}

// Call once when a review is completed; advances the streak if it's a new day.
export async function recordReviewDay(): Promise<Streak> {
  const db = await getDB();
  const today = todayStr();
  const cur = await loadStreak();
  if (cur.last === today) return cur;

  const yesterday = addDaysStr(-1);
  const next: Streak = { current: cur.last === yesterday ? cur.current + 1 : 1, last: today };
  await db.runAsync(
    `INSERT OR REPLACE INTO psalm_meta (key, value) VALUES ('streak', ?)`,
    [JSON.stringify(next)],
  );
  return next;
}
