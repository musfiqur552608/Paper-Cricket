import type { BallDTO, InningsDTO, MatchSnapshot, PlayerDTO } from '../types/game'
import { requiredRunRate, remainingBalls } from './gameEngine'

export type DerivedPhase = 'lobby' | 'ready' | 'spinning' | 'aiming' | 'reveal' | 'finished'

export interface MatchView {
  me: PlayerDTO | null
  opponent: PlayerDTO | null
  activePlayers: PlayerDTO[]
  innings: InningsDTO | null
  lastBall: BallDTO | null
  battingPlayer: PlayerDTO | null
  bowlingPlayer: PlayerDTO | null
  isBatter: boolean
  isBowler: boolean
  phase: DerivedPhase
  overs: number
  currentOvers: string
  ballsRemaining: number
  requiredRuns: number | null
  rrr: number | null
  strikerName: string | null
  overBalls: BallDTO[]
  activeSpin: {
    id: string
    durationMs: number
    seed: string
    startedAt: string
    endsAt: string
    aimDeadline: string | null
  } | null
}

export function playerByUserId(players: PlayerDTO[], userId: string | null): PlayerDTO | null {
  if (!userId) return null
  return players.find((player) => player.userId === userId) ?? null
}

export function getMatchView(snapshot: MatchSnapshot, userId: string, nowMs: number): MatchView {
  const activePlayers = snapshot.players.filter((player) => !player.leftAt)
  const me = playerByUserId(activePlayers, userId) ?? playerByUserId(snapshot.players, userId)
  const opponent = activePlayers.find((player) => player.userId !== userId) ?? null

  const innings = [...snapshot.innings].sort((a, b) => b.number - a.number)[0] ?? null
  const lastBall = snapshot.room.lastBallId
    ? snapshot.balls.find((ball) => ball.id === snapshot.room.lastBallId) ?? null
    : [...snapshot.balls].sort((a, b) => b.ballSeq - a.ballSeq)[0] ?? null

  const battingPlayer = playerByUserId(snapshot.players, innings?.battingUserId ?? null)
  const bowlingPlayer = playerByUserId(snapshot.players, innings?.bowlingUserId ?? null)
  const isBatter = Boolean(innings && innings.battingUserId === userId && snapshot.room.status === 'live')
  const isBowler = Boolean(innings && innings.bowlingUserId === userId && snapshot.room.status === 'live')

  let phase: DerivedPhase = 'lobby'
  if (snapshot.room.status === 'finished' || snapshot.room.status === 'abandoned') {
    phase = 'finished'
  } else if (snapshot.room.status === 'live') {
    if (snapshot.room.phase === 'reveal') phase = 'reveal'
    else if (snapshot.room.phase === 'spinning' || snapshot.room.phase === 'aiming') {
      const endsAt = snapshot.room.spinEndsAt ? Date.parse(snapshot.room.spinEndsAt) : 0
      phase = nowMs >= endsAt ? 'aiming' : 'spinning'
    } else if (snapshot.room.phase === 'finished') phase = 'finished'
    else phase = 'ready'
  }

  const overs = innings && innings.number >= 3 ? 1 : snapshot.room.overs
  const ballsRemaining = innings ? remainingBalls(innings.legalBalls, overs) : 0
  const target = snapshot.room.target
  const requiredRuns = target != null && innings ? Math.max(0, target - innings.runs) : null
  const rrr = innings ? requiredRunRate(target, innings.runs, innings.legalBalls, overs) : null
  const strikerName = innings ? battingPlayer?.squad[innings.wickets]?.name ?? lastBall?.batterName ?? null : null

  const overBalls = innings
    ? snapshot.balls
        .filter((ball) => ball.inningsId === innings.id)
        .sort((a, b) => a.ballSeq - b.ballSeq)
        .slice(-8)
    : []

  const activeSpin =
    snapshot.room.currentSpinId && snapshot.room.spinStartedAt && snapshot.room.spinEndsAt
      ? {
          id: snapshot.room.currentSpinId,
          durationMs: snapshot.room.spinDurationMs ?? 3000,
          seed: snapshot.room.spinSeed ?? '',
          startedAt: snapshot.room.spinStartedAt,
          endsAt: snapshot.room.spinEndsAt,
          aimDeadline: snapshot.room.aimDeadline,
        }
      : null

  return {
    me,
    opponent,
    activePlayers,
    innings,
    lastBall,
    battingPlayer,
    bowlingPlayer,
    isBatter,
    isBowler,
    phase,
    overs,
    currentOvers: innings ? `${Math.floor(innings.legalBalls / 6)}.${innings.legalBalls % 6}` : '0.0',
    ballsRemaining,
    requiredRuns,
    rrr,
    strikerName,
    overBalls,
    activeSpin,
  }
}

export function inningsLabel(number: number, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (number === 1) return t('match.inningsOne')
  if (number === 2) return t('match.inningsTwo')
  if (number === 3) return t('match.superOne')
  return t('match.superTwo')
}

export function teamNameForUser(players: PlayerDTO[], userId: string | null): string {
  return players.find((player) => player.userId === userId)?.teamName ?? '—'
}

export function batterForInnings(innings: InningsDTO | null, player: PlayerDTO | null): string | null {
  if (!innings || !player) return null
  return player.squad[innings.wickets]?.name ?? null
}
