import type {
  ActiveSpin,
  JoinResult,
  MatchSnapshot,
  RoomDTO,
  RoomRules,
} from '../../types/game'
import { normalizeAngle } from '../gameEngine'
import { AppError, toAppError } from '../errors'
import { ensureAnonSession, supabase } from './client'

async function call<T>(name: string, params: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new AppError('NOT_CONFIGURED')
  await ensureAnonSession()
  const { data, error } = await supabase.rpc(name, params)
  if (error) throw toAppError(error)
  return data as T
}

export interface ProfilePayload {
  name: string
  teamName: string
  squad: string[]
}

export interface PeekRoom {
  exists: boolean
  code: string
  status: RoomDTO['status'] | 'missing'
  playerCount: number
  isMember: boolean
  hostTeamName: string | null
  hostName: string | null
}

export function normalizeRoomCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^2-9A-HJ-NP-Z]/g, '')
    .slice(0, 6)
}

export async function createRoom(profile: ProfilePayload): Promise<JoinResult> {
  const result = await call<JoinResult>('create_room', {
    p_name: profile.name.trim(),
    p_team: profile.teamName.trim(),
    p_squad: profile.squad,
  })
  if (!result?.code) throw new AppError('UNKNOWN')
  return result
}

export async function joinRoom(code: string, profile: ProfilePayload): Promise<JoinResult> {
  const cleanCode = normalizeRoomCode(code)
  if (cleanCode.length !== 6) throw new AppError('ROOM_NOT_FOUND')
  return call<JoinResult>('join_room', {
    p_code: cleanCode,
    p_name: profile.name.trim(),
    p_team: profile.teamName.trim(),
    p_squad: profile.squad,
  })
}

export async function peekRoom(code: string): Promise<PeekRoom> {
  return call<PeekRoom>('peek_room', { p_code: normalizeRoomCode(code) })
}

export async function getRoomSnapshot(code: string): Promise<MatchSnapshot> {
  return call<MatchSnapshot>('get_room_snapshot', { p_code: normalizeRoomCode(code) })
}

export async function updateRoomSettings(roomId: string, rules: RoomRules): Promise<void> {
  await call<null>('update_room_settings', {
    p_room_id: roomId,
    p_overs: rules.overs,
    p_wickets: rules.wickets,
    p_bat_first: rules.batFirst,
    p_super_over: rules.superOver,
  })
}

export async function updatePlayerProfile(roomId: string, profile: ProfilePayload): Promise<void> {
  await call<null>('update_player_profile', {
    p_room_id: roomId,
    p_name: profile.name.trim(),
    p_team: profile.teamName.trim(),
    p_squad: profile.squad,
  })
}

export async function setPlayerReady(roomId: string, ready: boolean): Promise<void> {
  await call<null>('set_ready', { p_room_id: roomId, p_ready: ready })
}

export async function startMatch(roomId: string): Promise<void> {
  await call<null>('start_match', { p_room_id: roomId })
}

export async function setBatterReady(roomId: string): Promise<void> {
  await call<null>('batter_ready', { p_room_id: roomId })
}

export async function startSpin(roomId: string): Promise<ActiveSpin> {
  return call<ActiveSpin>('start_spin', { p_room_id: roomId })
}

export async function submitAim(roomId: string, aimDegrees: number, force = false): Promise<{ ballId: string }> {
  const safeAngle = Number.isFinite(aimDegrees) ? normalizeAngle(aimDegrees) : Math.random() * 360
  return call<{ ballId: string }>('submit_aim', {
    p_room_id: roomId,
    p_aim_degrees: Number(safeAngle.toFixed(4)),
    p_force: force,
  })
}

export async function advanceBall(roomId: string, lastBallId: string): Promise<{ advanced: boolean }> {
  return call<{ advanced: boolean }>('advance_ball', {
    p_room_id: roomId,
    p_last_ball_id: lastBallId,
  })
}

export async function heartbeat(roomId: string): Promise<void> {
  if (!supabase) return
  const userId = await ensureAnonSession()
  if (!userId) return
  await supabase.rpc('heartbeat', { p_room_id: roomId })
}

export async function leaveRoom(roomId: string): Promise<{ deleted: boolean }> {
  return call<{ deleted: boolean }>('leave_room', { p_room_id: roomId })
}

export async function claimForfeit(roomId: string): Promise<void> {
  await call<null>('forfeit_room', { p_room_id: roomId })
}
