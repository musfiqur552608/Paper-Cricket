import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Check,
  Clock3,
  Flame,
  Hand,
  Hourglass,
  Loader2,
  LogOut,
  PenLine,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Timer,
  WifiOff,
  Zap,
} from 'lucide-react'
import clsx from 'clsx'
import type { MatchSnapshot } from '../../types/game'
import type { TFunction } from 'i18next'
import { Board } from '../../components/board/Board'
import { Logo } from '../../components/ui/Logo'
import { LanguageToggle, SoundToggle } from '../../components/ui/Toggles'
import { LeaveConfirmDialog } from '../../components/ui/LeaveConfirmDialog'
import { PlayerAvatar } from '../../components/game/PlayerAvatar'
import { HoldPen } from './HoldPen'
import { OpaqueScreen } from './OpaqueScreen'
import { ConfettiBurst } from './ConfettiBurst'
import { InningsPanel, LiveScore } from './LiveScore'
import { InningsBreak } from './InningsBreak'
import { advanceBall, claimForfeit, setBatterReady, startSpin, submitAim } from '../../lib/supabase/api'
import { getMatchView } from '../../lib/matchView'
import { useServerClock, useSpinAnimation } from '../../hooks/useMatchTiming'
import { commentaryForBall } from '../../lib/commentary'
import { errorKey, toAppError } from '../../lib/errors'
import { notify } from '../../store/toast'
import { sound, haptic } from '../../lib/sound'
import { usePreferences } from '../../store/preferences'
import { SPIN } from '../../config/gameConfig'
import { formatOvers, normalizeAngle } from '../../lib/gameEngine'

interface MatchProps {
  snapshot: MatchSnapshot
  userId: string
  opponentOnline: boolean
  presenceReady: boolean
  refresh: () => Promise<void>
  onLeave: () => Promise<void>
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export function MatchPage({ snapshot, userId, opponentOnline, presenceReady, refresh, onLeave }: MatchProps) {
  const { t } = useTranslation()
  const reducedPref = usePreferences((state) => state.reducedMotion)
  const now = useServerClock(snapshot.serverNow)
  const view = getMatchView(snapshot, userId, now)
  const { room } = snapshot
  const [localSpin, setLocalSpin] = useState<{
    id: string
    durationMs: number
    seed: string
    startedAt: string
    endsAt: string
    aimDeadline: string
  } | null>(null)
  const [spinBusy, setSpinBusy] = useState(false)
  const [readyBusy, setReadyBusy] = useState(false)
  const [localReady, setLocalReady] = useState(false)
  const [aimAngle, setAimAngle] = useState(() => Math.random() * 360)
  const [sliding, setSliding] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [inningsBreakOpen, setInningsBreakOpen] = useState(false)
  const submittedRef = useRef<string | null>(null)
  const rescuedRef = useRef<string | null>(null)
  const spinSoundRef = useRef<string | null>(null)
  const revealSoundRef = useRef<string | null>(null)
  const advanceRef = useRef<string | null>(null)
  const spinIdRef = useRef<string | null>(null)

  const effectiveSpin = view.activeSpin ?? localSpin
  const spinEndsMs = effectiveSpin ? Date.parse(effectiveSpin.endsAt) : 0
  // The room stays in `spinning` on the server until an aim is submitted.
  // Every client (including one that reconnects mid-spin) must derive the
  // aiming phase from the shared end time instead of waiting for a phase write.
  let phase = view.phase
  if ((view.phase === 'ready' || view.phase === 'spinning') && effectiveSpin) {
    phase = now < spinEndsMs ? 'spinning' : 'aiming'
  }
  const screenPhase: 'spinning' | 'aiming' | null =
    phase === 'spinning' || phase === 'aiming' ? phase : null
  const revealedBall = view.phase === 'reveal' ? view.lastBall : null
  const screenVisible = Boolean(screenPhase && (view.activeSpin || localSpin))

  const spinRotation = useSpinAnimation(
    screenPhase === 'spinning',
    effectiveSpin?.durationMs ?? 3000,
    effectiveSpin?.seed ?? 'paper-cricket',
    reducedPref,
  )
  const boardRotation =
    revealedBall != null
      ? revealedBall.boardRotation
      : screenPhase
        ? spinRotation
        : view.lastBall?.boardRotation ?? 0

  const aimDeadlineMs = effectiveSpin?.aimDeadline ? Date.parse(effectiveSpin.aimDeadline) : 0
  const aimRemainingMs = aimDeadlineMs ? Math.max(0, aimDeadlineMs - now) : 0
  const spinProgress =
    effectiveSpin && screenPhase === 'spinning'
      ? Math.min(100, Math.max(0, ((now - Date.parse(effectiveSpin.startedAt)) / Math.max(1, effectiveSpin.durationMs)) * 100))
      : 0
  const isBatter = view.isBatter
  const isBowler = view.isBowler
  const batterReady = Boolean(room.batterReadyAt) || localReady
  const lastSeenAge = view.opponent ? Math.max(0, now - Date.parse(view.opponent.lastSeenAt)) : 0
  const showOffline =
    room.status === 'live' &&
    Boolean(view.opponent) &&
    !opponentOnline &&
    // Heartbeats arrive every 20s. Do not call someone disconnected between
    // two normal beats just because the presence socket blipped.
    lastSeenAge > (presenceReady ? 25_000 : 30_000)
  const graceSeconds = Math.max(0, Math.ceil((SPIN.presenceGraceMs - lastSeenAge) / 1000))
  // Leave a small buffer so the server's clock agrees when the button is tapped.
  const canClaim = showOffline && lastSeenAge >= SPIN.presenceGraceMs + 1200

  const commentary = revealedBall ? commentaryForBall(revealedBall, t) : ''
  // Presence can lag behind the heartbeat table (especially after a socket
  // reconnect). A fresh server heartbeat is a good second opinion.
  const opponentLooksOnline = Boolean(view.opponent && (opponentOnline || lastSeenAge < 45_000))
  const onlineText = view.opponent
    ? opponentLooksOnline
      ? view.opponent.name
      : t('match.opponentDropped', { name: view.opponent.name })
    : ''

  // Reset per-spin local state.
  useEffect(() => {
    const id = effectiveSpin?.id ?? null
    if (id && id !== spinIdRef.current) {
      spinIdRef.current = id
      submittedRef.current = null
      rescuedRef.current = null
      setAimAngle(Math.random() * 360)
      setSliding(false)
    }
    if (!id) {
      submittedRef.current = null
      setSliding(false)
    }
  }, [effectiveSpin?.id])

  useEffect(() => {
    if (room.phase !== 'ready') setLocalReady(false)
  }, [room.phase])

  useEffect(() => {
    if (!localSpin) return
    if (room.currentSpinId === localSpin.id || room.phase !== 'ready') {
      setLocalSpin(null)
    }
  }, [localSpin, room.currentSpinId, room.phase])

  useEffect(() => {
    if (!screenPhase || !effectiveSpin) return
    if (spinSoundRef.current === effectiveSpin.id) return
    spinSoundRef.current = effectiveSpin.id
    sound.spin(effectiveSpin.durationMs)
    haptic(12)
  }, [screenPhase, effectiveSpin])

  useEffect(() => {
    if (!revealedBall) return
    if (revealSoundRef.current === revealedBall.id) return
    revealSoundRef.current = revealedBall.id
    sound.reveal()
    const tick = window.setTimeout(() => {
      if (revealedBall.isWicket) {
        sound.wicket()
        haptic([35, 55, 120])
      } else if (revealedBall.outcome === '4' || revealedBall.outcome === '6') {
        sound.hit(Number(revealedBall.outcome))
        haptic([20, 35, 20])
      } else {
        sound.hit(revealedBall.runs)
      }
    }, 420)
    return () => window.clearTimeout(tick)
  }, [revealedBall])

  const handleSlide = useCallback(
    async (angle: number, auto = false) => {
      if (!isBatter || !effectiveSpin) return
      if (submittedRef.current === effectiveSpin.id) return
      submittedRef.current = effectiveSpin.id
      const safeAngle = normalizeAngle(Number.isFinite(angle) ? angle : Math.random() * 360)
      setAimAngle(safeAngle)
      setSliding(true)
      if (!auto) {
        sound.slide(SPIN.penSlideMs + 220)
        haptic(22)
      }
      // Let the pen reach the rim before the server result replaces the screen.
      if (!auto) await sleep(SPIN.penSlideMs)

      let lastError: unknown = null
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          await submitAim(room.id, safeAngle)
          await refresh()
          return
        } catch (caught) {
          lastError = caught
          const appError = toAppError(caught)
          if (appError.code === 'SPIN_NOT_FINISHED' && attempt === 0) {
            await sleep(450)
            continue
          }
          submittedRef.current = null
          setSliding(false)
          if (appError.code !== 'STALE_BALL' && appError.code !== 'WRONG_PHASE') {
            notify.error(t(errorKey(appError.code)))
          }
          await refresh()
          return
        }
      }
      submittedRef.current = null
      setSliding(false)
      if (lastError) notify.error(t(errorKey(toAppError(lastError).code)))
    },
    [effectiveSpin, isBatter, refresh, room.id, t],
  )

  // Batter timeout: send a random-ish angle; the server converts late aim to its
  // own secure random direction. Bowler rescues a disconnected batter after 1.5s.
  useEffect(() => {
    if (!effectiveSpin || screenPhase !== 'aiming') return
    const deadlineText = effectiveSpin.aimDeadline
    if (!deadlineText) return
    const deadline = Date.parse(deadlineText)
    if (!Number.isFinite(deadline)) return
    if (isBatter && now >= deadline && submittedRef.current !== effectiveSpin.id) {
      void handleSlide(aimAngle, true)
      return
    }
    if (isBowler && now >= deadline + 1500 && rescuedRef.current !== effectiveSpin.id) {
      rescuedRef.current = effectiveSpin.id
      void submitAim(room.id, 0, true)
        .then(() => refresh())
        .catch(async (caught) => {
          const appError = toAppError(caught)
          if (appError.code !== 'STALE_BALL' && appError.code !== 'WRONG_PHASE') {
            rescuedRef.current = null
            notify.error(t(errorKey(appError.code)))
          }
          await refresh()
        })
    }
  }, [aimAngle, effectiveSpin, handleSlide, isBatter, isBowler, now, refresh, room.id, screenPhase, t])

  const doAdvance = useCallback(async () => {
    if (!revealedBall || advancing) return
    if (advanceRef.current === revealedBall.id) return
    advanceRef.current = revealedBall.id
    setAdvancing(true)
    try {
      await advanceBall(room.id, revealedBall.id)
      await refresh()
    } catch (caught) {
      advanceRef.current = null
      const appError = toAppError(caught)
      if (appError.code !== 'STALE_BALL' && appError.code !== 'WRONG_PHASE') {
        notify.error(t(errorKey(appError.code)))
        // A transient network failure must not leave both players stuck on the
        // reveal card. Retry idempotently while the snapshot still shows it.
        window.setTimeout(() => void doAdvance(), 2200)
      }
      await refresh()
    } finally {
      setAdvancing(false)
    }
  }, [advancing, refresh, revealedBall, room.id, t])

  useEffect(() => {
    if (!revealedBall) return
    const timer = window.setTimeout(() => {
      void doAdvance()
    }, SPIN.revealHoldMs)
    return () => window.clearTimeout(timer)
    // We intentionally restart only for a new ball.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealedBall?.id])

  // Give the last-ball card a moment to land, then hand over to the 3-second
  // innings-break animation. The overlay calls doAdvance when it finishes.
  useEffect(() => {
    if (!revealedBall || room.pendingTransition !== 'innings') {
      setInningsBreakOpen(false)
      return
    }
    const timer = window.setTimeout(() => setInningsBreakOpen(true), 1000)
    return () => window.clearTimeout(timer)
  }, [revealedBall?.id, room.pendingTransition])

  async function markPenReady() {
    if (!isBatter || readyBusy || batterReady) return
    setReadyBusy(true)
    sound.penDown()
    haptic(12)
    try {
      await setBatterReady(room.id)
      setLocalReady(true)
      await refresh()
    } catch (caught) {
      notify.error(t(errorKey(toAppError(caught).code)))
      await refresh()
    } finally {
      setReadyBusy(false)
    }
  }

  async function spinNow() {
    if (!isBowler || spinBusy || !room.batterReadyAt) return
    setSpinBusy(true)
    try {
      const spin = await startSpin(room.id)
      setLocalSpin(spin)
      await refresh()
    } catch (caught) {
      notify.error(t(errorKey(toAppError(caught).code)))
      await refresh()
    } finally {
      setSpinBusy(false)
    }
  }

  async function forfeit() {
    if (claiming) return
    setClaiming(true)
    try {
      await claimForfeit(room.id)
      await refresh()
    } catch (caught) {
      notify.error(t(errorKey(toAppError(caught).code)))
      await refresh()
    } finally {
      setClaiming(false)
    }
  }

  const innings = view.innings
  const resultTitle = revealedBall ? outcomeTitle(revealedBall.outcome, revealedBall.isWicket, revealedBall.isFreeHit, t) : ''
  const dismissal = revealedBall && revealedBall.isWicket ? dismissalLabel(revealedBall.outcome, t) : null
  const pendingLabel =
    revealedBall && room.pendingTransition !== 'none'
      ? room.pendingTransition === 'innings'
        ? t('match.endInnings')
        : room.pendingTransition === 'super_over'
          ? t('match.superOverNext')
          : t('match.endMatch')
      : revealedBall?.outcome === 'N'
        ? t('match.freeHitNext')
        : null

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-[#d8c7a2]/60 bg-paper-50/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-3 sm:px-5">
          <div className="hidden min-[410px]:block">
            <Logo compact link={false} />
          </div>
          <div className="min-[410px]:hidden">
            <Logo compact link={false} className="[&>span:last-child]:hidden" />
          </div>
          <div className="hidden h-6 w-px bg-ink/10 min-[520px]:block" />
          <div className="hidden items-center gap-1.5 min-[520px]:flex">
            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">{t('common.room')}</span>
            <span className="rounded-md border border-[#d8c7a2] bg-white/65 px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-[0.16em] text-ink">
              {room.code}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-leaf/20 bg-leaf/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-leaf">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-leaf" /> {t('common.live')}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <LanguageToggle compact />
            <SoundToggle />
            <button
              type="button"
              onClick={() => setLeaveOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-full border border-[#d3c2a0] bg-paper-50/80 text-slate-500 transition hover:bg-white hover:text-pencil"
              aria-label={t('match.leaveMatch')}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-3 pb-8 pt-3 sm:px-5">
        <AnimatePresence>
          {showOffline ? (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-2.5 flex flex-col gap-2 rounded-xl border border-amber-300/70 bg-amber-50/90 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-2 text-[12px] text-amber-900">
                <WifiOff size={15} className="shrink-0" />
                <span>
                  {t('match.opponentDropped', { name: view.opponent?.name ?? '' })}
                  {graceSeconds > 0 ? (
                    <span className="ml-1 font-semibold">· {t('match.graceCountdown', { seconds: graceSeconds })}</span>
                  ) : (
                    <span className="ml-1 font-semibold">· {t('match.claimWinBody')}</span>
                  )}
                </span>
              </div>
              {canClaim ? (
                <button type="button" className="btn-pencil btn-sm self-start sm:self-auto" onClick={() => void forfeit()} disabled={claiming}>
                  {claiming ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                  {t('match.claimWin')}
                </button>
              ) : (
                <span className="flex items-center gap-1 self-start text-[10px] font-medium text-amber-700 sm:self-auto">
                  <Clock3 size={11} /> {t('match.waitingReconnect')}
                </span>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-start lg:gap-5">
          <div className="min-w-0">
            <LiveScore snapshot={snapshot} view={view} />

            <div className="relative mx-auto mt-3 w-full max-w-[540px]">
              {/* faint chalk marks behind the board */}
              <div className="pointer-events-none absolute inset-0 -z-10 scale-110 rounded-full bg-[#e9dcc0]/40 blur-2xl" />
              <div
                key={revealedBall?.isWicket ? `shake-${revealedBall.id}` : 'board'}
                className={clsx('relative', revealedBall?.isWicket && phase === 'reveal' && 'animate-shake')}
              >
                <Board
                  rotation={boardRotation}
                  highlightIndex={revealedBall?.segmentIndex ?? null}
                  aimAngle={revealedBall?.aimDegrees ?? null}
                  aimActive={false}
                  penAtEnd={Boolean(revealedBall)}
                  revealed={Boolean(revealedBall)}
                  compact
                />
              </div>

              {phase === 'ready' && isBatter ? (
                <HoldPen ready={batterReady} disabled={!isBatter || readyBusy} onReady={() => void markPenReady()} />
              ) : null}

              {phase === 'ready' && !isBatter && view.opponent ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-[5%] z-20 flex justify-center">
                  <span className="rounded-full border border-ink/15 bg-paper-50/90 px-3 py-1.5 text-[10px] font-semibold text-slate-500 shadow-sm backdrop-blur">
                    {batterReady ? t('match.spinTitle') : t('match.waitingForBatter')}
                  </span>
                </div>
              ) : null}

              <OpaqueScreen
                visible={screenVisible}
                phase={screenPhase ?? 'aiming'}
                interactive={Boolean(isBatter && screenPhase === 'aiming' && !sliding)}
                showAim={Boolean(isBatter && screenPhase === 'aiming')}
                aimAngle={aimAngle}
                onAim={setAimAngle}
                onSubmit={(angle) => void handleSlide(angle)}
                sliding={sliding}
                remainingMs={aimRemainingMs}
                spinDurationMs={effectiveSpin?.durationMs ?? 3000}
                reducedMotion={reducedPref}
                spinningText={effectiveSpin && now < spinEndsMs ? t('match.spinning') : undefined}
              />

              {phase === 'reveal' && revealedBall ? (
                <>
                  {revealedBall.outcome === '6' ? <ConfettiBurst burstKey={revealedBall.id} /> : null}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.7, rotate: -8 }}
                    animate={{ opacity: 1, scale: 1, rotate: -2 }}
                    transition={{ delay: 0.45, type: 'spring', stiffness: 240, damping: 18 }}
                    className={clsx(
                      'pointer-events-none absolute right-[4%] top-[10%] z-40 rotate-[-5deg] rounded-lg border-2 px-3 py-1.5 shadow-lg',
                      revealedBall.isWicket
                        ? 'border-pencil/50 bg-[#fff2ef] text-pencil'
                        : revealedBall.outcome === '4' || revealedBall.outcome === '6'
                          ? 'border-ink/30 bg-[#eef4ff] text-ink-deep'
                          : 'border-[#c9ad6c] bg-[#fff7dd] text-[#825d18]',
                    )}
                  >
                    <p className="font-hand text-[30px] font-bold leading-none">
                      {revealedBall.isFreeHit && !revealedBall.isWicket && ['CO', 'LBW', 'RO', 'BO'].includes(revealedBall.outcome)
                        ? t('match.safe')
                        : revealedBall.isWicket
                          ? t('match.stampOut')
                          : revealedBall.outcome === 'W'
                            ? t('match.stampWide')
                            : revealedBall.outcome === 'N'
                              ? t('match.stampNoBall')
                              : `${revealedBall.outcome}${revealedBall.outcome === '4' || revealedBall.outcome === '6' ? '!' : ''}`}
                    </p>
                  </motion.div>
                </>
              ) : null}
            </div>

            {/* Control card */}
            <section className="paper-card relative z-10 mx-auto mt-3 w-full max-w-[540px] overflow-hidden rounded-2xl">
              <div className="flex items-center justify-between gap-2 border-b border-dashed border-ink/12 px-3.5 py-2">
                <span className="flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  <span className={clsx('grid h-5 w-5 place-items-center rounded-full text-[9px]', isBatter ? 'bg-pencil/10 text-pencil' : 'bg-ink/10 text-ink')}>
                    {isBatter ? t('match.batterInitial') : t('match.bowlerInitial')}
                  </span>
                  {isBatter ? t('match.youBat') : t('match.youBowl')}
                  <span className="text-slate-300">·</span>
                  <span className="normal-case tracking-normal text-slate-500">
                    {view.strikerName ?? view.battingPlayer?.teamName}
                  </span>
                </span>
                <div className="flex items-center gap-1.5">
                  {innings ? (
                    <span className="text-[9.5px] font-semibold text-slate-400">
                      {t('match.legalBall', { over: Math.floor(innings.legalBalls / 6) + 1, n: (innings.legalBalls % 6) + 1 })}
                    </span>
                  ) : null}
                  {innings?.nextIsFreeHit ? (
                    <span className="inline-flex items-center gap-0.5 rounded bg-pencil/10 px-1.5 py-0.5 text-[8.5px] font-bold uppercase text-pencil">
                      <Zap size={9} /> {t('match.freeHitShort')}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="px-3.5 py-3.5">
                {phase === 'ready' ? (
                  <ReadyControls
                    isBatter={isBatter}
                    batterReady={batterReady}
                    readyBusy={readyBusy}
                    spinBusy={spinBusy}
                    canSpin={Boolean(isBowler && room.batterReadyAt && !spinBusy)}
                    onSpin={() => void spinNow()}
                    striker={view.strikerName}
                  />
                ) : null}

                {screenPhase === 'spinning' ? (
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-ink/10 text-ink">
                          <RotateCw size={18} className={reducedPref ? '' : 'animate-spin'} />
                        </span>
                        <div>
                          <p className="font-hand text-[25px] font-bold leading-none text-ink-deep">{t('match.spinning')}</p>
                          <p className="text-[10.5px] text-slate-500">{t('match.screenOn')}</p>
                        </div>
                      </div>
                      <span className="font-mono text-[11px] font-semibold text-slate-400">{Math.round(spinProgress)}%</span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/10">
                      <div className="h-full rounded-full bg-ink transition-[width] duration-200" style={{ width: `${spinProgress}%` }} />
                    </div>
                    <p className="mt-2 text-[10.5px] leading-relaxed text-slate-400">{t('match.handsOff')}</p>
                  </div>
                ) : null}

                {screenPhase === 'aiming' ? (
                  <AimControls
                    isBatter={isBatter}
                    sliding={sliding}
                    seconds={Math.ceil(aimRemainingMs / 1000)}
                    onSlide={() => void handleSlide(aimAngle)}
                    expired={aimRemainingMs <= 0}
                    isBowler={isBowler}
                  />
                ) : null}

                {phase === 'reveal' && revealedBall ? (
                  <div aria-live="polite" aria-atomic="true">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p
                          className={clsx(
                            'font-hand text-[34px] font-bold leading-none',
                            revealedBall.isWicket ? 'text-pencil' : 'text-ink-deep',
                          )}
                        >
                          {revealedBall.isFreeHit && !revealedBall.isWicket && !['W', 'N'].includes(revealedBall.outcome)
                            ? t('match.resultFreeHitSaved')
                            : dismissal
                              ? `${t('match.resultWicket')} ${dismissal}`
                              : resultTitle}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 font-hand text-[18px] leading-tight text-slate-500">
                          <span className="text-pencil">✎</span> {commentary}
                        </p>
                      </div>
                      <span
                        className={clsx(
                          'shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                          revealedBall.isWicket
                            ? 'border-pencil/30 bg-pencil/10 text-pencil'
                            : 'border-ink/15 bg-ink/5 text-ink',
                        )}
                      >
                        {revealedBall.outcome === 'W' || revealedBall.outcome === 'N'
                          ? revealedBall.outcome === 'W'
                            ? `+1 ${t('score.wide')}`
                            : `+1 ${t('score.noBall')}`
                          : revealedBall.runs > 0
                            ? `+${revealedBall.runs}`
                            : revealedBall.isWicket
                              ? t('score.out')
                              : revealedBall.isFreeHit && ['CO', 'LBW', 'RO', 'BO'].includes(revealedBall.outcome)
                                ? t('match.safe')
                                : '0'}
                      </span>
                    </div>

                    {pendingLabel ? (
                      <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-ink/[0.055] px-2.5 py-1.5 text-[10.5px] font-semibold text-ink/70">
                        <Sparkles size={12} className="text-marigold" /> {pendingLabel}
                      </div>
                    ) : null}

                    <div className="mt-3 flex items-center gap-2">
                      <button type="button" className="btn-primary flex-1" onClick={() => void doAdvance()} disabled={advancing}>
                        {advancing ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={16} />}
                        {t('match.continue')}
                      </button>
                      <span className="flex items-center gap-1 text-[9.5px] text-slate-400">
                        <Timer size={11} /> {t('match.nextBall')}
                      </span>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink/10">
                      <motion.div
                        className="h-full bg-ink/50"
                        initial={{ width: '100%' }}
                        animate={{ width: '0%' }}
                        transition={{ duration: SPIN.revealHoldMs / 1000, ease: 'linear' }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            <div className="mx-auto mt-3 w-full max-w-[540px] lg:hidden">
              <InningsPanel snapshot={snapshot} view={view} userId={userId} />
            </div>
          </div>

          <aside className="hidden space-y-3 lg:block">
            <InningsPanel snapshot={snapshot} view={view} userId={userId} />
            <MatchSideInfo
              snapshot={snapshot}
              view={view}
              onlineText={onlineText}
              opponentOnline={opponentLooksOnline}
            />
          </aside>
        </div>
      </main>

      <LeaveConfirmDialog
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        onLeave={onLeave}
        title={t('match.leaveTitle')}
        body={t('match.leaveBody')}
        leavingLabel={t('match.leaveConfirm')}
      />

      <InningsBreak
        open={inningsBreakOpen}
        teamName={view.battingPlayer?.teamName ?? ''}
        runs={view.innings?.runs ?? 0}
        wickets={view.innings?.wickets ?? 0}
        overs={formatOvers(view.innings?.legalBalls ?? 0)}
        target={room.target ?? null}
        onDone={() => void doAdvance()}
      />
    </div>
  )
}

function outcomeTitle(outcome: string, isWicket: boolean, isFreeHit: boolean, t: TFunction): string {
  if (isWicket) return t('match.resultWicket')
  if (isFreeHit && ['CO', 'LBW', 'RO', 'BO'].includes(outcome)) return t('match.resultFreeHitSaved')
  switch (outcome) {
    case 'W':
      return t('match.resultWide')
    case 'N':
      return t('match.resultNoBall')
    case 'CO':
      return t('match.resultCaught')
    case 'LBW':
      return t('match.resultLbw')
    case 'RO':
      return t('match.resultRunOut')
    case 'BO':
      return t('match.resultBowled')
    default:
      return t('match.resultRuns', { runs: outcome })
  }
}

function dismissalLabel(outcome: string, t: TFunction): string | null {
  switch (outcome) {
    case 'CO':
      return t('match.resultCaught')
    case 'LBW':
      return t('match.resultLbw')
    case 'RO':
      return t('match.resultRunOut')
    case 'BO':
      return t('match.resultBowled')
    default:
      return null
  }
}

function ReadyControls({
  isBatter,
  batterReady,
  readyBusy,
  spinBusy,
  canSpin,
  onSpin,
  striker,
}: {
  isBatter: boolean
  batterReady: boolean
  readyBusy: boolean
  spinBusy: boolean
  canSpin: boolean
  onSpin: () => void
  striker: string | null
}) {
  const { t } = useTranslation()
  if (isBatter) {
    return (
      <div className="flex items-start gap-3">
        <span
          className={clsx(
            'grid h-11 w-11 shrink-0 place-items-center rounded-full',
            batterReady ? 'bg-leaf/10 text-leaf' : 'bg-pencil/10 text-pencil',
          )}
        >
          {readyBusy ? <Loader2 size={20} className="animate-spin" /> : batterReady ? <Check size={21} /> : <Hand size={20} />}
        </span>
        <div>
          <p className="font-hand text-[26px] font-bold leading-none text-ink-deep">
            {batterReady ? t('match.penReady') : t('match.penDownTitle')}
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-slate-500">
            {batterReady ? t('match.waitingOpponent') : t('match.penDownBody')}
          </p>
          {!batterReady ? (
            <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-ink/[0.055] px-2 py-0.5 text-[10px] text-slate-500">
              <PenLine size={11} /> {t('match.tapToReady')}
            </p>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className={clsx('grid h-11 w-11 shrink-0 place-items-center rounded-full', canSpin ? 'bg-ink/10 text-ink' : 'bg-slate-100 text-slate-400')}>
          {batterReady ? <RotateCw size={20} /> : <Hourglass size={19} />}
        </span>
        <div>
          <p className="font-hand text-[26px] font-bold leading-none text-ink-deep">
            {batterReady ? t('match.spinTitle') : t('match.waitingForBatter')}
          </p>
          <p className="mt-1 max-w-[330px] text-[11.5px] leading-relaxed text-slate-500">
            {batterReady ? t('match.spinBody') : t('match.penDownBody')}
          </p>
          {batterReady && striker ? (
            <p className="mt-1 text-[9.5px] text-slate-400">
              {t('match.batter')}: <span className="font-semibold text-slate-600">{striker}</span>
            </p>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={onSpin}
        disabled={!canSpin}
        className="btn-pencil btn-lg shrink-0 sm:min-w-[140px]"
      >
        {spinBusy ? <Loader2 size={18} className="animate-spin" /> : <RotateCw size={18} />}
        {spinBusy ? t('match.spinning') : t('match.spinButton')}
      </button>
    </div>
  )
}

function AimControls({
  isBatter,
  sliding,
  seconds,
  onSlide,
  expired,
  isBowler,
}: {
  isBatter: boolean
  sliding: boolean
  seconds: number
  onSlide: () => void
  expired: boolean
  isBowler: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className={clsx('grid h-11 w-11 shrink-0 place-items-center rounded-full', isBatter ? 'bg-pencil/10 text-pencil' : 'bg-ink/10 text-ink')}>
          {isBatter ? <PenLine size={20} /> : <Hourglass size={19} />}
        </span>
        <div>
          <p className="font-hand text-[26px] font-bold leading-none text-ink-deep">
            {isBatter ? (sliding ? t('match.reveal') : t('match.aimTitle')) : t('match.waitingAim')}
          </p>
          <p className="mt-1 max-w-[310px] text-[11.5px] leading-relaxed text-slate-500">
            {isBatter ? t('match.aimBody') : expired ? t('match.autoAim') : t('match.notYourTurn')}
          </p>
        </div>
      </div>
      {isBatter ? (
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <span
            className={clsx(
              'flex h-12 w-12 items-center justify-center rounded-full border-2 font-mono text-sm font-bold',
              seconds <= 3 ? 'animate-pulse border-pencil text-pencil' : 'border-ink/25 text-ink',
            )}
          >
            {seconds}
          </span>
          <span className="text-[8.5px] font-bold uppercase tracking-wide text-slate-400">{t('common.seconds')}</span>
          {!sliding ? (
            <button type="button" className="btn-pencil btn-sm mt-0.5" onClick={onSlide}>
              <PenLine size={12} /> {t('match.slideButton')}
            </button>
          ) : null}
        </div>
      ) : isBowler ? (
        <span className="flex items-center gap-1 rounded-full bg-ink/[0.055] px-2.5 py-1.5 text-[10px] font-medium text-slate-500">
          <Timer size={12} /> {t('match.secondsLeft', { seconds })}
        </span>
      ) : null}
    </div>
  )
}

function MatchSideInfo({
  snapshot,
  view,
  onlineText,
  opponentOnline,
}: {
  snapshot: MatchSnapshot
  view: ReturnType<typeof getMatchView>
  onlineText: string
  opponentOnline: boolean
}) {
  const { t } = useTranslation()
  const innings = view.innings
  return (
    <div className="paper-card rounded-2xl p-3.5">
      <div className="flex items-center gap-2">
        <PlayerAvatar name={view.opponent?.name ?? '?'} slot={view.opponent?.slot ?? 2} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-[11.5px] font-semibold text-slate-700">{onlineText}</p>
          <p className="text-[9px] text-slate-400">
            {opponentOnline ? t('lobby.online') : t('lobby.offline')} · {view.opponent?.teamName}
          </p>
        </div>
        <span className={clsx('ml-auto h-2 w-2 rounded-full', opponentOnline ? 'bg-leaf' : 'bg-slate-300')} />
      </div>
      <div className="my-3 border-t border-dashed border-ink/12" />
      <div className="grid grid-cols-2 gap-1.5">
        <div className="stat-box">
          <p className="text-[8.5px] uppercase tracking-wide text-slate-400">{t('common.overs')}</p>
          <p className="font-hand text-xl font-bold leading-tight text-ink-deep">{innings ? formatOvers(innings.legalBalls) : '0.0'}</p>
        </div>
        <div className="stat-box">
          <p className="text-[8.5px] uppercase tracking-wide text-slate-400">{t('common.superOver')}</p>
          <p className="font-hand text-xl font-bold leading-tight text-ink-deep">
            {snapshot.room.superOver ? t('common.on') : t('common.off')}
          </p>
        </div>
        <div className="stat-box">
          <p className="text-[8.5px] uppercase tracking-wide text-slate-400">{t('common.freeHit')}</p>
          <p className="font-hand text-xl font-bold leading-tight text-pencil">
            {innings?.nextIsFreeHit ? t('common.yes') : '—'}
          </p>
        </div>
        <div className="stat-box">
          <p className="text-[8.5px] uppercase tracking-wide text-slate-400">{t('common.extras')}</p>
          <p className="font-hand text-xl font-bold leading-tight text-ink-deep">{innings?.extras ?? 0}</p>
        </div>
      </div>
      <p className="mt-3 flex items-center gap-1 text-[9px] leading-snug text-slate-400">
        <Flame size={10} className="text-marigold" />
        {t('match.freezeNote')}
      </p>
    </div>
  )
}
