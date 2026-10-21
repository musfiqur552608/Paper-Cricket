import { describe, expect, it } from 'vitest'
import {
  angleToOutcome,
  angleToSegmentIndex,
  applyDelivery,
  buildFallOfWickets,
  buildOverTimeline,
  buildPlayerScores,
  emptyInningsState,
  formatOvers,
  requiredRunRate,
} from './gameEngine'
import { BOARD_SEGMENTS, SEGMENT_ANGLE } from '../config/gameConfig'
import type { BallDTO, InningsDTO, PlayerSquad } from '../types/game'

function ball(overrides: Partial<BallDTO> & Pick<BallDTO, 'id' | 'inningsId' | 'ballSeq' | 'outcome'>): BallDTO {
  return {
    roomId: 'room-1',
    batterIndex: 0,
    batterName: 'Rafi',
    segmentIndex: 0,
    runs: 0,
    extras: 0,
    isLegal: true,
    isWicket: false,
    isFreeHit: false,
    aimDegrees: 0,
    boardRotation: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function innings(overrides: Partial<InningsDTO> = {}): InningsDTO {
  return {
    id: 'inn-1',
    roomId: 'room-1',
    number: 1,
    battingUserId: 'user-a',
    bowlingUserId: 'user-b',
    runs: 0,
    wickets: 0,
    legalBalls: 0,
    extras: 0,
    nextIsFreeHit: false,
    status: 'live',
    createdAt: '2026-01-01T00:00:00.000Z',
    completedAt: null,
    ...overrides,
  }
}

const squad: PlayerSquad[] = Array.from({ length: 5 }, (_, index) => ({
  position: index,
  name: `Batter ${index + 1}`,
}))

describe('angle to segment mapping', () => {
  it('treats the top of the board as segment 0', () => {
    expect(angleToSegmentIndex(0, 0)).toBe(0)
    expect(angleToOutcome(0, 0)).toBe('1')
  })

  it('maps every segment centre correctly at several board rotations', () => {
    for (const rotation of [0, 17.25, 89, 180, 271.4, 359.9]) {
      BOARD_SEGMENTS.forEach((segment, index) => {
        const aim = rotation + index * SEGMENT_ANGLE
        expect(angleToSegmentIndex(aim, rotation)).toBe(index)
        expect(angleToOutcome(aim, rotation)).toBe(segment.code)
      })
    }
  })

  it('normalises negative and multi-turn angles', () => {
    expect(angleToSegmentIndex(-360, 0)).toBe(0)
    expect(angleToSegmentIndex(360 * 3 + 90, 90)).toBe(0)
    expect(angleToSegmentIndex(-SEGMENT_ANGLE, 0)).toBe(BOARD_SEGMENTS.length - 1)
  })

  it('rounds a boundary angle into the clockwise neighbour', () => {
    // Segment 0 spans -16.36..16.36, segment 1 spans 16.36..49.09.
    expect(angleToSegmentIndex(SEGMENT_ANGLE / 2 + 0.001, 0)).toBe(1)
    expect(angleToSegmentIndex(SEGMENT_ANGLE / 2 - 0.001, 0)).toBe(0)
  })
})

describe('delivery engine', () => {
  it('adds runs and a legal ball', () => {
    const result = applyDelivery(emptyInningsState(), '4', { overs: 2, wickets: 2 })
    expect(result.batRuns).toBe(4)
    expect(result.extras).toBe(0)
    expect(result.isLegal).toBe(true)
    expect(result.isWicket).toBe(false)
    expect(result.state).toEqual({ runs: 4, wickets: 0, legalBalls: 1, extras: 0, nextIsFreeHit: false })
  })

  it('adds one extra and does not count a wide as a legal ball', () => {
    const result = applyDelivery(emptyInningsState(), 'W', { overs: 2, wickets: 2 })
    expect(result.extras).toBe(1)
    expect(result.isLegal).toBe(false)
    expect(result.state.legalBalls).toBe(0)
    expect(result.state.nextIsFreeHit).toBe(false)
  })

  it('arms a free hit on a no-ball and ignores a wicket on it', () => {
    const noBall = applyDelivery(emptyInningsState(), 'N', { overs: 2, wickets: 2 })
    expect(noBall.isLegal).toBe(false)
    expect(noBall.state.nextIsFreeHit).toBe(true)

    const freeHitWicket = applyDelivery(noBall.state, 'CO', { overs: 2, wickets: 2 })
    expect(freeHitWicket.wasFreeHit).toBe(true)
    expect(freeHitWicket.isWicket).toBe(false)
    expect(freeHitWicket.isLegal).toBe(true)
    expect(freeHitWicket.state.wickets).toBe(0)
    expect(freeHitWicket.state.nextIsFreeHit).toBe(false)
    expect(freeHitWicket.batterIndex).toBe(0)
  })

  it('counts a wicket on a normal delivery and advances the batter index', () => {
    const result = applyDelivery(emptyInningsState(), 'LBW', { overs: 2, wickets: 2 })
    expect(result.isWicket).toBe(true)
    expect(result.state.wickets).toBe(1)
    expect(result.state.legalBalls).toBe(1)
    expect(result.endReason).toBeNull()
  })

  it('ends the innings on wickets', () => {
    const result = applyDelivery(
      { runs: 24, wickets: 1, legalBalls: 5, extras: 2, nextIsFreeHit: false },
      'BO',
      { overs: 2, wickets: 2 },
    )
    expect(result.isWicket).toBe(true)
    expect(result.inningsComplete).toBe(true)
    expect(result.endReason).toBe('wickets')
    expect(result.wicketsRemaining).toBe(0)
  })

  it('ends the chase as soon as the target is reached', () => {
    const result = applyDelivery(
      { runs: 17, wickets: 0, legalBalls: 4, extras: 0, nextIsFreeHit: false },
      '2',
      { overs: 2, wickets: 2, target: 19 },
    )
    expect(result.state.runs).toBe(19)
    expect(result.chaseComplete).toBe(true)
    expect(result.endReason).toBe('target')
  })

  it('ends an innings after the final legal ball', () => {
    const result = applyDelivery(
      { runs: 40, wickets: 0, legalBalls: 11, extras: 0, nextIsFreeHit: false },
      '1',
      { overs: 2, wickets: 2 },
    )
    expect(result.state.legalBalls).toBe(12)
    expect(result.endReason).toBe('overs')
    expect(result.inningsComplete).toBe(true)
  })

  it('does not end an over early on a wide', () => {
    const result = applyDelivery(
      { runs: 40, wickets: 0, legalBalls: 11, extras: 0, nextIsFreeHit: false },
      'W',
      { overs: 2, wickets: 2 },
    )
    expect(result.state.legalBalls).toBe(11)
    expect(result.inningsComplete).toBe(false)
  })
})

describe('scorebook helpers', () => {
  it('formats overs the way a school scorer does', () => {
    expect(formatOvers(0)).toBe('0.0')
    expect(formatOvers(7)).toBe('1.1')
    expect(formatOvers(12)).toBe('2.0')
  })

  it('computes a required run rate', () => {
    expect(requiredRunRate(24, 12, 6, 3)).toBeCloseTo(6)
    expect(requiredRunRate(null, 12, 6, 3)).toBeNull()
    expect(requiredRunRate(30, 12, 18, 3)).toBeNull()
  })

  it('groups wides and no-balls into the over in which they were bowled', () => {
    const id = 'inn-1'
    const deliveries = [
      ball({ id: 'b1', inningsId: id, ballSeq: 1, outcome: '1', runs: 1 }),
      ball({ id: 'b2', inningsId: id, ballSeq: 2, outcome: 'W', extras: 1, isLegal: false }),
      ball({ id: 'b3', inningsId: id, ballSeq: 3, outcome: '4', runs: 4 }),
      ball({ id: 'b4', inningsId: id, ballSeq: 4, outcome: 'N', extras: 1, isLegal: false }),
      ball({ id: 'b5', inningsId: id, ballSeq: 5, outcome: '6', runs: 6 }),
      ball({ id: 'b6', inningsId: id, ballSeq: 6, outcome: '1', runs: 1 }),
      ball({ id: 'b7', inningsId: id, ballSeq: 7, outcome: '2', runs: 2 }),
      ball({ id: 'b8', inningsId: id, ballSeq: 8, outcome: '1', runs: 1 }),
      ball({ id: 'b9', inningsId: id, ballSeq: 9, outcome: '1', runs: 1 }),
    ]
    const overs = buildOverTimeline(innings({ id }), deliveries)
    expect(overs).toHaveLength(2)
    expect(overs[0]).toMatchObject({ over: 1, runs: 17, legalBalls: 6 })
    expect(overs[1]).toMatchObject({ over: 2, runs: 1, legalBalls: 1 })
    expect(overs[0]?.balls).toHaveLength(8)
    expect(overs[1]?.balls).toHaveLength(1)
  })

  it('builds fall-of-wicket entries with the score and over at each wicket', () => {
    const id = 'inn-1'
    const deliveries = [
      ball({ id: 'b1', inningsId: id, ballSeq: 1, outcome: '4', runs: 4 }),
      ball({ id: 'b2', inningsId: id, ballSeq: 2, outcome: 'W', extras: 1, isLegal: false }),
      ball({ id: 'b3', inningsId: id, ballSeq: 3, outcome: 'CO', isWicket: true }),
      ball({ id: 'b4', inningsId: id, ballSeq: 4, outcome: '6', runs: 6, batterIndex: 1, batterName: 'Batter 2' }),
      ball({ id: 'b5', inningsId: id, ballSeq: 5, outcome: 'BO', isWicket: true, batterIndex: 1, batterName: 'Batter 2' }),
    ]
    expect(buildFallOfWickets(innings({ id }), deliveries)).toEqual([
      { wicket: 1, runs: 5, overs: '0.2', batterName: 'Rafi' },
      { wicket: 2, runs: 11, overs: '0.4', batterName: 'Batter 2' },
    ])
  })

  it('builds batter cards using squad order and excludes wides from balls faced', () => {
    const id = 'inn-1'
    const deliveries = [
      ball({ id: 'b1', inningsId: id, ballSeq: 1, outcome: '4', runs: 4 }),
      ball({ id: 'b2', inningsId: id, ballSeq: 2, outcome: 'W', isLegal: false, extras: 1 }),
      ball({ id: 'b3', inningsId: id, ballSeq: 3, outcome: '6', runs: 6 }),
      ball({ id: 'b4', inningsId: id, ballSeq: 4, outcome: 'CO', isWicket: true }),
      ball({ id: 'b5', inningsId: id, ballSeq: 5, outcome: '2', runs: 2, batterIndex: 1 }),
    ]
    const scores = buildPlayerScores(innings({ id, wickets: 1 }), deliveries, squad)
    expect(scores).toHaveLength(2)
    expect(scores[0]).toMatchObject({ name: 'Batter 1', runs: 10, balls: 3, fours: 1, sixes: 1, isOut: true, outType: 'CO' })
    expect(scores[1]).toMatchObject({ name: 'Batter 2', runs: 2, balls: 1, isOut: false, isStriker: true })
  })
})
