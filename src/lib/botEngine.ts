import { BOARD_SEGMENTS } from '../config/gameConfig'
import { effectiveOvers, normalizeAngle, remainingBalls } from './gameEngine'
import type { InningsDTO, RoomDTO } from '../types/game'

export type BotDifficulty = 'casual' | 'balanced' | 'sharp'

export const BOT_DIFFICULTIES: BotDifficulty[] = ['casual', 'balanced', 'sharp']

export interface BotAimInput {
  difficulty: BotDifficulty
  rotation: number
  innings: InningsDTO
  room: RoomDTO
  /** Injectable for tests. Every decision gets its own draw. */
  random?: () => number
}

export interface BotAimPlan {
  aimDegrees: number
  /** Board-space wedge the computer is trying to hit. */
  targetIndex: number
  /** A mistimed shot: the aim is deliberately loose. */
  loose: boolean
}

export type BotDelayKind = 'ready' | 'bowl' | 'release' | 'aim'

const SEGMENT_ANGLE = 360 / BOARD_SEGMENTS.length

/**
 * The scoring wedges, in board order: 1, 2, 3, 4, 6, no-ball. Wides and the
 * four wicket wedges are never chosen on purpose, but a loose shot can land on
 * any of them.
 */
const RUNNING_WEIGHTS = {
  calm: [20, 18, 9, 20, 15, 1],
  steady: [16, 14, 8, 24, 18, 1],
  attack: [7, 8, 4, 32, 30, 1],
  freeHit: [6, 6, 5, 30, 35, 1],
  lastOne: [22, 20, 10, 18, 12, 1],
} as const

const DIFFICULTY = {
  casual: {
    loose: 0.24,
    spread: 22,
  },
  balanced: {
    loose: 0.14,
    spread: 11,
  },
  sharp: {
    loose: 0.07,
    spread: 5,
  },
} as const

const DELAYS: Record<BotDifficulty, Record<BotDelayKind, readonly [number, number]>> = {
  casual: {
    ready: [1300, 2400],
    bowl: [1200, 2300],
    release: [950, 1700],
    aim: [1600, 3100],
  },
  balanced: {
    ready: [850, 1600],
    bowl: [850, 1700],
    release: [700, 1400],
    aim: [1100, 2400],
  },
  sharp: {
    ready: [550, 1100],
    bowl: [650, 1300],
    release: [550, 1100],
    aim: [800, 1800],
  },
}

function pickWeighted(weights: readonly number[], random: number): number {
  const total = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0)
  if (total <= 0) return 0
  let marker = Math.max(0, Math.min(1, random)) * total
  for (let index = 0; index < weights.length; index += 1) {
    marker -= Math.max(0, weights[index] ?? 0)
    if (marker < 0) return index
  }
  return weights.length - 1
}

function targetWeights(innings: InningsDTO, room: RoomDTO): readonly number[] {
  const overs = effectiveOvers(innings.number, room.overs)
  const ballsLeft = remainingBalls(innings.legalBalls, overs)
  const chasing = innings.number === 2 || innings.number === 4
  const required = chasing ? Math.max(0, (room.target ?? 0) - innings.runs) : null
  const wicketsLeft = Math.max(0, room.wickets - innings.wickets)

  if (innings.nextIsFreeHit) return RUNNING_WEIGHTS.freeHit

  if (required != null && ballsLeft <= 1) {
    // On the last ball, aim at the smallest boundary that still gets there.
    if (required >= 5) return [0, 0, 0, 0, 1, 0]
    if (required >= 4) return [0, 0, 0, 1, 0, 0]
    if (required >= 3) return [0, 0, 1, 0, 0, 0]
    if (required >= 2) return [0, 1, 0, 0, 0, 0]
    return [1, 0, 0, 0, 0, 0]
  }

  const runRate = required != null && ballsLeft > 0 ? (required / ballsLeft) * 6 : null
  if (runRate != null && runRate >= 10) return RUNNING_WEIGHTS.attack
  if (runRate != null && runRate >= 8) return RUNNING_WEIGHTS.steady
  if (runRate != null && runRate <= 5) return RUNNING_WEIGHTS.calm

  // With the last recognised batter in, the computer still looks for bad balls
  // but does not swing for six at everything.
  if (wicketsLeft <= 1) return RUNNING_WEIGHTS.lastOne
  return RUNNING_WEIGHTS.steady
}

/**
 * Chooses both the intention and the actual pen angle. A balanced opponent
 * usually hits the wedge it wants; a casual one can drift into a neighbour or
 * completely mishit. The final angle is always absolute page degrees, ready for
 * the same angle-to-wedge maths used by the online server.
 */
export function planBotAim({
  difficulty,
  rotation,
  innings,
  room,
  random = Math.random,
}: BotAimInput): BotAimPlan {
  const tuning = DIFFICULTY[difficulty]
  const loose = random() < tuning.loose
  const targetIndex = loose
    ? Math.min(BOARD_SEGMENTS.length - 1, Math.floor(random() * BOARD_SEGMENTS.length))
    : pickWeighted(targetWeights(innings, room), random())

  // A zero draw sits exactly in the middle of the intended wedge. Positive
  // values drift clockwise, just like a human pushing the pen a little late.
  const jitter = (random() * 2 - 1) * tuning.spread
  const aimDegrees = normalizeAngle(rotation + targetIndex * SEGMENT_ANGLE + jitter)
  return { aimDegrees, targetIndex, loose }
}

export function botAimDegrees(input: BotAimInput): number {
  return planBotAim(input).aimDegrees
}

/** Human-paced pauses for the computer's turn. */
export function botDelayMs(kind: BotDelayKind, difficulty: BotDifficulty, random = Math.random): number {
  const [min, max] = DELAYS[difficulty][kind]
  return Math.round(min + Math.max(0, Math.min(1, random())) * (max - min))
}

/** Enough time for the board to look like it was actually dragged. */
export function botSpinDurationMs(difficulty: BotDifficulty, random = Math.random): number {
  if (difficulty === 'casual') return Math.round(2800 + random() * 1000)
  if (difficulty === 'sharp') return Math.round(2200 + random() * 700)
  return Math.round(2500 + random() * 900)
}
