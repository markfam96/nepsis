// src/services/ruleStore.ts
// The user's personal prayer rule (Canon), ideally set with their father of
// confession. Configurable per day of the week and persisted on-device.

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'nepsis_rule.db';
let _db: SQLite.SQLiteDatabase | null = null;

// ─── Option lists ─────────────────────────────────────────────────────────────

export const AGPEYA_HOURS: { key: string; name: string }[] = [
  { key: 'prime',    name: 'First Hour (Prime)' },
  { key: 'terce',    name: 'Third Hour (Terce)' },
  { key: 'sext',     name: 'Sixth Hour (Sext)' },
  { key: 'none',     name: 'Ninth Hour (None)' },
  { key: 'vespers',  name: 'Eleventh Hour (Vespers)' },
  { key: 'compline', name: 'Twelfth Hour (Compline)' },
  { key: 'veil',     name: 'Prayer of the Veil' },
  { key: 'midnight', name: 'Midnight (Three Watches)' },
];

export const SERVICES: { key: string; name: string }[] = [
  { key: 'church_vespers', name: 'Vespers (Raising of Incense)' },
  { key: 'matins',         name: 'Matins' },
  { key: 'liturgy',        name: 'Divine Liturgy' },
  { key: 'midnight_praise',name: 'Midnight Praise (Tasbeha)' },
];

export const CONFESSION_OPTIONS = [
  'Weekly', 'Every 2 weeks', 'Monthly', 'Every 2 months', 'Quarterly', 'Twice a year',
];

// On fasting days, abstain from food until this time of day.
export const FAST_UNTIL_OPTIONS = ['9:00 AM', '12:00 PM', '3:00 PM', '6:00 PM', 'Sunset'];

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─── Model ────────────────────────────────────────────────────────────────────

export type ReadMode = 'chapters' | 'minutes';

export interface DayPlan {
  hours: string[];      // agpeya hour keys prayed this weekday
  services: string[];   // church service keys this weekday
}

export interface RuleConfig {
  prostrations: number;
  fastUntil: string;    // abstain from food until this time on fasting days
  quietMinutes: number;
  bible: { mode: ReadMode; amount: number };
  book: { title: string; mode: ReadMode; amount: number } | null;
  confession: string;
  days: DayPlan[];      // length 7, index 0 = Sunday
}

export const DEFAULT_RULE: RuleConfig = {
  prostrations: 0,
  fastUntil: '3:00 PM',
  quietMinutes: 10,
  bible: { mode: 'chapters', amount: 1 },
  book: null,
  confession: 'Monthly',
  days: Array.from({ length: 7 }, () => ({ hours: [], services: [] })),
};

// ─── Persistence ──────────────────────────────────────────────────────────────

async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  await _db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS rule_kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);
  return _db;
}

export async function loadRule(): Promise<RuleConfig> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ value: string }>(`SELECT value FROM rule_kv WHERE key = 'rule'`);
  if (!row) return DEFAULT_RULE;
  try {
    const parsed = JSON.parse(row.value);
    // Merge with defaults so older saves don't break on new fields.
    const days: DayPlan[] = Array.from({ length: 7 }, (_, i) => ({
      hours: parsed.days?.[i]?.hours ?? [],
      services: parsed.days?.[i]?.services ?? [],
    }));
    return { ...DEFAULT_RULE, ...parsed, bible: { ...DEFAULT_RULE.bible, ...parsed.bible }, days };
  } catch {
    return DEFAULT_RULE;
  }
}

export async function saveRule(rule: RuleConfig): Promise<void> {
  const db = await getDB();
  await db.runAsync(`INSERT OR REPLACE INTO rule_kv (key, value) VALUES ('rule', ?)`, [JSON.stringify(rule)]);
}
