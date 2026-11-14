import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MatchActions } from '../lib/matchActions'
import type { ActiveSpin, MatchSnapshot, StopSpinResult } from '../types/game'
import { AppError } from '../lib/errors'
import { getMatchView } from '../lib/matchView'
import { botDelayMs, planBotAim } from '../lib/botEngine'
import {
  SOLO_CPU_ID,
  SOLO_HUMAN_ID,
  advanceSoloBall,
  createSoloSnapshot,
  markSoloBatterReady,
  resolveSoloBall,
  startSoloSpin,
  stopSoloSpin,
  type SoloConfig,
  type SoloSpin,
} from '../lib/soloEngine'

export interface SoloMatchController {
  snapshot: MatchSnapshot
  actions: MatchActions
}

/**
 * Drives a whole local match. Human taps arrive through `actions`; bot turns
 * are scheduled from snapshot changes with human-length pauses.
 */
export function useSoloMatch(config: SoloConfig): SoloMatchController {
  const [snapshot, setSnapshot] = useState<MatchSnapshot>(() => createSoloSnapshot(config))
  const stateRef = useRef(snapshot)
  const spinRef = useRef<SoloSpin | null>(null)
  const timersRef = useRef<Set<number>>(new Set())

  const commit = useCallback((next: MatchSnapshot) => {
    stateRef.current = next
    setSnapshot(next)
  }, [])

  const schedule = useCallback((callback: () => void, delayMs: number) => {
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer)
      callback()
    }, delayMs)
    timersRef.current.add(timer)
    return timer
  }, [])

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const timer of timers) window.clearTimeout(timer)
      timers.clear()
    }
  }, [])

  const setBatterReady = useCallback(async () => {
    const current = stateRef.current
    commit(markSoloBatterReady(current))
  }, [commit])

  const startSpin = useCallback(async (): Promise<ActiveSpin> => {
    const current = stateRef.current
    const started = startSoloSpin(current, Date.now(), {
      durationMs: 2400 + Math.floor(Math.random() * 1400),
      fallbackRotation: Math.random() * 360,
    })
    spinRef.current = started.spin
    commit(started.snapshot)

    const { room } = started.snapshot
    if (!room.spinStartedAt || !room.spinEndsAt || !room.aimDeadline) {
      throw new AppError('WRONG_PHASE')
    }
    return {
      id: started.spin.id,
      durationMs: started.spin.durationMs,
      seed: started.spin.seed,
      startedAt: room.spinStartedAt,
      endsAt: room.spinEndsAt,
      aimDeadline: room.aimDeadline,
    }
  }, [commit])

  const stopSpin = useCallback(async (rotation: number): Promise<StopSpinResult> => {
    const current = stateRef.current
    const spin = spinRef.current
    if (!spin) throw new AppError('WRONG_PHASE')
    const stopped = stopSoloSpin(current, spin, rotation, Date.now())
    spinRef.current = stopped.spin
    commit(stopped.snapshot)
    return stopped.result
  }, [commit])

  const submitAim = useCallback(async (aimDegrees: number, force = false): Promise<{ ballId: string }> => {
    const current = stateRef.current
    const spin = spinRef.current
    const { room } = current
    if (room.status !== 'live' || !spin || room.currentSpinId !== spin.id) {
      throw new AppError('WRONG_PHASE')
    }

    const now = Date.now()
    const endsAt = room.spinEndsAt ? Date.parse(room.spinEndsAt) : 0
    if (Number.isFinite(endsAt) && now < endsAt) throw new AppError('SPIN_NOT_FINISHED')

    const deadline = room.aimDeadline ? Date.parse(room.aimDeadline) : 0
    const late = Number.isFinite(deadline) && deadline > 0 && now > deadline
    if (force && !late) throw new AppError('AIM_CLOSED')

    const resolved = resolveSoloBall(current, spin, aimDegrees, now)
    spinRef.current = null
    commit(resolved.snapshot)
    return { ballId: resolved.ball.id }
  }, [commit])

  const advanceBall = useCallback(async (lastBallId: string): Promise<{ advanced: boolean }> => {
    const advanced = advanceSoloBall(stateRef.current, lastBallId, Date.now())
    if (advanced.advanced) commit(advanced.snapshot)
    return { advanced: advanced.advanced }
  }, [commit])

  const claimForfeit = useCallback(async () => {
    const current = stateRef.current
    const { room } = current
    if (room.status !== 'live') throw new AppError('WRONG_PHASE')
    const now = new Date().toISOString()
    commit({
      ...current,
      room: {
        ...room,
        status: 'abandoned',
        phase: 'finished',
        winnerUserId: SOLO_HUMAN_ID,
        abandonedBy: SOLO_CPU_ID,
        finishedAt: now,
        lastActiveAt: now,
        currentSpinId: null,
        spinStartedAt: null,
        spinEndsAt: null,
        spinDurationMs: null,
        spinSeed: null,
        aimDeadline: null,
        batterReadyAt: null,
        lastBallId: null,
      },
      serverNow: now,
    })
  }, [commit])

  const actions = useMemo<MatchActions>(
    () => ({ setBatterReady, startSpin, stopSpin, submitAim, advanceBall, claimForfeit }),
    [advanceBall, claimForfeit, setBatterReady, startSpin, stopSpin, submitAim],
  )

  const botBowl = useCallback(async () => {
    try {
      await actions.startSpin()
      const releaseDelay = botDelayMs('release', config.difficulty)
      schedule(() => {
        void actions.stopSpin(Math.random() * 360).catch(() => {
          // The human may have left or the snapshot may already have advanced.
        })
      }, releaseDelay)
    } catch {
      // A wrong-phase race is harmless; the next snapshot effect will retry if
      // the computer is still on turn.
    }
  }, [actions, config.difficulty, schedule])

  const botBat = useCallback(async () => {
    const current = stateRef.current
    const spin = spinRef.current
    if (!spin) return

    const view = getMatchView(current, SOLO_HUMAN_ID, Date.now())
    const innings = view.innings
    if (!innings || innings.battingUserId !== SOLO_CPU_ID) return

    const plan = planBotAim({
      difficulty: config.difficulty,
      rotation: spin.finalRotation,
      innings,
      room: current.room,
    })
    try {
      await actions.submitAim(plan.aimDegrees)
    } catch {
      // The reveal may already have been written by the other path; ignore.
    }
  }, [actions, config.difficulty])

  // One bot decision per stable snapshot. MatchPage's ticking clock lives inside
  // the child, so this effect only re-runs when the local match state changes.
  useEffect(() => {
    if (snapshot.room.status !== 'live') return

    const view = getMatchView(snapshot, SOLO_HUMAN_ID, Date.now())
    const innings = view.innings
    if (!innings || innings.status !== 'live') return

    const botBatting = innings.battingUserId === SOLO_CPU_ID
    const botBowling = innings.bowlingUserId === SOLO_CPU_ID
    let delay: number | null = null
    let run: (() => void) | null = null

    if (view.phase === 'ready') {
      if (botBatting && !snapshot.room.batterReadyAt) {
        delay = botDelayMs('ready', config.difficulty)
        run = () => {
          void actions.setBatterReady().catch(() => {})
        }
      } else if (botBowling && snapshot.room.batterReadyAt && !snapshot.room.currentSpinId) {
        delay = botDelayMs('bowl', config.difficulty)
        run = () => {
          void botBowl()
        }
      }
    } else if (
      view.phase === 'aiming' &&
      botBatting &&
      snapshot.room.currentSpinId
    ) {
      delay = botDelayMs('aim', config.difficulty)
      run = () => {
        void botBat()
      }
    }

    if (delay == null || !run) return
    const timer = window.setTimeout(run, delay)
    return () => window.clearTimeout(timer)
  }, [actions, botBat, botBowl, config.difficulty, snapshot])

  return { snapshot, actions }
}
