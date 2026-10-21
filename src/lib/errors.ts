export class AppError extends Error {
  code: string

  constructor(code: string, message?: string) {
    super(message ?? code)
    this.name = 'AppError'
    this.code = code
  }
}

const KNOWN_CODES = [
  'AUTH_REQUIRED',
  'ROOM_NOT_FOUND',
  'ROOM_CODE_COLLISION',
  'ROOM_FULL',
  'ROOM_CLOSED',
  'NOT_MEMBER',
  'NOT_HOST',
  'WRONG_PHASE',
  'OUT_OF_TURN',
  'SPIN_NOT_FINISHED',
  'ALREADY_SPUN',
  'AIM_CLOSED',
  'INVALID_ANGLE',
  'NOT_READY',
  'NOT_ENOUGH_PLAYERS',
  'PROFILE_LOCKED',
  'STALE_BALL',
  'NOT_CONFIGURED',
  'ROOM_EXPIRED',
  'NICKNAME_REQUIRED',
  'NAME_REQUIRED',
  'SQUAD_INVALID',
  'INVALID_RULES',
  'PLAYER_LEFT',
  'NO_GRACE_YET',
]

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error

  const raw =
    typeof error === 'string'
      ? error
      : error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : ''

  const found = KNOWN_CODES.find((code) => raw.toUpperCase().includes(code))
  if (found) return new AppError(found)

  if (/failed to fetch|network|fetch/i.test(raw)) {
    return new AppError('NETWORK', raw)
  }

  if (/jwt|auth|session/i.test(raw)) {
    return new AppError('AUTH_REQUIRED', raw)
  }

  return new AppError('UNKNOWN', raw || 'Unknown error')
}

export function errorKey(code: string): string {
  switch (code) {
    case 'ROOM_NOT_FOUND':
    case 'ROOM_EXPIRED':
    case 'ROOM_CODE_COLLISION':
      return 'errors.roomNotFound'
    case 'ROOM_FULL':
      return 'errors.roomFull'
    case 'ROOM_CLOSED':
    case 'PLAYER_LEFT':
      return 'errors.roomClosed'
    case 'NOT_MEMBER':
      return 'errors.notMember'
    case 'NOT_HOST':
      return 'errors.onlyHost'
    case 'OUT_OF_TURN':
      return 'errors.outOfTurn'
    case 'SPIN_NOT_FINISHED':
      return 'errors.spinNotFinished'
    case 'ALREADY_SPUN':
      return 'errors.alreadySpun'
    case 'AIM_CLOSED':
      return 'errors.aimClosed'
    case 'WRONG_PHASE':
      return 'errors.wrongPhase'
    case 'INVALID_ANGLE':
      return 'errors.invalidAngle'
    case 'NOT_READY':
      return 'errors.notReady'
    case 'NOT_ENOUGH_PLAYERS':
      return 'errors.notEnoughPlayers'
    case 'PROFILE_LOCKED':
      return 'errors.profileLocked'
    case 'STALE_BALL':
      return 'errors.stale'
    case 'NETWORK':
      return 'errors.network'
    case 'AUTH_REQUIRED':
      return 'errors.auth'
    case 'NOT_CONFIGURED':
      return 'errors.notConfigured'
    case 'NAME_REQUIRED':
      return 'errors.nameRequired'
    case 'SQUAD_INVALID':
    case 'INVALID_RULES':
      return 'errors.squadInvalid'
    case 'NO_GRACE_YET':
      return 'errors.noGraceYet'
    default:
      return 'errors.generic'
  }
}
