import type { RoomDTO } from '../types/game'
import { adminSupabase } from './supabase/adminClient'
import { supabase } from './supabase/client'
import { AppError } from './errors'

async function call<T>(name: string, params: Record<string, unknown> = {}): Promise<T> {
  if (!adminSupabase) throw new AppError('NOT_CONFIGURED')
  const { data, error } = await adminSupabase.rpc(name, params)
  if (error) throw toAppError(error)
  return data as T
}

function toAppError(error: unknown): AppError {
  const message = error && typeof error === 'object' && 'message' in error
    ? String((error as { message?: unknown }).message)
    : String(error)
  let code = 'UNKNOWN'
  if (message.includes('ADMIN_ACCESS_DENIED')) code = 'ADMIN_ACCESS_DENIED'
  return new AppError(code, message)
}

export interface DailyStat {
  date: string
  matches: number
  players: number
  hours: number
  runs: number
  wickets: number
}

export interface HourlyStat {
  hour: number
  matches: number
}

export interface OutcomeStat {
  key: string
  value: number
}

export interface TopPlayer {
  name: string
  matches: number
}

export interface DashboardStats {
  totalRooms: number
  roomsLive: number
  roomsLobby: number
  roomsFinished: number
  roomsAbandoned: number
  /** New in migration 0008; optional so the panel works before it is applied. */
  activePlayers?: number
  totalPlayers: number
  playersToday: number
  playersWeek: number
  playersMonth: number
  playersYear: number
  totalMatches: number
  matchesToday: number
  matchesWeek: number
  matchesMonth: number
  matchesYear: number
  matchesPrevWeek?: number
  playersPrevWeek?: number
  hoursPrevWeek?: number
  totalBalls: number
  totalRuns: number
  totalWickets: number
  totalSixes: number
  totalFours: number
  totalNoBalls: number
  totalWides: number
  totalHours: number
  hoursToday: number
  hoursWeek: number
  hoursMonth: number
  avgMatchMinutes?: number
  avgRunsPerMatch?: number
  avgBallsPerMatch?: number
  completionRate?: number
  rangeDays?: number
  series?: DailyStat[]
  hourly?: HourlyStat[]
  outcomes?: OutcomeStat[]
  topPlayers?: TopPlayer[]
  generatedAt: string
}

export interface AdminRoom {
  id: string
  code: string
  status: RoomDTO['status']
  phase: RoomDTO['phase']
  overs: number
  wickets: number
  playerCount: number
  lastActiveAt: string
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  winnerUserId: string | null
}

export interface AdminNotice {
  id: string
  title: string
  body: string
  type: 'info' | 'success' | 'warning' | 'error'
  isActive: boolean
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AdminSeoSetting {
  pagePath: string
  title: string | null
  description: string | null
  ogImage: string | null
  updatedAt: string
}

export interface AdminIdentity {
  isAdmin: boolean
  email: string | null
  /** Server-side error while checking admin status (e.g. migration missing). */
  error: string | null
}

// ── Auth (Supabase email + password) ────────────────────────────────────────

/** Sign the admin client in with email + password. Throws on bad credentials. */
export async function adminSignIn(email: string, password: string): Promise<void> {
  if (!adminSupabase) throw new AppError('NOT_CONFIGURED')
  const { error } = await adminSupabase.auth.signInWithPassword({ email, password })
  if (error) throw new AppError('AUTH_REQUIRED', error.message)
}

/** Sign out of the admin client only — never touches the player session. */
export async function adminSignOut(): Promise<void> {
  if (!adminSupabase) return
  await adminSupabase.auth.signOut({ scope: 'local' })
}

/**
 * Ask the server who the current admin client is. Returns `isAdmin: false`
 * when there is no session, so regular visitors never hit the RPC.
 */
export async function adminMe(): Promise<AdminIdentity> {
  if (!adminSupabase) {
    return { isAdmin: false, email: null, error: 'Supabase is not configured' }
  }

  const { data: sessionData } = await adminSupabase.auth.getSession()
  if (!sessionData.session) return { isAdmin: false, email: null, error: null }

  const sessionEmail = sessionData.session.user.email ?? null
  const { data, error } = await adminSupabase.rpc('admin_me')
  if (error) return { isAdmin: false, email: sessionEmail, error: error.message }

  const result = data as { isAdmin?: boolean; email?: string | null } | null
  return {
    isAdmin: Boolean(result?.isAdmin),
    email: result?.email ?? sessionEmail,
    error: null,
  }
}

// ── Data ────────────────────────────────────────────────────────────────────

export async function getDashboardStats(days = 30): Promise<DashboardStats> {
  try {
    return await call<DashboardStats>('admin_dashboard_stats', { p_days: days })
  } catch (error) {
    // The range-aware RPC ships with migration 0008. Until it is applied,
    // fall back to the original zero-argument function so the panel still works.
    if (error instanceof AppError && error.code === 'ADMIN_ACCESS_DENIED') throw error
    return call<DashboardStats>('admin_dashboard_stats')
  }
}

export async function getAllRooms(): Promise<AdminRoom[]> {
  return call<AdminRoom[]>('admin_rooms_all')
}

export async function getNotices(): Promise<AdminNotice[]> {
  return call<AdminNotice[]>('admin_notices_list')
}

export async function saveNotice(
  payload: {
    id?: string
    title: string
    body: string
    type: 'info' | 'success' | 'warning' | 'error'
    isActive: boolean
    expiresAt?: string | null
  },
): Promise<{ id: string }> {
  return call<{ id: string }>('admin_notice_save', {
    p_id: payload.id ?? null,
    p_title: payload.title,
    p_body: payload.body,
    p_type: payload.type,
    p_is_active: payload.isActive,
    p_expires_at: payload.expiresAt ?? null,
  })
}

export async function deleteNotice(id: string): Promise<void> {
  await call<null>('admin_notice_delete', { p_id: id })
}

export async function getSeoSettings(): Promise<AdminSeoSetting[]> {
  return call<AdminSeoSetting[]>('admin_seo_list')
}

export async function saveSeoSetting(
  payload: {
    pagePath: string
    title?: string | null
    description?: string | null
    ogImage?: string | null
  },
): Promise<void> {
  await call<null>('admin_seo_save', {
    p_page_path: payload.pagePath,
    p_title: payload.title ?? null,
    p_description: payload.description ?? null,
    p_og_image: payload.ogImage ?? null,
  })
}

export async function deleteSeoSetting(pagePath: string): Promise<void> {
  await call<null>('admin_seo_delete', { p_page_path: pagePath })
}

/**
 * Fetch active notices for the site banner. Uses the player client — the
 * `admin_notices` RLS policy lets any authenticated user read active rows.
 */
export async function fetchPublicNotices(): Promise<AdminNotice[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('admin_notices')
    .select('id, title, body, type, expires_at')
    .eq('is_active', true)
    .or('expires_at.is.null,expires_at.gt.now()')
    .order('created_at', { ascending: false })
  if (error) return []
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    type: row.type as 'info' | 'success' | 'warning' | 'error',
    isActive: true,
    expiresAt: row.expires_at ?? null,
    createdAt: '',
    updatedAt: '',
  }))
}
