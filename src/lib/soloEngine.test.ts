import { describe, expect, it } from 'vitest'
import { SEGMENT_ANGLE } from '../config/gameConfig'
import {
  SOLO_CPU_ID,
  SOLO_HUMAN_ID,
  advanceSoloBall,
  createSoloSnapshot,
  markSoloBatterReady,
  resolveSoloBall,
  startSoloSpin,
  stopSoloSpin,
  type SoloBallResult,
  type SoloConfig,
} from './soloEngine'

const T0 = Date.parse('2026-01-01T00:00:00.000Z')

function config(overrides: Partial<SoloConfig> = {}): SoloConfig {
  return {
    humanName: 'You',
    humanTeam: 'Paper XI',
    botName: 'Computer',
    botTeam: 'CPU XI',
    overs: 1,
    wickets: 2,
    batFirst: 'human',
    difficulty: 'balanced',
    superOver: true,
    humanSquad: ['You', 'Friend'],
    botSquad: ['Chip', 'Ada'],
    ...overrides,
  }
}

function deliver(snapshot: ReturnType<typeof createSoloSnapshot>, targetIndex: number, now: number): SoloBallResult {
  const ready = markSoloBatterReady(snapshot, now)
  const started = startSoloSpin(ready, now + 1, { durationMs: 3000, fallbackRotation: 0 })
  const stopped = stopSoloSpin(started.snapshot, started.spin, 0, now + 2)
  return resolveSoloBall(stopped.snapshot, stopped.spin, targetIndex * SEGMENT_ANGLE, now + 3)
}

function advance(
  snapshot: ReturnType<typeof createSoloSnapshot>,
  ball: SoloBallResult['ball'],
  now: number,
) {
  return advanceSoloBall(snapshot, ball.id, now)
}

function playInnings(
  start: ReturnType<typeof createSoloSnapshot>,
  targetIndex: number,
  balls: number,
  now: number,
): { snapshot: ReturnType<typeof createSoloSnapshot>; last: SoloBallResult; clock: number } {
  let snapshot = start
  let last: SoloBallResult | null = null
  let clock = now
  for (let index = 0; index < balls; index += 1) {
    last = deliver(snapshot, targetIndex, clock)
    clock += 100
    if (index < balls - 1) {
      snapshot = advance(last.snapshot, last.ball, clock).snapshot
      clock += 10
    }
  }
  return { snapshot: last!.snapshot, last: last!, clock }
}

describe('local solo match setup', () => {
  it('builds a live local room with the human as host', () => {
    const snapshot = createSoloSnapshot(config(), T0)

    expect(snapshot.room.status).toBe('live')
    expect(snapshot.room.phase).toBe('ready')
    expect(snapshot.room.hostUserId).toBe(SOLO_HUMAN_ID)
    expect(snapshot.players.map((player) => player.userId)).toEqual([SOLO_HUMAN_ID, SOLO_CPU_ID])
    expect(snapshot.players[0]?.squad.map((entry) => entry.name)).toEqual(['You', 'Friend'])
    expect(snapshot.innings).toHaveLength(1)
    expect(snapshot.innings[0]?.battingUserId).toBe(SOLO_HUMAN_ID)
    expect(snapshot.innings[0]?.bowlingUserId).toBe(SOLO_CPU_ID)
  })

  it('honours the computer batting first choice', () => {
    const snapshot = createSoloSnapshot(config({ batFirst: 'cpu' }), T0)

    expect(snapshot.innings[0]?.battingUserId).toBe(SOLO_CPU_ID)
    expect(snapshot.innings[0]?.bowlingUserId).toBe(SOLO_HUMAN_ID)
    expect(snapshot.room.batFirst).toBe('guest')
  })
})

describe('local ball lifecycle', () => {
  it('marks the batter ready once, opens the aim window, and reveals a run', () => {
    const start = createSoloSnapshot(config(), T0)

    const ready = markSoloBatterReady(start, T0 + 10)
    expect(ready.room.batterReadyAt).toBe(new Date(T0 + 10).toISOString())
    const readyAgain = markSoloBatterReady(ready, T0 + 20)
    expect(readyAgain.room.batterReadyAt).toBe(ready.room.batterReadyAt)
    expect(readyAgain.serverNow).toBe(new Date(T0 + 20).toISOString())

    const started = startSoloSpin(readyAgain, T0 + 30, { durationMs: 3000, fallbackRotation: 0 })
    expect(started.snapshot.room.phase).toBe('spinning')
    expect(started.snapshot.room.currentSpinId).toBe(started.spin.id)
    expect(started.snapshot.room.spinEndsAt).toBe(new Date(T0 + 3030).toISOString())

    const stopped = stopSoloSpin(started.snapshot, started.spin, 0, T0 + 40)
    expect(stopped.result.alreadyStopped).toBe(false)
    expect(stopped.result.finalRotation).toBe(0)
    expect(stopped.snapshot.room.spinEndsAt).toBe(new Date(T0 + 40).toISOString())
    const stoppedAgain = stopSoloSpin(stopped.snapshot, stopped.spin, 90, T0 + 50)
    expect(stoppedAgain.result.alreadyStopped).toBe(true)
    expect(stoppedAgain.result.finalRotation).toBe(0)

    const resolved = resolveSoloBall(stoppedAgain.snapshot, stoppedAgain.spin, 0, T0 + 60)
    expect(resolved.ball.outcome).toBe('1')
    expect(resolved.ball.runs).toBe(1)
    expect(resolved.snapshot.room.phase).toBe('reveal')
    expect(resolved.snapshot.room.lastBallId).toBe(resolved.ball.id)
    expect(resolved.snapshot.innings[0]?.runs).toBe(1)
    expect(resolved.pending).toBe('none')

    const next = advanceSoloBall(resolved.snapshot, resolved.ball.id, T0 + 70)
    expect(next.advanced).toBe(true)
    expect(next.snapshot.room.phase).toBe('ready')
    expect(next.snapshot.room.lastBallId).toBe(resolved.ball.id)
    expect(advanceSoloBall(next.snapshot, resolved.ball.id, T0 + 80).advanced).toBe(false)
  })

  it('applies a no-ball free hit and protects the next wicket', () => {
    const start = createSoloSnapshot(config(), T0)
    const noBall = deliver(start, 5, T0)

    expect(noBall.ball.outcome).toBe('N')
    expect(noBall.ball.extras).toBe(1)
    expect(noBall.snapshot.innings[0]?.nextIsFreeHit).toBe(true)
    const afterNoBall = advance(noBall.snapshot, noBall.ball, T0 + 100).snapshot

    const freeHit = deliver(afterNoBall, 7, T0 + 200)
    expect(freeHit.ball.outcome).toBe('CO')
    expect(freeHit.ball.isFreeHit).toBe(true)
    expect(freeHit.ball.isWicket).toBe(false)
    expect(freeHit.snapshot.innings[0]?.wickets).toBe(0)
  })

  it('changes innings and sets the target after six legal balls', () => {
    const start = createSoloSnapshot(config(), T0)
    const { snapshot, last } = playInnings(start, 0, 6, T0)

    expect(last.ball.outcome).toBe('1')
    expect(last.pending).toBe('innings')
    expect(snapshot.innings[0]?.runs).toBe(6)
    expect(snapshot.innings[0]?.legalBalls).toBe(6)
    expect(snapshot.innings[0]?.status).toBe('complete')

    const changed = advanceSoloBall(snapshot, last.ball.id, T0 + 1000)
    expect(changed.advanced).toBe(true)
    expect(changed.snapshot.room.inningsNumber).toBe(2)
    expect(changed.snapshot.room.target).toBe(7)
    expect(changed.snapshot.room.phase).toBe('ready')
    expect(changed.snapshot.innings[1]?.battingUserId).toBe(SOLO_CPU_ID)
    expect(changed.snapshot.innings[1]?.bowlingUserId).toBe(SOLO_HUMAN_ID)
  })

  it('ends the chase on wickets and awards the match to the first innings', () => {
    const start = createSoloSnapshot(config(), T0)
    const first = playInnings(start, 0, 6, T0)
    const secondStart = advanceSoloBall(first.snapshot, first.last.ball.id, T0 + 1000).snapshot

    const wicketOne = deliver(secondStart, 7, T0 + 2000)
    expect(wicketOne.ball.isWicket).toBe(true)
    expect(wicketOne.pending).toBe('none')
    const afterWicketOne = advance(wicketOne.snapshot, wicketOne.ball, T0 + 3000).snapshot

    const wicketTwo = deliver(afterWicketOne, 7, T0 + 4000)
    expect(wicketTwo.snapshot.innings[1]?.wickets).toBe(2)
    expect(wicketTwo.pending).toBe('match')

    const finished = advanceSoloBall(wicketTwo.snapshot, wicketTwo.ball.id, T0 + 5000)
    expect(finished.snapshot.room.status).toBe('finished')
    expect(finished.snapshot.room.phase).toBe('finished')
    expect(finished.snapshot.room.winnerUserId).toBe(SOLO_HUMAN_ID)
  })
})

describe('local super over', () => {
  it('starts a super over after a tie, then sets a new target', () => {
    const start = createSoloSnapshot(config(), T0)
    const first = playInnings(start, 0, 6, T0)
    const secondStart = advanceSoloBall(first.snapshot, first.last.ball.id, T0 + 1000).snapshot
    const second = playInnings(secondStart, 0, 6, T0 + 2000)

    expect(second.last.pending).toBe('super_over')
    const superStart = advanceSoloBall(second.snapshot, second.last.ball.id, T0 + 5000)
    expect(superStart.snapshot.room.inningsNumber).toBe(3)
    expect(superStart.snapshot.room.target).toBeNull()
    expect(superStart.snapshot.innings[2]?.number).toBe(3)
    expect(superStart.snapshot.innings[2]?.battingUserId).toBe(SOLO_CPU_ID)

    const superFirst = playInnings(superStart.snapshot, 0, 6, T0 + 6000)
    expect(superFirst.last.pending).toBe('innings')
    const superSecondStart = advanceSoloBall(
      superFirst.snapshot,
      superFirst.last.ball.id,
      T0 + 9000,
    ).snapshot
    expect(superSecondStart.room.inningsNumber).toBe(4)
    expect(superSecondStart.innings[3]?.battingUserId).toBe(SOLO_HUMAN_ID)
    expect(superSecondStart.room.target).toBe(7)
  })

  it('finishes as a tie when super over is disabled', () => {
    const start = createSoloSnapshot(config({ superOver: false }), T0)
    const first = playInnings(start, 0, 6, T0)
    const secondStart = advanceSoloBall(first.snapshot, first.last.ball.id, T0 + 1000).snapshot
    const second = playInnings(secondStart, 0, 6, T0 + 2000)

    expect(second.last.pending).toBe('match')
    const finished = advanceSoloBall(second.snapshot, second.last.ball.id, T0 + 5000)
    expect(finished.snapshot.room.status).toBe('finished')
    expect(finished.snapshot.room.winnerUserId).toBeNull()
  })
})
