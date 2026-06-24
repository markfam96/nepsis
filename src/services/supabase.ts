// src/services/supabase.ts
// Non-confession data only: canon logs, scheduling, reading plans, quiet time.
// All confession-related data stays on-device (see authService + SQLite).

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,
  },
});

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export function getCurrentUser() {
  return supabase.auth.getUser();
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getProfile(userId: string) {
  return supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
}

export async function upsertProfile(profile: {
  id: string;
  role: string;
  display_name: string;
  tradition: string;
  spiritual_father_id?: string;
}) {
  return supabase.from('profiles').upsert(profile);
}

// ─── Canon logs ───────────────────────────────────────────────────────────────

export async function getCanonLog(userId: string, date: string) {
  return supabase
    .from('canon_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .single();
}

export async function upsertCanonLog(userId: string, date: string, items: object[]) {
  return supabase
    .from('canon_logs')
    .upsert({ user_id: userId, date, items }, { onConflict: 'user_id,date' });
}

// ─── Reading progress ─────────────────────────────────────────────────────────

export async function getReadingProgress(userId: string, planId: string) {
  return supabase
    .from('reading_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('plan_id', planId)
    .single();
}

export async function upsertReadingProgress(
  userId: string,
  planId: string,
  currentDay: number,
  completedDays: number[],
) {
  return supabase.from('reading_progress').upsert(
    { user_id: userId, plan_id: planId, current_day: currentDay, completed_days: completedDays },
    { onConflict: 'user_id,plan_id' },
  );
}

// ─── Quiet time sessions ──────────────────────────────────────────────────────

export async function insertQuietTimeSession(
  userId: string,
  date: string,
  durationSeconds: number,
  tier: string,
) {
  return supabase.from('quiet_time_sessions').insert({
    user_id: userId,
    date,
    duration_seconds: durationSeconds,
    tier,
  });
}

export async function getQuietTimeSessions(userId: string, limit = 7) {
  return supabase
    .from('quiet_time_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit);
}

// ─── Screen time settings ─────────────────────────────────────────────────────

export async function getScreenTimeSettings(userId: string) {
  return supabase
    .from('screen_time_settings')
    .select('*')
    .eq('user_id', userId)
    .single();
}

export async function upsertScreenTimeSettings(
  userId: string,
  socialMediaDailyMinutes: number,
  totalDailyMinutes: number,
  shareWeeklyWithFather: boolean,
) {
  return supabase.from('screen_time_settings').upsert({
    user_id: userId,
    social_media_daily_minutes: socialMediaDailyMinutes,
    total_daily_minutes: totalDailyMinutes,
    share_weekly_with_father: shareWeeklyWithFather,
  });
}

// ─── Confession bookings ──────────────────────────────────────────────────────

export async function createConfessionBooking(booking: {
  userId: string;
  spiritualFatherId: string;
  urgency: 'regular' | 'soon' | 'urgent';
  userNote?: string;
  durationMinutes?: number;
}) {
  return supabase.from('confession_bookings').insert({
    user_id:              booking.userId,
    spiritual_father_id:  booking.spiritualFatherId,
    urgency:              booking.urgency,
    user_note:            booking.userNote,
    duration_minutes:     booking.durationMinutes ?? 30,
    status:               'pending',
  });
}

export async function getConfessionBookings(userId: string) {
  return supabase
    .from('confession_bookings')
    .select('*')
    .eq('user_id', userId)
    .order('requested_at', { ascending: false });
}

export async function updateBookingStatus(
  bookingId: string,
  status: 'confirmed' | 'completed' | 'cancelled',
) {
  return supabase
    .from('confession_bookings')
    .update({ status })
    .eq('id', bookingId);
}

// ─── Priest availability slots ────────────────────────────────────────────────

export async function getPriestSlots(priestId: string, fromDate: string) {
  return supabase
    .from('priest_slots')
    .select('*')
    .eq('priest_id', priestId)
    .gte('date', fromDate)
    .eq('is_booked', false)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });
}

/*
──────────────────────────────────────────────────────────────────────────────
DATABASE SCHEMA  (run in Supabase SQL editor)
──────────────────────────────────────────────────────────────────────────────

-- Users
create table profiles (
  id              uuid primary key references auth.users,
  role            text check (role in ('user','spiritual_father')),
  display_name    text,
  tradition       text,
  spiritual_father_id uuid references profiles(id),
  created_at      timestamptz default now()
);

-- Priest availability slots
create table priest_slots (
  id              uuid primary key default gen_random_uuid(),
  priest_id       uuid references profiles(id),
  date            date not null,
  start_time      time not null,
  end_time        time not null,
  label           text,
  is_booked       boolean default false,
  created_at      timestamptz default now()
);

-- Confession bookings (scheduling only — NO confession content)
create table confession_bookings (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references profiles(id),
  spiritual_father_id uuid references profiles(id),
  requested_at        timestamptz default now(),
  scheduled_date      date,
  scheduled_time      time,
  urgency             text check (urgency in ('regular','soon','urgent')),
  user_note           text,   -- optional, user-controlled
  status              text check (status in ('pending','confirmed','completed','cancelled')),
  duration_minutes    int default 30
);

-- Daily canon logs
create table canon_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles(id),
  date            date not null,
  items           jsonb,      -- [{canon_item_id, completed, completed_at}]
  created_at      timestamptz default now(),
  unique (user_id, date)
);

-- Reading plan progress
create table reading_progress (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles(id),
  plan_id         text not null,
  started_at      timestamptz default now(),
  current_day     int default 1,
  completed_days  int[] default '{}',
  unique (user_id, plan_id)
);

-- Quiet time sessions
create table quiet_time_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles(id),
  date            date not null,
  duration_seconds int,
  tier            text,
  created_at      timestamptz default now()
);

-- Screen time limits (user preferences)
create table screen_time_settings (
  user_id                    uuid primary key references profiles(id),
  social_media_daily_minutes int default 120,
  total_daily_minutes        int default 240,
  share_weekly_with_father   boolean default false
);

──────────────────────────────────────────────────────────────────────────────
ROW LEVEL SECURITY
──────────────────────────────────────────────────────────────────────────────

-- Every table: users can only read/write their own rows
alter table profiles              enable row level security;
alter table priest_slots          enable row level security;
alter table confession_bookings   enable row level security;
alter table canon_logs            enable row level security;
alter table reading_progress      enable row level security;
alter table quiet_time_sessions   enable row level security;
alter table screen_time_settings  enable row level security;

-- Profiles
create policy "own profile" on profiles
  for all using (auth.uid() = id);

-- Canon logs
create policy "own canon" on canon_logs
  for all using (auth.uid() = user_id);

-- Priest can read canon logs of their spiritual children
create policy "priest reads children canon" on canon_logs
  for select using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'spiritual_father'
        and profiles.id = (
          select spiritual_father_id from profiles
          where profiles.id = canon_logs.user_id
        )
    )
  );

-- Confession bookings: user or their priest
create policy "booking access" on confession_bookings
  for all using (
    auth.uid() = user_id or auth.uid() = spiritual_father_id
  );

-- Priest slots: priest manages own, users can read
create policy "priest manages slots" on priest_slots
  for all using (auth.uid() = priest_id);

create policy "users read slots" on priest_slots
  for select using (true);
*/
