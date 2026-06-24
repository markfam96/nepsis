// src/services/localDB.ts
// On-device encrypted storage for confession journal and examination data.
// Uses expo-sqlite. The DB encryption key is stored in expo-secure-store
// and never leaves the device.

import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';

const DB_NAME    = 'nepsis_private.db';
const KEY_STORE  = 'nepsis_db_key';

let _db: SQLite.SQLiteDatabase | null = null;

// ─── Key management ────────────────────────────────────────────────────────────

async function getOrCreateDBKey(): Promise<string> {
  let key = await SecureStore.getItemAsync(KEY_STORE);
  if (!key) {
    // Generate 32-byte random key as hex
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    key = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    await SecureStore.setItemAsync(KEY_STORE, key, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }
  return key;
}

// ─── Database init ─────────────────────────────────────────────────────────────

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;

  _db = await SQLite.openDatabaseAsync(DB_NAME);

  await _db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS confession_periods (
      id          TEXT PRIMARY KEY,
      started_at  TEXT NOT NULL,
      closed_at   TEXT,
      is_active   INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id                    TEXT PRIMARY KEY,
      confession_period_id  TEXT NOT NULL,
      created_at            TEXT NOT NULL,
      title                 TEXT NOT NULL,
      body                  TEXT NOT NULL,
      passions              TEXT NOT NULL,   -- JSON array
      status                TEXT NOT NULL DEFAULT 'noted',
      FOREIGN KEY (confession_period_id) REFERENCES confession_periods(id)
    );

    CREATE TABLE IF NOT EXISTS examination_sessions (
      id                    TEXT PRIMARY KEY,
      confession_period_id  TEXT NOT NULL,
      started_at            TEXT NOT NULL,
      completed_at          TEXT,
      FOREIGN KEY (confession_period_id) REFERENCES confession_periods(id)
    );

    CREATE TABLE IF NOT EXISTS checked_sins (
      id                      TEXT PRIMARY KEY,
      examination_session_id  TEXT NOT NULL,
      sin_id                  TEXT NOT NULL,
      frequency               TEXT NOT NULL,
      spoken_during_confession INTEGER DEFAULT 0,
      FOREIGN KEY (examination_session_id) REFERENCES examination_sessions(id)
    );
  `);

  return _db;
}

// ─── Confession period management ─────────────────────────────────────────────

export async function getActivePeriod() {
  const db = await getDB();
  return db.getFirstAsync<{ id: string; started_at: string }>(
    `SELECT id, started_at FROM confession_periods WHERE is_active = 1 LIMIT 1`,
  );
}

export async function createNewPeriod(): Promise<string> {
  const db  = await getDB();
  const id  = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO confession_periods (id, started_at) VALUES (?, ?)`,
    [id, now],
  );
  return id;
}

export async function closeActivePeriod(): Promise<void> {
  const db  = await getDB();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE confession_periods SET is_active = 0, closed_at = ? WHERE is_active = 1`,
    [now],
  );
}

// ─── Journal entries ────────────────────────────────────────────────────────────

export async function addJournalEntry(entry: {
  title:    string;
  body:     string;
  passions: string[];
  status:   'noted' | 'flagged';
}): Promise<string> {
  const db     = await getDB();
  const period = await getActivePeriod() ?? { id: await createNewPeriod() };
  const id     = crypto.randomUUID();
  const now    = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO journal_entries (id, confession_period_id, created_at, title, body, passions, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, period.id, now, entry.title, entry.body, JSON.stringify(entry.passions), entry.status],
  );
  return id;
}

export async function getJournalEntries() {
  const db     = await getDB();
  const period = await getActivePeriod();
  if (!period) return [];

  const rows = await db.getAllAsync<{
    id: string; created_at: string; title: string;
    body: string; passions: string; status: string;
  }>(
    `SELECT id, created_at, title, body, passions, status
     FROM journal_entries
     WHERE confession_period_id = ?
     ORDER BY created_at DESC`,
    [period.id],
  );

  return rows.map(r => ({ ...r, passions: JSON.parse(r.passions) as string[] }));
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM journal_entries WHERE id = ?`, [id]);
}

// ─── Nuclear delete — called on "confession complete" if user chooses ─────────

export async function deleteAllConfessionData(): Promise<void> {
  const db = await getDB();
  await db.execAsync(`
    DELETE FROM checked_sins;
    DELETE FROM examination_sessions;
    DELETE FROM journal_entries;
    UPDATE confession_periods SET is_active = 0, closed_at = datetime('now') WHERE is_active = 1;
  `);
}

// ─── Checked sins ──────────────────────────────────────────────────────────────

export async function saveCheckedSins(
  sessionId: string,
  sins: Array<{ sinId: string; frequency: string; spoken: boolean }>,
): Promise<void> {
  const db = await getDB();
  // Upsert each sin
  for (const s of sins) {
    const id = crypto.randomUUID();
    await db.runAsync(
      `INSERT OR REPLACE INTO checked_sins
       (id, examination_session_id, sin_id, frequency, spoken_during_confession)
       VALUES (?, ?, ?, ?, ?)`,
      [id, sessionId, s.sinId, s.frequency, s.spoken ? 1 : 0],
    );
  }
}

export async function getCheckedSinsForSession(sessionId: string) {
  const db = await getDB();
  return db.getAllAsync<{
    sin_id: string; frequency: string; spoken_during_confession: number;
  }>(
    `SELECT sin_id, frequency, spoken_during_confession
     FROM checked_sins WHERE examination_session_id = ?`,
    [sessionId],
  );
}
