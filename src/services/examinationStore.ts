// src/services/examinationStore.ts
// The examination of conscience — which sins the user checked, and how often,
// for the current confession period. Used daily and before confession, and fed
// into the confession notes alongside the journal. Device-only (AsyncStorage).
// Cleared when the user permanently deletes their confession notes.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SinFrequency } from '../types';

const KEY = 'nepsis.examination';

// Map of sinId -> frequency for everything currently checked.
export type ExamChecks = Record<string, SinFrequency>;

export async function loadExam(): Promise<ExamChecks> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function saveExam(checks: ExamChecks): Promise<void> {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(checks)); } catch {}
}

export async function clearExam(): Promise<void> {
  try { await AsyncStorage.removeItem(KEY); } catch {}
}
