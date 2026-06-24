// src/types/index.ts

// ─── Account ────────────────────────────────────────────────────────────────

export type AccountRole = 'user' | 'spiritual_father';

export interface UserProfile {
  id: string;
  role: AccountRole;
  displayName: string;
  tradition: OrthodoxTradition;
  spiritualFatherId?: string;   // links user to their priest's account
  createdAt: string;
}

export type OrthodoxTradition =
  | 'coptic'
  | 'ethiopian'
  | 'eritrean'
  | 'syriac'
  | 'armenian'
  | 'malankara';

// ─── Auth / Security ─────────────────────────────────────────────────────────

export interface AuthState {
  isAuthenticated: boolean;
  biometricAvailable: boolean;
  biometricType: 'face' | 'fingerprint' | 'none';
  pinFallbackEnabled: boolean;
  lastAuthAt: number | null;          // epoch ms
  sessionTimeoutSeconds: number;      // default 60
}

// ─── Confession Journal ───────────────────────────────────────────────────────

export type EightPassion =
  | 'pride'
  | 'anger'
  | 'lust'
  | 'gluttony'
  | 'greed'
  | 'sloth'
  | 'envy'
  | 'vainglory';

export type JournalEntryStatus = 'noted' | 'flagged';

export interface JournalEntry {
  id: string;
  createdAt: string;                  // ISO
  title: string;
  body: string;
  passions: EightPassion[];
  status: JournalEntryStatus;
  confessionPeriodId: string;         // reset after each confession
}

// ─── Examination of Conscience ────────────────────────────────────────────────

export type SinCategory =
  | 'tongue'
  | 'thoughts'
  | 'hearing'
  | 'eyes'
  | 'actions'
  | 'neglected_practices';

export type SinFrequency = 'once' | 'few' | 'often';

export interface SinItem {
  id: string;
  category: SinCategory;
  name: string;
  description: string;
  scripture: string;                  // e.g. "Matthew 7:1"
}

export interface CheckedSin {
  sinId: string;
  frequency: SinFrequency;
  spokenDuringConfession: boolean;
}

export interface ExaminationSession {
  id: string;
  confessionPeriodId: string;
  startedAt: string;
  completedAt?: string;
  checkedSins: CheckedSin[];
}

// ─── Confession Scheduling ────────────────────────────────────────────────────

export type ConfessionUrgency = 'regular' | 'soon' | 'urgent';
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface ConfessionBooking {
  id: string;
  userId: string;
  spiritualFatherId: string;
  requestedAt: string;
  scheduledDate?: string;             // ISO date
  scheduledTime?: string;             // 'HH:mm'
  urgency: ConfessionUrgency;
  userNote?: string;
  status: BookingStatus;
  durationMinutes: number;
}

export interface PriestAvailabilitySlot {
  id: string;
  priestId: string;
  date: string;                       // ISO date
  startTime: string;                  // 'HH:mm'
  endTime: string;
  label?: string;                     // e.g. "After Divine Liturgy"
  isBooked: boolean;
}

// ─── Canon / Spiritual Rule ────────────────────────────────────────────────────

export interface CanonItem {
  id: string;
  label: string;
  description?: string;
  type: 'agpeya_hour' | 'prostrations' | 'quiet_time' | 'reading' | 'custom';
  targetMinutes?: number;
  targetCount?: number;
}

export interface DailyCanonLog {
  date: string;                       // 'YYYY-MM-DD'
  items: { canonItemId: string; completed: boolean; completedAt?: string }[];
}

// ─── Quiet Time ───────────────────────────────────────────────────────────────

export type QuietTimeTier = 'beginner' | 'growing' | 'practiced' | 'deep';

export interface QuietTimeSession {
  id: string;
  date: string;
  durationSeconds: number;
  tier: QuietTimeTier;
  restingVerse?: string;
}

// ─── Reading Plans ─────────────────────────────────────────────────────────────

export interface ReadingPlan {
  id: string;
  name: string;
  description: string;
  totalDays: number;
  readings: ReadingPlanDay[];
}

export interface ReadingPlanDay {
  day: number;
  readings: { label: string; reference: string }[];
}

export interface UserReadingProgress {
  planId: string;
  userId: string;
  startedAt: string;
  currentDay: number;
  completedDays: number[];
}

// ─── Emotional Wellness ────────────────────────────────────────────────────────

export type Emotion =
  | 'sad'
  | 'angry'
  | 'anxious'
  | 'stressed'
  | 'lonely'
  | 'hopeless'
  | 'fearful'
  | 'unwell';

export interface EmotionContent {
  emotion: Emotion;
  verses: { text: string; reference: string }[];
  patristic: { quote: string; source: string }[];
}

// ─── Screen Time ──────────────────────────────────────────────────────────────

export interface ScreenTimeLimit {
  socialMediaDailyMinutes: number;
  totalDailyMinutes: number;
  shareWeeklyWithFather: boolean;
}

// ─── Liturgical Calendar ──────────────────────────────────────────────────────

export interface LiturgicalDay {
  date: string;
  copticDate: string;                 // e.g. "Kiahk 14"
  isFast: boolean;
  isFeast: boolean;
  feastName?: string;
  readings: {
    matins?: string;
    pauline?: string;
    catholic?: string;
    acts?: string;
    gospel?: string;
  };
  synaxarion?: string;
}
