import { BOARD_SEGMENTS, CPU_SQUADS, DEFAULT_SQUADS, GAME_DEFAULTS, SPIN } from '../config/gameConfig'
import { AppError } from './errors'
import {
  angleToSegmentIndex,
  applyDelivery,
  effectiveOvers,
  normalizeAngle,
} from './gameEngine'
import type { BotDifficulty } from './botEngine'
import type {
  BallDTO,
  InningsDTO,
  MatchSnapshot,
  OutcomeCode,
  PlayerDTO,
  PlayerSquad,
  StopSpinResult,
} from '../types/game'

export const SOLO_HUMAN_ID = 'solo-human'
export const SOLO_CPU_ID = 'solo-cpu'
export const SOLO_ROOM_ID = 'solo-room'
export const SOLO_ROOM_CODE = 'CPU'

export type SoloBattingFirst = 'human' | 'cpu'

export interface SoloConfig {
  humanName: string
  humanTeam: string
  botName: string
  botTeam: string
  overs: number
  wickets: number
  batFirst: SoloBattingFirst
  difficulty: BotDifficulty
  superOver: boolean
  humanSquad?: readonly string[]
  botSquad?: readonly string[]
}

export interface SoloSpin {
  id: string
  finalRotation: number
  durationMs: number
  seed: string
  stoppedAt: string | null
}

export interface SoloSpinStart {
  snapshot: MatchSnapshot
  spin: SoloSpin
}

export interface SoloSpinStop {
  snapshot: MatchSnapshot
  spin: SoloSpin
  result: StopSpinResult
}

export interface SoloBallResult {
  snapshot: MatchSnapshot
  ball: BallDTO
  endReason: 'overs' | 'wickets' | 'target' | null
  pending: MatchSnapshot['room']['pendingTransition']
}

export interface SoloAdvanceResult {
  snapshot: MatchSnapshot
  advanced: boolean
  transition?: MatchSnapshot['room']['pendingTransition']
  winnerUserId?: string | null
}

let localSequence = 0

function localId(prefix: string): string {
  localSequence += 1
  return `${prefix}-${Date.now().toString(36)}-${localSequence.toString(36)}`
}

function iso(nowMs: number): string {
  return new Date(nowMs).toISOString()
}

function withServerNow(snapshot: MatchSnapshot, nowMs: number): MatchSnapshot {
  return { ...snapshot, serverNow: iso(nowMs) }
}

function asSquad(names: readonly string[], count: number): PlayerSquad[] {
  return names.slice(0, count).map((name, position) => ({ position, name }))
}

function latestInnings(snapshot: MatchSnapshot): InningsDTO | null {
  return [...snapshot.innings].sort((a, b) => b.number - a.number)[0] ?? null
}

function nextBallSeq(snapshot: MatchSnapshot): number {
  return snapshot.balls.reduce((max, ball) => Math.max(max, ball.ballSeq), 0) + 1
}

function battingPlayer(snapshot: MatchSnapshot, innings: InningsDTO): PlayerDTO | null {
  return snapshot.players.find((player) => player.userId === innings.battingUserId) ?? null
}

/** Creates the local, browser-only room used by the practice mode. */
export function createSoloSnapshot(config: SoloConfig, nowMs = Date.now()): MatchSnapshot {
  const now = iso(nowMs)
  const overs = Math.max(1, Math.min(GAME_DEFAULTS.maxOvers, Math.round(config.overs)))
  const wickets = Math.max(1, Math.min(GAME_DEFAULTS.maxSquadSize, Math.round(config.wickets)))
  const humanBatting = config.batFirst === 'human'
  const humanSquad = asSquad(config.humanSquad?.length ? config.humanSquad : DEFAULT_SQUADS.en, wickets)
  const botSquad = asSquad(config.botSquad?.length ? config.botSquad : CPU_SQUADS.en, wickets)
  const roomId = SOLO_ROOM_ID
  const inningsId = 'solo-innings-1'

  const players: PlayerDTO[] = [
    {
      userId: SOLO_HUMAN_ID,
      slot: 1,
      name: config.humanName.trim() || 'Player',
      teamName: config.humanTeam.trim() || 'Paper XI',
      isReady: true,
      lastSeenAt: now,
      joinedAt: now,
      leftAt: null,
      squad: humanSquad,
      paperThemeId: null,
      penStyleId: null,
    },
    {
      userId: SOLO_CPU_ID,
      slot: 2,
      name: config.botName.trim() || 'Computer',
      teamName: config.botTeam.trim() || 'CPU XI',
      isReady: true,
      lastSeenAt: now,
      joinedAt: now,
      leftAt: null,
      squad: botSquad,
      paperThemeId: null,
      penStyleId: null,
    },
  ]

  const innings: InningsDTO[] = [
    {
      id: inningsId,
      roomId,
      number: 1,
      battingUserId: humanBatting ? SOLO_HUMAN_ID : SOLO_CPU_ID,
      bowlingUserId: humanBatting ? SOLO_CPU_ID : SOLO_HUMAN_ID,
      runs: 0,
      wickets: 0,
      legalBalls: 0,
      extras: 0,
      nextIsFreeHit: false,
      status: 'live',
      createdAt: now,
      completedAt: null,
    },
  ]

  return {
    room: {
      id: roomId,
      code: SOLO_ROOM_CODE,
      hostUserId: SOLO_HUMAN_ID,
      status: 'live',
      phase: 'ready',
      overs,
      wickets,
      batFirst: humanBatting ? 'host' : 'guest',
      superOver: config.superOver,
      inningsNumber: 1,
      target: null,
      pendingTransition: 'none',
      currentSpinId: null,
      spinStartedAt: null,
      spinEndsAt: null,
      spinDurationMs: null,
      spinSeed: null,
      aimDeadline: null,
      lastBallId: null,
      batterReadyAt: null,
      winnerUserId: null,
      abandonedBy: null,
      lastActiveAt: now,
      createdAt: now,
      startedAt: now,
      finishedAt: null,
    },
    players,
    innings,
    balls: [],
    serverNow: now,
  }
}

/** Mirrors `batter_ready`, including its idempotence for a double tap. */
export function markSoloBatterReady(snapshot: MatchSnapshot, nowMs = Date.now()): MatchSnapshot {
  const { room } = snapshot
  if (room.status !== 'live') throw new AppError('WRONG_PHASE')
  if (room.phase !== 'ready') throw new AppError('WRONG_PHASE')
  if (room.batterReadyAt) return withServerNow(snapshot, nowMs)

  const now = iso(nowMs)
  return withServerNow(
    {
      ...snapshot,
      room: {
        ...room,
        batterReadyAt: now,
        lastActiveAt: now,
      },
    },
    nowMs,
  )
}

/** Starts the hidden spin. The final rotation only becomes visible at reveal. */
export function startSoloSpin(
  snapshot: MatchSnapshot,
  nowMs = Date.now(),
  options: {
    durationMs?: number
    fallbackRotation?: number
    seed?: string
    id?: string
  } = {},
): SoloSpinStart {
  const { room } = snapshot
  if (room.status !== 'live' || room.phase !== 'ready') throw new AppError('WRONG_PHASE')
  if (!room.batterReadyAt) throw new AppError('NOT_READY')
  if (room.currentSpinId) throw new AppError('ALREADY_SPUN')

  const currentInnings = latestInnings(snapshot)
  if (!currentInnings || currentInnings.status !== 'live') throw new AppError('WRONG_PHASE')

  const durationMs = Math.max(
    SPIN.minDurationMs,
    Math.min(SPIN.maxDurationMs, Math.round(options.durationMs ?? 3000)),
  )
  const finalRotation = normalizeAngle(options.fallbackRotation ?? Math.random() * 360)
  const start = iso(nowMs)
  const end = iso(nowMs + durationMs)
  const deadline = iso(nowMs + durationMs + SPIN.aimWindowMs)
  const spin: SoloSpin = {
    id: options.id ?? localId('solo-spin'),
    finalRotation,
    durationMs,
    seed: options.seed ?? Math.random().toString(16).slice(2).padEnd(16, '0').slice(0, 16),
    stoppedAt: null,
  }

  const next = withServerNow(
    {
      ...snapshot,
      room: {
        ...room,
        phase: 'spinning',
        currentSpinId: spin.id,
        spinStartedAt: start,
        spinEndsAt: end,
        spinDurationMs: durationMs,
        spinSeed: spin.seed,
        aimDeadline: deadline,
        lastActiveAt: start,
      },
    },
    nowMs,
  )
  return { snapshot: next, spin }
}

/** Stops the board at the bowler's angle and opens the batter's aim window. */
export function stopSoloSpin(
  snapshot: MatchSnapshot,
  spin: SoloSpin,
  rotation: number,
  nowMs = Date.now(),
): SoloSpinStop {
  const { room } = snapshot
  if (room.status !== 'live' || room.phase !== 'spinning' || room.currentSpinId !== spin.id) {
    throw new AppError('WRONG_PHASE')
  }

  const finalRotation = normalizeAngle(rotation)

  if (spin.stoppedAt) {
    return {
      snapshot: withServerNow(snapshot, nowMs),
      spin,
      result: {
        id: spin.id,
        endsAt: room.spinEndsAt ?? spin.stoppedAt,
        aimDeadline: room.aimDeadline ?? spin.stoppedAt,
        finalRotation: spin.finalRotation,
        alreadyStopped: true,
      },
    }
  }

  const now = iso(nowMs)
  const aimDeadline = iso(nowMs + SPIN.aimWindowMs)
  const startedAt = Date.parse(room.spinStartedAt ?? now)
  const elapsed = Math.max(SPIN.minDurationMs, Math.min(SPIN.maxDurationMs, nowMs - startedAt))
  const stoppedSpin: SoloSpin = { ...spin, finalRotation, stoppedAt: now }
  const next = withServerNow(
    {
      ...snapshot,
      room: {
        ...room,
        spinEndsAt: now,
        spinDurationMs: Math.round(elapsed),
        aimDeadline,
        lastActiveAt: now,
      },
    },
    nowMs,
  )

  return {
    snapshot: next,
    spin: stoppedSpin,
    result: {
      id: spin.id,
      endsAt: now,
      aimDeadline,
      finalRotation,
      alreadyStopped: false,
    },
  }
}

function pendingAfterBall(
  snapshot: MatchSnapshot,
  innings: InningsDTO,
  runsAfter: number,
  complete: boolean,
): MatchSnapshot['room']['pendingTransition'] {
  if (!complete) return 'none'
  if (innings.number === 1 || innings.number === 3) return 'innings'
  if (innings.number === 2) {
    const first = snapshot.innings.find((entry) => entry.number === 1)
    if (first && runsAfter === first.runs && snapshot.room.superOver) return 'super_over'
    return 'match'
  }
  return 'match'
}

/** Resolves one delivery exactly like `submit_aim` does on the server. */
export function resolveSoloBall(
  snapshot: MatchSnapshot,
  spin: SoloSpin,
  aimDegrees: number,
  nowMs = Date.now(),
): SoloBallResult {
  const { room } = snapshot
  if (room.status !== 'live' || room.phase !== 'spinning' || room.currentSpinId !== spin.id) {
    throw new AppError('WRONG_PHASE')
  }

  const innings = latestInnings(snapshot)
  if (!innings || innings.status !== 'live') throw new AppError('WRONG_PHASE')

  const safeAim = normalizeAngle(Number.isFinite(aimDegrees) ? aimDegrees : Math.random() * 360)
  const segmentIndex = angleToSegmentIndex(safeAim, spin.finalRotation, BOARD_SEGMENTS.length)
  const outcome = BOARD_SEGMENTS[segmentIndex]?.code as OutcomeCode
  const rules = {
    overs: effectiveOvers(innings.number, room.overs),
    wickets: room.wickets,
    target: room.target,
  }
  const delivery = applyDelivery(
    {
      runs: innings.runs,
      wickets: innings.wickets,
      legalBalls: innings.legalBalls,
      extras: innings.extras,
      nextIsFreeHit: innings.nextIsFreeHit,
    },
    outcome,
    rules,
  )

  const now = iso(nowMs)
  const batterName = battingPlayer(snapshot, innings)?.squad[innings.wickets]?.name ?? 'Batter'
  const ball: BallDTO = {
    id: localId('solo-ball'),
    roomId: room.id,
    inningsId: innings.id,
    ballSeq: nextBallSeq(snapshot),
    batterIndex: innings.wickets,
    batterName,
    outcome,
    segmentIndex,
    runs: delivery.batRuns,
    extras: delivery.extras,
    isLegal: delivery.isLegal,
    isWicket: delivery.isWicket,
    isFreeHit: delivery.wasFreeHit,
    aimDegrees: Number(safeAim.toFixed(4)),
    boardRotation: spin.finalRotation,
    createdAt: now,
  }
  const pending = pendingAfterBall(snapshot, innings, delivery.state.runs, delivery.inningsComplete)

  const nextInnings: InningsDTO = {
    ...innings,
    runs: delivery.state.runs,
    wickets: delivery.state.wickets,
    legalBalls: delivery.state.legalBalls,
    extras: delivery.state.extras,
    nextIsFreeHit: delivery.state.nextIsFreeHit,
    status: delivery.inningsComplete ? 'complete' : 'live',
    completedAt: delivery.inningsComplete ? now : null,
  }

  const next = withServerNow(
    {
      ...snapshot,
      room: {
        ...room,
        phase: 'reveal',
        currentSpinId: null,
        spinStartedAt: null,
        spinEndsAt: null,
        spinDurationMs: null,
        spinSeed: null,
        aimDeadline: null,
        batterReadyAt: null,
        lastBallId: ball.id,
        pendingTransition: pending,
        lastActiveAt: now,
      },
      innings: snapshot.innings.map((entry) => (entry.id === innings.id ? nextInnings : entry)),
      balls: [...snapshot.balls, ball],
    },
    nowMs,
  )

  return {
    snapshot: next,
    ball,
    endReason: delivery.endReason,
    pending,
  }
}

function winnerFrom(innings: InningsDTO[], firstNumber: 1 | 3): string | null {
  const first = innings.find((entry) => entry.number === firstNumber)
  const second = innings.find((entry) => entry.number === firstNumber + 1)
  if (!first || !second) return null
  if (second.runs > first.runs) return second.battingUserId
  if (first.runs > second.runs) return first.battingUserId
  return null
}

/** Mirrors `advance_ball`: next ball, innings change, super over, or finish. */
export function advanceSoloBall(
  snapshot: MatchSnapshot,
  lastBallId: string,
  nowMs = Date.now(),
): SoloAdvanceResult {
  const { room } = snapshot
  if (room.phase !== 'reveal') return { snapshot, advanced: false }
  if (room.lastBallId !== lastBallId) return { snapshot, advanced: false }

  const now = iso(nowMs)
  const transition = room.pendingTransition

  if (transition === 'none') {
    const next = withServerNow(
      {
        ...snapshot,
        room: {
          ...room,
          phase: 'ready',
          batterReadyAt: null,
          lastActiveAt: now,
        },
      },
      nowMs,
    )
    return { snapshot: next, advanced: true, transition }
  }

  const previous = latestInnings(snapshot)
  if (!previous) throw new AppError('WRONG_PHASE')

  if (transition === 'innings') {
    if (previous.number !== 1 && previous.number !== 3) throw new AppError('WRONG_PHASE')
    const nextNumber = previous.number + 1
    const nextInnings: InningsDTO = {
      id: localId('solo-innings'),
      roomId: room.id,
      number: nextNumber,
      battingUserId: previous.bowlingUserId,
      bowlingUserId: previous.battingUserId,
      runs: 0,
      wickets: 0,
      legalBalls: 0,
      extras: 0,
      nextIsFreeHit: false,
      status: 'live',
      createdAt: now,
      completedAt: null,
    }
    const next = withServerNow(
      {
        ...snapshot,
        room: {
          ...room,
          phase: 'ready',
          inningsNumber: nextNumber,
          target: previous.runs + 1,
          pendingTransition: 'none',
          batterReadyAt: null,
          lastBallId: null,
          lastActiveAt: now,
        },
        innings: [...snapshot.innings, nextInnings],
      },
      nowMs,
    )
    return { snapshot: next, advanced: true, transition }
  }

  if (transition === 'super_over') {
    const nextInnings: InningsDTO = {
      id: localId('solo-innings'),
      roomId: room.id,
      number: 3,
      battingUserId: previous.battingUserId,
      bowlingUserId: previous.bowlingUserId,
      runs: 0,
      wickets: 0,
      legalBalls: 0,
      extras: 0,
      nextIsFreeHit: false,
      status: 'live',
      createdAt: now,
      completedAt: null,
    }
    const next = withServerNow(
      {
        ...snapshot,
        room: {
          ...room,
          phase: 'ready',
          inningsNumber: 3,
          target: null,
          pendingTransition: 'none',
          batterReadyAt: null,
          lastBallId: null,
          lastActiveAt: now,
        },
        innings: [...snapshot.innings, nextInnings],
      },
      nowMs,
    )
    return { snapshot: next, advanced: true, transition }
  }

  const winnerUserId = winnerFrom(snapshot.innings, previous.number >= 4 ? 3 : 1)
  const next = withServerNow(
    {
      ...snapshot,
      room: {
        ...room,
        status: 'finished',
        phase: 'finished',
        winnerUserId,
        pendingTransition: 'none',
        currentSpinId: null,
        spinStartedAt: null,
        spinEndsAt: null,
        spinDurationMs: null,
        spinSeed: null,
        aimDeadline: null,
        batterReadyAt: null,
        lastBallId: null,
        finishedAt: now,
        lastActiveAt: now,
      },
    },
    nowMs,
  )
  return { snapshot: next, advanced: true, transition, winnerUserId }
}
