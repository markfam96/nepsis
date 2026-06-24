// src/constants/theme.ts
// Bright Byzantine palette — parchment canvas, gold-leaf banners, liturgical crimson,
// icon lapis blue. Inspired by Coptic iconography and illuminated manuscripts.

export const Colors = {
  // ── Immersive / dark surfaces (lock, prayer timer, anchor card) ───────────────
  navy:        '#142847',   // deep lapis — immersive backgrounds
  navyMid:     '#1F3A63',   // lighter lapis

  // ── Gold ─────────────────────────────────────────────────────────────────────
  gold:        '#E8C76A',   // bright gold — text / icons on dark immersive surfaces
  goldMuted:   '#C9A86A',   // muted gold — secondary text on dark
  goldAccent:  '#C19A3E',   // gold leaf — header banners & accents on parchment

  // ── Purple ramp → remapped to gold tint / crimson primary ─────────────────────
  purple50:    '#FBF3DC',   // soft gold tint fill
  purple100:   '#F2E4BE',   // gold tint
  purple200:   '#C19A3E',   // gold (border base, use with opacity suffix)
  purple400:   '#C19A3E',   // gold accent
  purple600:   '#7A1F2B',   // PRIMARY action — liturgical crimson
  purple800:   '#5C1620',   // deep crimson (text on light crimson fill)
  purple900:   '#2B2118',   // sepia ink

  // ── Teal ramp → emerald (success, spiritual father, calm) ─────────────────────
  teal50:      '#E3F0E8',   // light emerald fill
  teal200:     '#5DCAA5',   // bright emerald — text on dark surfaces
  teal600:     '#1D7A5C',   // deep emerald — fills, done states on parchment
  teal800:     '#0F5240',   // deeper emerald — buttons
  teal900:     '#0A3A2D',   // deepest emerald — immersive complete screen

  // ── Amber ramp → warm gold-amber (warnings, feast days) ───────────────────────
  amber50:     '#FBEFD6',   // light amber fill
  amber200:    '#C8912E',   // amber mid (border base)
  amber600:    '#8A6516',   // dark amber — text on parchment
  amber900:    '#3A2A08',   // deep amber

  // ── Red ramp → crimson (sins, urgent, danger) ─────────────────────────────────
  red50:       '#F7E4E2',   // light crimson fill
  red200:      '#D98A8A',   // soft crimson — error text on dark immersive
  red600:      '#7A1F2B',   // liturgical crimson
  red900:      '#4A1018',   // deep crimson

  // ── Gray ramp → warm parchment neutrals ───────────────────────────────────────
  gray50:      '#F2E9D5',   // warm tint surface
  gray100:     '#E0D5BE',   // warm border
  gray400:     '#9A8E7C',   // faint sepia
  gray600:     '#6E6253',   // muted sepia text
  gray900:     '#2B2118',   // sepia ink
} as const;

// Bright-only app — both Light and Dark resolve to the parchment scheme.
export const Light = {
  background:       '#FAF4E8',   // parchment canvas
  backgroundSecond: '#FFFDF7',   // warm white card
  backgroundThird:  '#F2E9D5',   // deeper parchment
  text:             '#2B2118',   // sepia ink
  textSecond:       '#6E6253',   // muted sepia
  textThird:        '#9A8E7C',   // faint sepia
  border:           'rgba(122,31,43,0.14)',   // crimson-tinted hairline
  borderStrong:     'rgba(122,31,43,0.28)',
} as const;

export const Dark = {
  background:       '#FAF4E8',
  backgroundSecond: '#FFFDF7',
  backgroundThird:  '#F2E9D5',
  text:             '#2B2118',
  textSecond:       '#6E6253',
  textThird:        '#9A8E7C',
  border:           'rgba(122,31,43,0.14)',
  borderStrong:     'rgba(122,31,43,0.28)',
} as const;

export const Radius = {
  sm:   6,
  md:   8,
  lg:   12,
  xl:   16,
  full: 999,
} as const;

export const Spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  xxl:  32,
} as const;

export const Font = {
  regular: 400,
  medium:  500,
} as const;
