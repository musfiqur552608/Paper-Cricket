export type OutcomeCode = '1' | '2' | '3' | '4' | '6' | 'N' | 'W' | 'CO' | 'LBW' | 'RO' | 'BO'

export type SegmentKind = 'runs' | 'noBall' | 'wide' | 'wicket'

export interface BoardSegment {
  code: OutcomeCode
  kind: SegmentKind
  runs: number
  labelEn: string
  labelBn: string
  ariaEn: string
  ariaBn: string
}

export interface PlayerSquad {
  position: number
  name: string
}

export type BatFirstChoice = 'host' | 'guest' | 'toss'

export interface RoomRules {
  overs: number
  wickets: number
  batFirst: BatFirstChoice
  superOver: boolean
}

export type RoomStatus = 'lobby' | 'live' | 'finished' | 'abandoned'

/** `ready` → batter arms pen → bowler spins → `spinning` → `aiming` → `reveal`. */
export type MatchPhase = 'lobby' | 'ready' | 'spinning' | 'aiming' | 'reveal' | 'finished'

export type PendingTransition = 'none' | 'innings' | 'super_over' | 'match'

export interface RoomDTO {
  id: string
  code: string
  hostUserId: string
  status: RoomStatus
  phase: MatchPhase
  overs: number
  wickets: number
  batFirst: BatFirstChoice
  superOver: boolean
  inningsNumber: number
  target: number | null
  pendingTransition: PendingTransition
  currentSpinId: string | null
  spinStartedAt: string | null
  spinEndsAt: string | null
  spinDurationMs: number | null
  spinSeed: string | null
  aimDeadline: string | null
  lastBallId: string | null
  batterReadyAt: string | null
  winnerUserId: string | null
  abandonedBy: string | null
  lastActiveAt: string
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
}

export interface PlayerDTO {
  userId: string
  slot: number
  name: string
  teamName: string
  isReady: boolean
  lastSeenAt: string
  joinedAt: string
  leftAt: string | null
  squad: PlayerSquad[]
}

export interface InningsDTO {
  id: string
  roomId: string
  number: number
  battingUserId: string
  bowlingUserId: string
  runs: number
  wickets: number
  legalBalls: number
  extras: number
  nextIsFreeHit: boolean
  status: 'live' | 'complete'
  createdAt: string
  completedAt: string | null
}

export interface BallDTO {
  id: string
  roomId: string
  inningsId: string
  ballSeq: number
  batterIndex: number
  batterName: string
  outcome: OutcomeCode
  segmentIndex: number
  runs: number
  extras: number
  isLegal: boolean
  isWicket: boolean
  isFreeHit: boolean
  aimDegrees: number
  boardRotation: number
  createdAt: string
}

export interface MatchSnapshot {
  room: RoomDTO
  players: PlayerDTO[]
  innings: InningsDTO[]
  balls: BallDTO[]
  serverNow: string
}

export interface ActiveSpin {
  id: string
  durationMs: number
  seed: string
  startedAt: string
  endsAt: string
  aimDeadline: string
}

export interface JoinResult {
  roomId: string
  code: string
}

export interface ApiErrorShape {
  code: string
  message: string
}

export interface PlayerScore {
  index: number
  name: string
  runs: number
  balls: number
  fours: number
  sixes: number
  outType: OutcomeCode | null
  isOut: boolean
  isStriker: boolean
}

export interface OverSummary {
  over: number
  runs: number
  wickets: number
  legalBalls: number
  balls: BallDTO[]
}

export interface MatchStats {
  mostSixes: { name: string; sixes: number } | null
  mostFours: { name: string; fours: number } | null
  bestOver: { team: string; over: number; runs: number } | null
  totalSixes: number
  totalFours: number
  totalWickets: number
  totalExtras: number
}

export interface LocalProfile {
  name: string
  teamName: string
  squad: string[]
}
