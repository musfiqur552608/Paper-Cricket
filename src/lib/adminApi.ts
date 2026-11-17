import type { RoomDTO } from '../types/game'
import { supabase } from './supabase/client'
import { AppError } from './errors'

async function call<T>(name: string, params: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new AppError('NOT_CONFIGURED')
  const { data, error } = await supabase.rpc(name, params)
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

export interface DashboardStats {
  totalRooms: number
  roomsLive: number
  roomsLobby: number
  roomsFinished: number
  roomsAbandoned: number
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

export async function getDashboardStats(secret: string): Promise<DashboardStats> {
  return call<DashboardStats>('admin_dashboard_stats', { p_secret: secret })
}

export async function getAllRooms(secret: string): Promise<AdminRoom[]> {
  return call<AdminRoom[]>('admin_rooms_all', { p_secret: secret })
}

export async function getNotices(secret: string): Promise<AdminNotice[]> {
  return call<AdminNotice[]>('admin_notices_list', { p_secret: secret })
}

export async function saveNotice(
  secret: string,
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
    p_secret: secret,
    p_id: payload.id ?? null,
    p_title: payload.title,
    p_body: payload.body,
    p_type: payload.type,
    p_is_active: payload.isActive,
    p_expires_at: payload.expiresAt ?? null,
  })
}

export async function deleteNotice(secret: string, id: string): Promise<void> {
  await call<null>('admin_notice_delete', { p_secret: secret, p_id: id })
}

export async function getSeoSettings(secret: string): Promise<AdminSeoSetting[]> {
  return call<AdminSeoSetting[]>('admin_seo_list', { p_secret: secret })
}

export async function saveSeoSetting(
  secret: string,
  payload: {
    pagePath: string
    title?: string | null
    description?: string | null
    ogImage?: string | null
  },
): Promise<void> {
  await call<null>('admin_seo_save', {
    p_secret: secret,
    p_page_path: payload.pagePath,
    p_title: payload.title ?? null,
    p_description: payload.description ?? null,
    p_og_image: payload.ogImage ?? null,
  })
}

/**
 * Fetch active notices to display as a site banner for all users.
 * No secret needed — the RPC is security-definer but only SELECTs active rows.
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
