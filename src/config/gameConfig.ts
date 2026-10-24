import type { BoardSegment, OutcomeCode, PlayerSquad, RoomRules } from '../types/game'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  THE PAPER BOARD — single source of truth for segment order.
 * ─────────────────────────────────────────────────────────────────────────────
 *  To play with the 10-segment board from the original drawing, remove "2".
 *  The server migration `0001_init.sql` keeps a mirrored array; the test suite
 *  (`gameConfig.test.ts`) fails if the two ever drift apart.
 *
 *  Segments are equal-sized and begin at the top (12 o'clock), clockwise.
 */
export const BOARD_SEGMENTS: BoardSegment[] = [
  { code: '1', kind: 'runs', runs: 1, labelEn: '1', labelBn: '১', ariaEn: 'one run', ariaBn: 'এক রান' },
  { code: '2', kind: 'runs', runs: 2, labelEn: '2', labelBn: '২', ariaEn: 'two runs', ariaBn: 'দুই রান' },
  { code: '3', kind: 'runs', runs: 3, labelEn: '3', labelBn: '৩', ariaEn: 'three runs', ariaBn: 'তিন রান' },
  { code: '4', kind: 'runs', runs: 4, labelEn: '4', labelBn: '৪', ariaEn: 'four runs', ariaBn: 'চার রান' },
  { code: '6', kind: 'runs', runs: 6, labelEn: '6', labelBn: '৬', ariaEn: 'six runs', ariaBn: 'ছয় রান' },
  {
    code: 'N',
    kind: 'noBall',
    runs: 0,
    labelEn: 'N',
    labelBn: 'না',
    ariaEn: 'no ball',
    ariaBn: 'নো বল',
  },
  {
    code: 'W',
    kind: 'wide',
    runs: 0,
    labelEn: 'W',
    labelBn: 'ও',
    ariaEn: 'wide',
    ariaBn: 'ওয়াইড',
  },
  {
    code: 'CO',
    kind: 'wicket',
    runs: 0,
    labelEn: 'CO',
    labelBn: 'ক্যাচ',
    ariaEn: 'caught out',
    ariaBn: 'ক্যাচ আউট',
  },
  {
    code: 'LBW',
    kind: 'wicket',
    runs: 0,
    labelEn: 'Lbw',
    labelBn: 'এলবিডব্লিউ',
    ariaEn: 'leg before wicket',
    ariaBn: 'এলবিডব্লিউ',
  },
  {
    code: 'RO',
    kind: 'wicket',
    runs: 0,
    labelEn: 'RO',
    labelBn: 'রানআউট',
    ariaEn: 'run out',
    ariaBn: 'রান আউট',
  },
  {
    code: 'BO',
    kind: 'wicket',
    runs: 0,
    labelEn: 'BO',
    labelBn: 'বোল্ড',
    ariaEn: 'bowled out',
    ariaBn: 'বোল্ড আউট',
  },
]

export const SEGMENT_ANGLE = 360 / BOARD_SEGMENTS.length

export const GAME_DEFAULTS = {
  overs: 2,
  wickets: 2,
  squadSize: 5,
  maxSquadSize: 11,
  minSquadSize: 1,
  maxOvers: 10,
} as const

export const DEFAULT_RULES: RoomRules = {
  overs: GAME_DEFAULTS.overs,
  wickets: GAME_DEFAULTS.wickets,
  batFirst: 'toss',
  superOver: true,
}

export const DEFAULT_SQUADS = {
  en: ['Rafi', 'Siam', 'Arif', 'Neel', 'Shuvo'],
  bn: ['রাফি', 'সিয়াম', 'আরিফ', 'নীল', 'শুভ'],
} as const

export const SPIN = {
  /** Server generates the real duration; these are display fallbacks. */
  minDurationMs: 2200,
  maxDurationMs: 4800,
  aimWindowMs: 10_000,
  revealHoldMs: 4300,
  /** The pen travels from the aiming position all the way to the rim. */
  penSlideMs: 640,
  presenceGraceMs: 60_000,
  heartbeatMs: 20_000,
} as const

export const ROOM_CODE = {
  length: 6,
  alphabet: '23456789ABCDEFGHJKLMNPQRSTUVWXYZ',
} as const

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''
export const IS_SUPABASE_CONFIGURED =
  SUPABASE_URL.startsWith('https://') &&
  SUPABASE_ANON_KEY.length > 20 &&
  !SUPABASE_URL.includes('YOUR_PROJECT_REF')

export const APP_URL = typeof window !== 'undefined' ? window.location.origin : ''

export const BOARD_BLUE = '#234e8b'

export function makeDefaultSquad(names: readonly string[] = DEFAULT_SQUADS.en): PlayerSquad[] {
  return names.slice(0, GAME_DEFAULTS.maxSquadSize).map((name, index) => ({
    position: index,
    name,
  }))
}

export function getSegment(code: OutcomeCode): BoardSegment {
  const found = BOARD_SEGMENTS.find((segment) => segment.code === code)
  if (!found) {
    throw new Error(`Unknown board segment: ${code}`)
  }
  return found
}

export function isWicketCode(code: OutcomeCode): boolean {
  return getSegment(code).kind === 'wicket'
}

export function isIllegalCode(code: OutcomeCode): boolean {
  return code === 'W' || code === 'N'
}
