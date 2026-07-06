// src/services/journalStore.ts
// The confession journal — incidents the user logs throughout a confession
// period, categorized by the same six domains as the examination of conscience.
// Device-only, persisted with AsyncStorage. Cleared completely when the user
// permanently deletes their confession notes after confession.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SinCategory } from '../types';

const KEY = 'nepsis.journal';

// A journal incident sits under one of the six examination domains, or "other"
// for anything that doesn't fit them.
export type JournalCategory = SinCategory | 'other';

export interface JournalIncident {
  id: string;
  category: JournalCategory;   // one of the six examination domains, or "other"
  sinId?: string;              // optional specific item from the catalogue
  title: string;               // short label (sin name, or first words of the note)
  note: string;                // free-text explanation of what happened (optional)
  createdAt: number;           // epoch ms
}

// A collision-resistant id that doesn't rely on crypto (Hermes-safe).
function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function loadIncidents(): Promise<JournalIncident[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Newest first.
    return parsed.sort((a: JournalIncident, b: JournalIncident) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

async function persist(list: JournalIncident[]): Promise<void> {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

export async function addIncident(
  input: { category: JournalCategory; sinId?: string; title: string; note: string },
): Promise<JournalIncident[]> {
  const list = await loadIncidents();
  const incident: JournalIncident = {
    id: makeId(),
    category: input.category,
    sinId: input.sinId,
    title: input.title.trim() || 'Untitled',
    note: input.note.trim(),
    createdAt: Date.now(),
  };
  const next = [incident, ...list];
  await persist(next);
  return next;
}

export async function deleteIncident(id: string): Promise<JournalIncident[]> {
  const list = await loadIncidents();
  const next = list.filter(i => i.id !== id);
  await persist(next);
  return next;
}

// Wipe the entire journal — used when the user permanently deletes their
// confession notes after confession.
export async function clearIncidents(): Promise<void> {
  try { await AsyncStorage.removeItem(KEY); } catch {}
}
