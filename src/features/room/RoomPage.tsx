import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useBlocker, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { AppHeader } from '../../components/ui/AppHeader'
import { Dialog } from '../../components/ui/Dialog'
import { ErrorSheet, LoadingSheet, SetupRequiredSheet } from '../../components/ui/Feedback'
import { JoinGate } from '../lobby/JoinGate'
import { LobbyPage } from '../lobby/LobbyPage'
import { MatchPage } from '../match/MatchPage'
import { ResultPage } from '../result/ResultPage'
import { useRoomSession } from '../../hooks/useRoomSession'
import { IS_SUPABASE_CONFIGURED } from '../../config/gameConfig'
import { leaveRoom } from '../../lib/supabase/api'
import { errorKey, toAppError } from '../../lib/errors'
import { notify } from '../../store/toast'
import type { JoinResult } from '../../types/game'

export function RoomPage() {
  const { t } = useTranslation()
  const { code: rawCode } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { snapshot, peek, userId, opponentOnline, presenceReady, loading, closed, error, refresh, reloadPeek, joinRefresh, setJoining } =
    useRoomSession(rawCode)
  const [leaving, setLeaving] = useState(false)
  const allowExitRef = useRef(false)

  const code = rawCode?.toUpperCase() ?? ''
  const hasRoom = Boolean(snapshot?.room.id)

  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }: { currentLocation: { pathname: string }; nextLocation: { pathname: string } }) =>
        hasRoom && !allowExitRef.current && currentLocation.pathname !== nextLocation.pathname,
      [hasRoom],
    ),
  )

  useEffect(() => {
    document.title = snapshot?.room.code
      ? `${t('common.appName')} · ${snapshot.room.code}`
      : `${t('common.appName')} · ${t('common.bengaliName')}`
  }, [snapshot?.room.code, t])

  useEffect(() => {
    const status = snapshot?.room.status
    if (!status || status === 'lobby') return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [snapshot?.room.status])

  async function handleJoined(_result: JoinResult) {
    setJoining(true)
    try {
      await joinRefresh(true)
    } finally {
      setJoining(false)
    }
  }

  async function leaveAndMaybeNavigate(goHome: boolean): Promise<boolean> {
    if (leaving) return false
    setLeaving(true)
    try {
      if (snapshot?.room.id) await leaveRoom(snapshot.room.id)
      allowExitRef.current = true
      if (goHome) navigate('/', { replace: true })
      return true
    } catch (caught) {
      notify.error(t(errorKey(toAppError(caught).code)))
      return false
    } finally {
      setLeaving(false)
    }
  }

  async function handleLeave(): Promise<void> {
    await leaveAndMaybeNavigate(true)
  }

  async function confirmBlockedLeave() {
    if (blocker.state !== 'blocked') return
    const ok = await leaveAndMaybeNavigate(false)
    if (ok) blocker.proceed()
  }

  const blockedDialog = (
    <Dialog
      open={blocker.state === 'blocked'}
      onClose={() => blocker.state === 'blocked' && blocker.reset()}
      title={t('roomLeave.title')}
      eyebrow={t('roomLeave.eyebrow')}
      size="sm"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" className="btn-paper flex-1" onClick={() => blocker.state === 'blocked' && blocker.reset()}>
            {t('roomLeave.stay')}
          </button>
          <button
            type="button"
            className="btn-primary flex-1"
            disabled={leaving}
            onClick={() => void confirmBlockedLeave()}
          >
            {leaving ? t('common.loading') : t('roomLeave.confirm')}
          </button>
        </div>
      }
    >
      <div className="flex gap-3">
        <AlertTriangle size={20} className="mt-0.5 shrink-0 text-pencil" />
        <p className="text-[13px] leading-relaxed text-slate-600">{t('roomLeave.body')}</p>
      </div>
    </Dialog>
  )

  if (!IS_SUPABASE_CONFIGURED) {
    return (
      <div className="min-h-dvh">
        <AppHeader />
        <SetupRequiredSheet />
      </div>
    )
  }

  if (!rawCode || code.length !== 6) {
    return (
      <div className="min-h-dvh">
        <AppHeader />
        <ErrorSheet title={t('errors.roomNotFound')} body={t('errors.roomNotFound')} />
      </div>
    )
  }

  if (loading && !snapshot && !peek) {
    return (
      <div className="min-h-dvh">
        <AppHeader />
        <LoadingSheet />
      </div>
    )
  }

  if (error) {
    const errorBody = t(errorKey(error.code))
    if (error.code === 'NETWORK') {
      return (
        <div className="min-h-dvh">
          <AppHeader />
          <ErrorSheet title={t('errors.network')} body={error.message} onRetry={() => void refresh()} />
        </div>
      )
    }
    return (
      <div className="min-h-dvh">
        <AppHeader />
        <ErrorSheet
          title={t(errorKey(error.code))}
          body={errorBody}
          onRetry={() => void reloadPeek()}
        />
      </div>
    )
  }

  if (closed) {
    return (
      <div className="min-h-dvh">
        <AppHeader />
        <ErrorSheet title={t('errors.roomClosedTitle')} body={t('errors.roomClosedBody')} />
      </div>
    )
  }

  if (snapshot && userId) {
    if (snapshot.room.status === 'lobby') {
      return (
        <>
          <LobbyPage
            snapshot={snapshot}
            userId={userId}
            opponentOnline={opponentOnline}
            presenceReady={presenceReady}
            refresh={refresh}
            onLeave={handleLeave}
          />
          {blockedDialog}
        </>
      )
    }

    if (snapshot.room.status === 'live') {
      return (
        <>
          <MatchPage
            snapshot={snapshot}
            userId={userId}
            opponentOnline={opponentOnline}
            presenceReady={presenceReady}
            refresh={refresh}
            onLeave={handleLeave}
          />
          {blockedDialog}
        </>
      )
    }

    return (
      <>
        <ResultPage snapshot={snapshot} userId={userId} onLeave={handleLeave} />
        {blockedDialog}
      </>
    )
  }

  if (peek) {
    if (!peek.exists) {
      return (
        <div className="min-h-dvh">
          <AppHeader />
          <ErrorSheet title={t('errors.roomNotFound')} body={t('errors.roomNotFound')} />
        </div>
      )
    }

    if (peek.isMember) {
      return (
        <div className="min-h-dvh">
          <AppHeader />
          <LoadingSheet />
        </div>
      )
    }

    if (peek.status === 'lobby' && peek.playerCount < 2) {
      return <JoinGate peek={peek} onJoined={handleJoined} />
    }

    if (peek.status === 'lobby') {
      return (
        <div className="min-h-dvh">
          <AppHeader />
          <ErrorSheet title={t('errors.roomFull')} body={t('join.fullBody')} />
        </div>
      )
    }

    return (
      <div className="min-h-dvh">
        <AppHeader />
        <ErrorSheet title={t('join.closed')} body={t('join.closedBody')} />
      </div>
    )
  }

  return (
    <div className="min-h-dvh">
      <AppHeader />
      <LoadingSheet />
    </div>
  )
}
