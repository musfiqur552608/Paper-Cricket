import { BOARD_SEGMENTS, getSegment, isIllegalCode } from '../config/gameConfig'
import type {
  BallDTO,
  InningsDTO,
  MatchStats,
  OutcomeCode,
  OverSummary,
  PlayerScore,
  PlayerSquad,
} from '../types/game'

export interface InningsEngineState {
  runs: number
  wickets: number
  legalBalls: number
  extras: number
  nextIsFreeHit: boolean
}

export interface InningsRules {
  overs: number
  wickets: number
  target?: number | null
}

export interface DeliveryResult {
  batterIndex: number
  outcome: OutcomeCode
  batRuns: number
  extras: number
  totalRuns: number
  isLegal: boolean
  isWicket: boolean
  wasFreeHit: boolean
  nextFreeHit: boolean
  state: InningsEngineState
  inningsComplete: boolean
  chaseComplete: boolean
  endReason: 'overs' | 'wickets' | 'target' | null
  wicketsRemaining: number
}

/** Normalise any degree value into [0, 360). */
export function normalizeAngle(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0
  const value = degrees % 360
  return value < 0 ? value + 360 : value
}

/**
 * Maps a pen direction and a board rotation to the touched segment.
 * Board segments are centred on 0° (top) and every `360 / count` after that.
 * The board is rotated clockwise by `rotationDegrees`, so a pen at
 * `aimDegrees` touches the segment at `aim - rotation` in board space.
 */
export function angleToSegmentIndex(
  aimDegrees: number,
  rotationDegrees: number,
  segmentCount = BOARD_SEGMENTS.length,
): number {
  if (!Number.isInteger(segmentCount) || segmentCount <= 0) {
    throw new Error('segmentCount must be a positive integer')
  }
  const segmentAngle = 360 / segmentCount
  const local = normalizeAngle(aimDegrees - rotationDegrees)
  return Math.floor((local + segmentAngle / 2) / segmentAngle) % segmentCount
}

export function angleToOutcome(
  aimDegrees: number,
  rotationDegrees: number,
  segments = BOARD_SEGMENTS,
): OutcomeCode {
  const index = angleToSegmentIndex(aimDegrees, rotationDegrees, segments.length)
  const segment = segments[index]
  if (!segment) throw new Error('Segment index out of range')
  return segment.code
}

export function emptyInningsState(): InningsEngineState {
  return { runs: 0, wickets: 0, legalBalls: 0, extras: 0, nextIsFreeHit: false }
}

/**
 * The pure heart of the game. Given the state before a delivery, applies one
 * segment outcome. This mirrors the authoritative Postgres `play_ball` logic.
 */
export function applyDelivery(
  state: InningsEngineState,
  outcome: OutcomeCode,
  rules: InningsRules,
): DeliveryResult {
  const segment = getSegment(outcome)
  const wasFreeHit = state.nextIsFreeHit
  const isLegal = !isIllegalCode(outcome)
  const isWicket = segment.kind === 'wicket' && !wasFreeHit
  const batRuns = segment.kind === 'runs' ? segment.runs : 0
  const extras = isIllegalCode(outcome) ? 1 : 0
  const totalRuns = state.runs + batRuns + extras
  const legalBalls = state.legalBalls + (isLegal ? 1 : 0)
  const wickets = state.wickets + (isWicket ? 1 : 0)
  const nextFreeHit =
    segment.kind === 'noBall' ? true : isLegal ? false : state.nextIsFreeHit

  const wicketsRemaining = Math.max(0, rules.wickets - wickets)
  const chaseComplete = rules.target != null && totalRuns >= rules.target
  const oversComplete = legalBalls >= rules.overs * 6
  const wicketsComplete = wickets >= rules.wickets

  let endReason: DeliveryResult['endReason'] = null
  if (chaseComplete) endReason = 'target'
  else if (wicketsComplete) endReason = 'wickets'
  else if (oversComplete) endReason = 'overs'

  return {
    batterIndex: state.wickets,
    outcome,
    batRuns,
    extras,
    totalRuns,
    isLegal,
    isWicket,
    wasFreeHit,
    nextFreeHit,
    state: {
      runs: totalRuns,
      wickets,
      legalBalls,
      extras: state.extras + extras,
      nextIsFreeHit: nextFreeHit,
    },
    inningsComplete: endReason !== null,
    chaseComplete,
    endReason,
    wicketsRemaining,
  }
}

/** Overs as scorers write them: 17 legal balls = 2.5 overs. */
export function formatOvers(legalBalls: number): string {
  const safe = Math.max(0, Math.floor(legalBalls))
  return `${Math.floor(safe / 6)}.${safe % 6}`
}

export function remainingBalls(legalBalls: number, overs: number): number {
  return Math.max(0, overs * 6 - legalBalls)
}

export function requiredRunRate(
  target: number | null | undefined,
  runs: number,
  legalBalls: number,
  overs: number,
): number | null {
  if (target == null) return null
  const balls = remainingBalls(legalBalls, overs)
  if (balls <= 0) return null
  return Math.max(0, ((target - runs) / balls) * 6)
}

export function strikeRate(runs: number, balls: number): string {
  if (balls <= 0) return '0.0'
  return ((runs / balls) * 100).toFixed(1)
}

export function economy(runs: number, legalBalls: number): string {
  if (legalBalls <= 0) return '0.00'
  return (runs / (legalBalls / 6)).toFixed(2)
}

/**
 * Batter-by-batter scorecard for one innings. Batting order is the squad order.
 * Under these rules the striker does not swap on odd runs; the next batter
 * arrives only when a wicket actually falls (including run-outs).
 */
export function buildPlayerScores(
  innings: InningsDTO,
  balls: BallDTO[],
  squad: PlayerSquad[],
): PlayerScore[] {
  const inningsBalls = balls
    .filter((ball) => ball.inningsId === innings.id)
    .sort((a, b) => a.ballSeq - b.ballSeq)

  const currentIndex = innings.wickets
  const participants = new Set<number>()
  for (const ball of inningsBalls) participants.add(ball.batterIndex)
  if (innings.status === 'live' && currentIndex < squad.length) participants.add(currentIndex)
  if (participants.size === 0 && squad.length > 0) participants.add(0)

  return [...participants]
    .sort((a, b) => a - b)
    .filter((index) => index >= 0 && index < squad.length)
    .map((index) => {
      const batterBalls = inningsBalls.filter((ball) => ball.batterIndex === index)
      const runs = batterBalls.reduce((sum, ball) => sum + ball.runs, 0)
      const ballsFaced = batterBalls.filter((ball) => ball.outcome !== 'W').length
      const fours = batterBalls.filter((ball) => ball.outcome === '4').length
      const sixes = batterBalls.filter((ball) => ball.outcome === '6').length
      const dismissal = batterBalls.find((ball) => ball.isWicket)
      const namedBall = batterBalls[0]
      return {
        index,
        name: squad[index]?.name ?? namedBall?.batterName ?? `Batter ${index + 1}`,
        runs,
        balls: ballsFaced,
        fours,
        sixes,
        outType: dismissal?.outcome ?? null,
        isOut: Boolean(dismissal),
        isStriker: innings.status === 'live' && index === currentIndex,
      }
    })
}

/** Every ball grouped by the over it belonged to, including wides/no-balls. */
export interface FallOfWicket {
  wicket: number
  runs: number
  overs: string
  batterName: string
}

export function buildOverTimeline(innings: InningsDTO, balls: BallDTO[]): OverSummary[] {
  const deliveries = balls
    .filter((ball) => ball.inningsId === innings.id)
    .sort((a, b) => a.ballSeq - b.ballSeq)

  const overs = new Map<number, OverSummary>()
  let legalSoFar = 0

  for (const ball of deliveries) {
    const overNumber = Math.floor(legalSoFar / 6) + 1
    const current = overs.get(overNumber) ?? {
      over: overNumber,
      runs: 0,
      wickets: 0,
      legalBalls: 0,
      balls: [],
    }
    current.runs += ball.runs + ball.extras
    current.wickets += ball.isWicket ? 1 : 0
    current.legalBalls += ball.isLegal ? 1 : 0
    current.balls.push(ball)
    overs.set(overNumber, current)
    if (ball.isLegal) legalSoFar += 1
  }

  return [...overs.values()].sort((a, b) => a.over - b.over)
}

/** Wickets as a scorer lists them: 26/1, 31/2, ... with the over at the fall. */
export function buildFallOfWickets(innings: InningsDTO, balls: BallDTO[]): FallOfWicket[] {
  const deliveries = balls
    .filter((ball) => ball.inningsId === innings.id)
    .sort((a, b) => a.ballSeq - b.ballSeq)

  let runs = 0
  let legalBalls = 0
  let wickets = 0
  const falls: FallOfWicket[] = []

  for (const ball of deliveries) {
    runs += ball.runs + ball.extras
    if (ball.isLegal) legalBalls += 1
    if (ball.isWicket) {
      wickets += 1
      falls.push({
        wicket: wickets,
        runs,
        overs: formatOvers(legalBalls),
        batterName: ball.batterName,
      })
    }
  }

  return falls
}

export interface MatchStatsInput {
  innings: InningsDTO[]
  balls: BallDTO[]
  squadsByUser: Map<string, PlayerSquad[]>
  teamsByUser: Map<string, string>
}

export function buildMatchStats({
  innings,
  balls,
  squadsByUser,
  teamsByUser,
}: MatchStatsInput): MatchStats {
  const allBatters = innings.flatMap((inn) =>
    buildPlayerScores(inn, balls, squadsByUser.get(inn.battingUserId) ?? []),
  )
  const sixesLeader = [...allBatters].sort((a, b) => b.sixes - a.sixes)[0]
  const foursLeader = [...allBatters].sort((a, b) => b.fours - a.fours)[0]

  let bestOver: MatchStats['bestOver'] = null
  let totalSixes = 0
  let totalFours = 0
  let totalWickets = 0
  let totalExtras = 0

  for (const inn of innings) {
    const overList = buildOverTimeline(inn, balls)
    for (const over of overList) {
      const team = teamsByUser.get(inn.battingUserId) ?? '—'
      if (!bestOver || over.runs > bestOver.runs) {
        bestOver = { team, over: over.over, runs: over.runs }
      }
    }
    totalWickets += inn.wickets
    totalExtras += inn.extras
  }

  for (const ball of balls) {
    if (ball.outcome === '6') totalSixes += 1
    if (ball.outcome === '4') totalFours += 1
  }

  return {
    mostSixes: sixesLeader && sixesLeader.sixes > 0 ? { name: sixesLeader.name, sixes: sixesLeader.sixes } : null,
    mostFours: foursLeader && foursLeader.fours > 0 ? { name: foursLeader.name, fours: foursLeader.fours } : null,
    bestOver,
    totalSixes,
    totalFours,
    totalWickets,
    totalExtras,
  }
}

/** Target for the side batting next (first innings total + 1). */
export function targetAfter(firstInnings: Pick<InningsDTO, 'runs'>): number {
  return firstInnings.runs + 1
}

export function isChasingInnings(inningsNumber: number): boolean {
  return inningsNumber === 2 || inningsNumber === 4
}

export function effectiveOvers(inningsNumber: number, matchOvers: number): number {
  return inningsNumber >= 3 ? 1 : matchOvers
}
