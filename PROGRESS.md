# Nepsis — Progress

A spiritual companion app for Oriental / Coptic Orthodox Christians. The name
means *watchfulness* (νῆψις) — attentiveness of the heart. It gathers the daily
disciplines of prayer, Scripture, the Psalter, and confession into one place,
with a Byzantine visual identity.

---

## Tech stack

- **Expo SDK 54** + **expo-router** (file-based routing), **React Native 0.81.5**, **React 19.1**, TypeScript (strict).
- **Reanimated 4** + **react-native-gesture-handler** (drawer + gestures).
- **react-native-svg** (Coptic cross, harp icons).
- **AsyncStorage** for all app persistence (see decisions below).
- **expo-local-authentication** + **expo-secure-store** (PIN / biometric gate).
- Runs in **Expo Go** today. Install quirks: dependency changes need
  `npm install --legacy-peer-deps`. Hermes has no Web Crypto — PIN hashing uses
  `expo-crypto`.

---

## Architecture & key decisions

- **Navigation:** a left-swipe **drawer** (not bottom tabs). Routes in
  `app/(drawer)/`: `index` (Home), `stillness` (Watchfulness), `psalms`,
  `scripture` (Reading Plans), `rule` (Canon), `confession`. Root
  `app/_layout.tsx` now renders the drawer **directly** — the app opens straight
  to Home with no launch gate. Authentication guards **only the Confession
  section** (see decision below).
- **Screen scaffold:** `src/components/SectionScreen.tsx` gives each destination
  a gold header + ☰ drawer button + optional segmented switcher. Feature UIs
  live as embeddable bodies in `src/modules/` and are composed by the routes.
- **Theme:** bright **Byzantine / illuminated-manuscript** palette in
  `src/constants/theme.ts` — parchment `#FAF4E8`, gold leaf `#C19A3E`,
  liturgical crimson `#7A1F2B`, lapis `#142847`, sepia ink. Bright-only (both
  `Light`/`Dark` resolve to the same scheme). Old `purple/teal/red` token names
  were remapped rather than renamed.
- **Iconography:** custom SVG **Coptic cross** (12-point) and **harp**
  components; emoji for section cards (candle, praying hands, dove, book).
- **Persistence — AsyncStorage, not SQLite.** SQLite (`expo-sqlite`) writes were
  failing *silently* in Expo Go, so progress didn't survive restarts. All stores
  (`psalmStore`, `planStore`, `ruleStore`, and now `journalStore` +
  `examinationStore`) use AsyncStorage with the same APIs. The old SQLite
  `localDB.ts` confession journal is fully retired (dead code).
- **Confession is locked as one section, not per-screen.** `SectionLock` (in
  `src/modules/confession.tsx`) gates the whole section — unlock once to reach
  the journal, examination, and in-session notes together. First entry **creates
  a 6-digit passcode**; returning entries use **Face ID or that passcode**
  (Hermes-safe hashing via `expo-crypto`, stored in `expo-secure-store`).
  Removing the app-open gate meant setup had to move here. Existing users who
  already set a PIN keep it seamlessly (`hasPINSet()`).
- **Examination + journal both feed the confession notes.** The examination of
  conscience (used daily / before confession) and the journal (big things +
  notes) are two inputs; the in-session notes screen **merges both**, grouped by
  the six domains. Journal incidents can also be filed under **"Other"**, and
  each catalogue-linked entry carries the **same explanation (description +
  scripture)** shown in the examination. Permanent delete after confession
  clears **both** stores completely.
- **Psalter source:** public-domain **Brenton Septuagint (LXX)** could not be
  used directly — instead the actual **Coptic Agpeya** text was extracted from a
  provided PDF into `src/data/agpeyaPsalms.json` (77 psalms, LXX numbering,
  superscriptions omitted, Psalm 118 split into its 22 sections). NKJV/OSB/WEB
  were ruled out for licensing reasons.
- **Memorization "item" model:** the unit of selection/tracking is an *item* —
  a whole psalm (`"5"`) or a single Psalm-118 section (`"118#3"`). Generalized
  across `agpeyaPsalter.ts`, `psalmStore.ts`, and the UI so each 118 section is
  learned/tracked/tested independently.
- **Fasting calendar:** `src/utils/fasting.ts` computes Orthodox Pascha
  (Meeus computus + Julian→Gregorian offset) to derive the Holy Fifty; Wed/Fri
  are auto fast days except during it.

---

## Feature status

### Built & working
- **Confession-section lock** — the app opens with no gate; entering Confession
  requires a **6-digit passcode or Face ID**, set the first time you open the
  section. One unlock covers the journal, examination, and notes. (Face ID needs
  a dev build — Expo Go falls back to the passcode.) The old app-launch lock
  screens (`src/screens/LockScreen.tsx`, `SetupPINScreen.tsx`) are now unused.
- **Home hub** — Coptic date (offline via `utils/copticDate.ts`), verse of the
  day, section navigation cards.
- **Psalms memorization** (the deepest feature):
  - Agpeya text, grouped by canonical hour; Psalm 118 as 22 selectable sections.
  - SM-2 spaced repetition (`psalmStore.ts`): 4-grade portion cards
    (Wrong/Hard/Good/Easy), cloze-deletion prompts with section lead-up context,
    phrase-sized portions.
  - One item learned at a time, in order; the next unlocks once the current is
    "worked through" (every portion answered right ≥ once).
  - **Separate Review (due) and Learn (new) buttons**; configurable new-cards-
    per-day (scrollable number picker, 1–100); streak tracking.
  - **Whole-item recitation test** with a re-test ladder (1,3,7,16,35,75,150,365
    days); graded Forgot / Some slips / Recited.
  - Psalm classification tags (repentance, praise, ascents, etc. — approximate).
- **Reading Plans** — 5 generated plans + 3 imported from PDFs (6-Month, Bible
  Companion 1-yr, OSB 1-yr); preview before starting; per-day check-off with
  persisted progress.
- **Canon → Prayer Rule** — fully editable per day of week: Agpeya hours,
  church services, prostrations, quiet time, Bible reading, spiritual book,
  confession frequency, and "fast until" time (a **scroll picker** over every
  half-hour with AM/PM). Auto Wed/Fri fasting (except Holy Fifty); no
  prostrations on Sat/Sun/Holy Fifty. Today view generated from the rule.
- **Confession** — now functional end-to-end, not just UI:
  - **Journal** — log incidents by the six examination domains plus **"Other"**,
    each with an optional free-text note; catalogue-linked entries show the same
    description + scripture as the examination. Persisted (`journalStore`).
    Keyboard is dismissible (drag / Done); long notes show in full.
  - **Examination of conscience** — 6 categories with per-item frequency; now
    **persisted** (`examinationStore`) so it builds up across the period.
  - **In-session notes** — merges examination items + journal incidents grouped
    by domain; tap to check off as spoken.
  - **Completion** — permanently deletes both stores; step 3 is a reminder to
    update the Canon (nothing in the Canon is auto-reset).
- **Watchfulness** — Stillness timer, Feeling (Scripture + patristic comfort),
  Anchor verse (with free-text option + breath mode).

### Placeholder / not yet real data
- **Screen Time** — shows simulated data. Reading other apps' usage is blocked
  in Expo Go and heavily restricted on iOS (see below). Left as-is by decision.
- **Feeling / Anchor / verse-of-the-day** content is a static curated set.
- **Supabase** client exists (`services/supabase.ts`) but no backend sync is wired.

---

## Known limitations / honest caveats

- **Expo Go only** right now. Face ID, real screen-time, and reliable native
  features need a **development build** (`expo run:ios` or EAS).
- **Drag-to-reorder** psalms was attempted but reverted — the mature drag
  libraries target Reanimated 2/3 and rendered blank on Reanimated 4. Reorder
  is via ▲▼ arrows for now.
- **Psalm text is Brenton-style Agpeya (LXX)**, not NKJV/OSB (licensing).
- **Fasting** only auto-handles Wed/Fri + Holy Fifty — not the long fasting
  seasons (Great Lent, Apostles', Nativity) or other fast-free periods.
- **Psalm category tags** are an approximate genre classification, not from the
  Agpeya itself.
- Everything is **local-only**; no account, no cloud backup, no cross-device sync.

---

## What's next (candidate directions)

1. **Development build** — unlocks Face ID, dependable persistence outside Expo
   Go, and is the prerequisite for real screen time and drag-to-reorder.
2. **Screen Time** — iOS FamilyControls (limit/block distracting apps; can't
   read raw minutes) and/or Android `UsageStatsManager` (real per-app numbers).
3. **Notifications / reminders** — daily prayer-rule and psalm-review reminders.
4. **Fuller liturgical calendar** — the long fasts and feasts, Coptic
   synaxarion, live daily lectionary link (Coptic Reader).
5. **Confession** — journal + examination persistence is done (AsyncStorage).
   Remaining: **encryption at rest** (SQLCipher / secure-store-wrapped key) for
   the sensitive stores, and connecting the spiritual-father account role
   (`UserProfile.spiritualFatherId` exists in types) for booking/sharing.
6. **Backend (optional)** — Supabase sync for multi-device + the priest ↔ user
   relationship, if the app goes beyond single-device.

---

*Repo has 11 commits; latest: confession journal, section-wide lock, and Canon
fast-until picker. All work is local (no remote configured).*
