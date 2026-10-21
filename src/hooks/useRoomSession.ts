import { useEffect, useRef, useState, useCallback } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { MatchSnapshot } from '../types/game'
import { peekRoom, getRoomSnapshot, heartbeat, type PeekRoom } from '../lib/supabase/api'
import { ensureAnonSession, supabase } from '../lib/supabase/client'
import { AppError, toAppError } from '../lib/errors'
import { SPIN } from '../config/gameConfig'

export interface RoomSession {
  snapshot: MatchSnapshot | null
  peek: PeekRoom | null
  userId: string | null
  opponentOnline: boolean
  presenceReady: boolean
  loading: boolean
  joining: boolean
  error: AppError | null
  refresh: () => Promise<void>
  reloadPeek: () => Promise<void>
  joinRefresh: (showSpinner?: boolean) => Promise<void>
  setJoining: (value: boolean) => void
}

export function useRoomSession(code: string | undefined): RoomSession {
  const [snapshot, setSnapshot] = useState<MatchSnapshot | null>(null)
  const [peek, setPeek] = useState<PeekRoom | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [opponentOnline, setOpponentOnline] = useState(false)
  const [presenceReady, setPresenceReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<AppError | null>(null)
  const refreshTimer = useRef<number | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const inFlight = useRef(false)
  const opponentId = userId
    ? snapshot?.players.find((player) => player.userId !== userId && !player.leftAt)?.userId ?? null
    : null

  const load = useCallback(async (showSpinner = false) => {
    if (!code || !supabase) return
    if (inFlight.current) return
    inFlight.current = true
    if (showSpinner) setLoading(true)
    try {
      const uid = await ensureAnonSession()
      setUserId(uid)
      const info = await peekRoom(code)
      setPeek(info)
      if (info.exists && info.isMember) {
        const data = await getRoomSnapshot(code)
        setSnapshot(data)
        setError(null)
      } else {
        setSnapshot(null)
        setError(null)
      }
    } catch (caught) {
      setError(toAppError(caught))
      setSnapshot(null)
    } finally {
      setLoading(false)
      inFlight.current = false
    }
  }, [code])

  const refresh = useCallback(async () => {
    if (!code || !supabase) return
    try {
      const data = await getRoomSnapshot(code)
      setSnapshot(data)
      setError(null)
    } catch (caught) {
      const appError = toAppError(caught)
      if (appError.code !== 'NETWORK') setError(appError)
    }
  }, [code])

  const reloadPeek = useCallback(async () => {
    if (!code || !supabase) return
    try {
      const info = await peekRoom(code)
      setPeek(info)
      if (info.isMember) {
        const data = await getRoomSnapshot(code)
        setSnapshot(data)
      } else {
        setSnapshot(null)
      }
      setError(null)
    } catch (caught) {
      setError(toAppError(caught))
    }
  }, [code])

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) window.clearTimeout(refreshTimer.current)
    refreshTimer.current = window.setTimeout(() => {
      void refresh()
    }, 90)
  }, [refresh])

  useEffect(() => {
    if (!code) {
      setError(new AppError('ROOM_NOT_FOUND'))
      setLoading(false)
      return
    }
    if (!supabase) {
      setError(new AppError('NOT_CONFIGURED'))
      setLoading(false)
      return
    }
    void load(true)
  }, [code, load])

  // Realtime: Postgres changes + presence. Restore on reconnect via refresh +
  // the polling safety net.
  useEffect(() => {
    const client = supabase
    if (!client || !snapshot?.room.id || !userId) return
    const roomId = snapshot.room.id
    const channel = client.channel(`room:${roomId}`, {
      config: { presence: { key: userId } },
    })
    channelRef.current = channel

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, scheduleRefresh)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
        scheduleRefresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'innings', filter: `room_id=eq.${roomId}` },
        scheduleRefresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'balls', filter: `room_id=eq.${roomId}` },
        scheduleRefresh,
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const ids = Object.values(state)
          .flat()
          .map((entry) => (entry as { userId?: string }).userId)
          .filter(Boolean)
        setOpponentOnline(Boolean(opponentId && ids.includes(opponentId)))
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setPresenceReady(true)
          void channel.track({ userId, onlineAt: new Date().toISOString() })
          void refresh()
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setPresenceReady(false)
          setOpponentOnline(false)
        }
      })

    return () => {
      setPresenceReady(false)
      setOpponentOnline(false)
      void channel.unsubscribe()
      if (channelRef.current === channel) channelRef.current = null
    }
  }, [snapshot?.room.id, opponentId, userId, scheduleRefresh, refresh])

  // Heartbeat keeps the server's 60s grace period honest, and the 30min
  // cleanup safety net from deleting an active match.
  useEffect(() => {
    if (!snapshot?.room.id || !userId) return
    const roomId = snapshot.room.id
    const beat = () => {
      void heartbeat(roomId).catch(() => undefined)
    }
    beat()
    const interval = window.setInterval(beat, SPIN.heartbeatMs)
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        beat()
        void refresh()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onVisible)
    }
  }, [snapshot?.room.id, userId, refresh])

  // A slow polling fallback covers sleeping sockets and flaky mobile connections.
  useEffect(() => {
    if (!snapshot?.room.id || !userId) return
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, 9000)
    return () => window.clearInterval(interval)
  }, [snapshot?.room.id, userId, refresh])

  useEffect(() => {
    return () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current)
    }
  }, [])

  return {
    snapshot,
    peek,
    userId,
    opponentOnline,
    presenceReady,
    loading,
    joining,
    error,
    refresh,
    reloadPeek,
    joinRefresh: load,
    setJoining,
  }
}
