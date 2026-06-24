# Nepsis — Oriental Orthodox Companion App

> *"Nepsis"* (νῆψις) — watchfulness, sobriety of soul. The patristic term for
> the interior vigilance that guards the heart against the passions.

---

## What this app is

A comprehensive spiritual companion for Oriental Orthodox Christians (Coptic,
Ethiopian, Eritrean, Syriac, Armenian, Malankara) covering:

| Module | Description |
|---|---|
| **Daily Readings** | Liturgical calendar, lectionary, Synaxarion, OSB verse of the day |
| **I'm Feeling…** | Emotion → curated Scripture + patristic quotes |
| **Temptation Anchor** | Step-by-step nepsis protocol for passions/temptation |
| **Quiet Time** | Progressive hesychia training (Beginner → Deep Stillness) |
| **Reading Plans** | Multiple Bible plans with progress tracking |
| **Canon Tracker** | Personal rule of prayer + spiritual father accountability |
| **Confession Journal** | Private, on-device encrypted journal between confessions |
| **Examination of Conscience** | Six-category guide used as in-confession notes |
| **Scheduling** | Confession booking with liturgical calendar awareness |
| **Screen Time** | Daily limits and awareness framed spiritually |

---

## Privacy architecture

```
┌─────────────────────────────────────────────────────────┐
│  On-device only (expo-sqlite + expo-secure-store)        │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Confession journal          NEVER leaves device  │  │
│  │  Examination of conscience   NEVER leaves device  │  │
│  │  In-session confession notes NEVER leaves device  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Supabase (synced, with row-level security)              │
│  Canon logs · Reading progress · Quiet time sessions     │
│  Scheduling (dates/times only, no confession content)    │
│  Spiritual father dashboard (aggregated stats only)      │
└─────────────────────────────────────────────────────────┘
```

**Biometric lock:**
- Face ID / Touch ID / fingerprint tried automatically on app open
- 6-digit PIN as fallback (set on first launch)
- App re-locks after 60 seconds in background
- Confession journal requires a *second* biometric challenge even within
  an active session

---

## Tech stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | React Native + Expo SDK 51 | Single codebase, iOS + Android |
| Navigation | Expo Router (file-based) | Clean URL-like navigation |
| Auth / Security | expo-local-authentication + expo-secure-store | Native Face ID, Touch ID, Android biometrics |
| On-device DB | expo-sqlite | Encrypted local confession data |
| Cloud DB | Supabase | Open source, row-level security, realtime |
| State | Zustand | Lightweight, no boilerplate |
| Data fetching | TanStack Query | Server-state caching |
| Lists | @shopify/flash-list | 60fps long lists |
| Notifications | expo-notifications | Canon reminders, confession nudges |

---

## Getting started

### Prerequisites
- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [EAS CLI](https://docs.expo.dev/eas/) for building
- A [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
git clone https://github.com/your-org/nepsis.git
cd nepsis
npm install
```

### 2. Environment variables

Create `.env.local`:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Set up Supabase

Copy the SQL schema from `src/services/supabase.ts` (the block comment)
and run it in your Supabase SQL editor. Enable Row Level Security on all tables.

### 4. Start development

```bash
npx expo start
```

Scan the QR code with Expo Go (iOS/Android) or press `i` for iOS simulator,
`a` for Android emulator.

### 5. Build for production

```bash
# Configure EAS
eas build:configure

# iOS
eas build --platform ios

# Android
eas build --platform android
```

---

## Project structure

```
nepsis/
├── app/
│   ├── _layout.tsx          # Root auth gate
│   └── (tabs)/
│       ├── _layout.tsx      # Bottom tab bar
│       ├── index.tsx        # Home / daily readings
│       ├── feeling.tsx      # Emotional wellness
│       ├── anchor.tsx       # Temptation anchor
│       ├── quiet.tsx        # Quiet time with Christ
│       ├── plans.tsx        # Bible reading plans
│       ├── canon.tsx        # Spiritual canon
│       ├── confession.tsx   # Confession (journal + exam + session)
│       └── screen-time.tsx  # Screen time tracker
├── src/
│   ├── constants/
│   │   └── theme.ts         # Colors, typography, spacing
│   ├── types/
│   │   └── index.ts         # All TypeScript interfaces
│   ├── services/
│   │   ├── authService.ts   # Biometric + PIN authentication
│   │   ├── localDB.ts       # On-device encrypted SQLite
│   │   └── supabase.ts      # Cloud sync (non-confession data)
│   ├── screens/
│   │   ├── LockScreen.tsx   # PIN entry + biometric gate
│   │   └── SetupPINScreen.tsx # First-launch PIN setup
│   ├── components/          # Shared UI components
│   ├── hooks/               # Custom React hooks
│   └── store/               # Zustand stores
└── assets/                  # Icons, splash, fonts
```

---

## Tradition-specific customization

The liturgical calendar, fasting rules, and lectionary differ by tradition.
In `src/constants/`, create one file per tradition:

```
src/constants/calendars/
  coptic.ts        # Coptic Orthodox
  ethiopian.ts     # Ethiopian Orthodox Tewahedo
  eritrean.ts      # Eritrean Orthodox Tewahedo
  syriac.ts        # Syriac Orthodox
  armenian.ts      # Armenian Apostolic
  malankara.ts     # Malankara Orthodox Syrian
```

On first launch, the user selects their tradition, and the liturgical data
(feast days, fast days, daily readings, Agpeya hours) loads from the
appropriate file.

---

## Spiritual father account

Priests register with `role: 'spiritual_father'`. They see a completely
separate UI: their flock's canon faithfulness, reading progress, and quiet
time streaks — **none of which includes any confession content.**

Confession scheduling flows through the app (dates, times, urgency level,
optional one-line note from the person) but the confession itself remains
entirely between the person, the priest, and God. No confession content
is ever transmitted.

---

## Content licensing

| Content | Status |
|---|---|
| Scripture (Orthodox Study Bible) | Requires license from Thomas Nelson |
| Patristic quotes (pre-schism fathers) | Public domain |
| Fr. Tadros Malaty commentaries | Contact St. Mark Coptic Orthodox Church |
| Abba Matta El-Meskeen | Contact St. Macarius Monastery |
| Synaxarion | Coptic Reader data (open, with attribution) |

---

## Contributing

This app is built for the Church. Contributions welcome — especially:
- Liturgical calendar data for each tradition
- Patristic content curation
- Translations (Arabic, Amharic, Ge'ez, Syriac, Armenian)
- Accessibility improvements

---

*"Watch and pray, that you enter not into temptation." — Matthew 26:41*
