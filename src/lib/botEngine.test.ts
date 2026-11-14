import { describe, expect, it } from 'vitest'
import { SEGMENT_ANGLE } from '../config/gameConfig'
import { angleToSegmentIndex } from './gameEngine'
import { botDelayMs, botSpinDurationMs, planBotAim } from './botEngine'
import type { InningsDTO, RoomDTO } from '../types/game'

const NOW = '2026-01-01T00:00:00.000Z'

function innings(overrides: Partial<InningsDTO> = {}): InningsDTO {
  return {
    id: 'inn-1',
    roomId: 'room-1',
    number: 1,
    battingUserId: 'bot',
    bowlingUserId: 'human',
    runs: 0,
    wickets: 0,
    legalBalls: 0,
    extras: 0,
    nextIsFreeHit: false,
    status: 'live',
    createdAt: NOW,
    completedAt: null,
    ...overrides,
  }
}

function room(overrides: Partial<RoomDTO> = {}): RoomDTO {
  return {
    id: 'room-1',
    code: 'TEST',
    hostUserId: 'human',
    status: 'live',
    phase: 'spinning',
    overs: 1,
    wickets: 2,
    batFirst: 'host',
    superOver: true,
    inningsNumber: 1,
    target: null,
    pendingTransition: 'none',
    currentSpinId: 'spin-1',
    spinStartedAt: NOW,
    spinEndsAt: NOW,
    spinDurationMs: 3000,
    spinSeed: 'seed',
    aimDeadline: NOW,
    lastBallId: null,
    batterReadyAt: NOW,
    winnerUserId: null,
    abandonedBy: null,
    lastActiveAt: NOW,
    createdAt: NOW,
    startedAt: NOW,
    finishedAt: null,
    ...overrides,
  }
}

function draws(...values: number[]): () => number {
  let index = 0
  return () => values[index++] ?? 0.5
}

describe('bot shot planning', () => {
  it('aims at the wedge it chooses', () => {
    const plan = planBotAim({
      difficulty: 'balanced',
      rotation: 60,
      innings: innings(),
      room: room(),
      random: draws(0.99, 0.5, 0.5),
    })

    expect(plan.loose).toBe(false)
    expect(plan.targetIndex).toBe(3)
    expect(angleToSegmentIndex(plan.aimDegrees, 60)).toBe(3)
    expect(plan.aimDegrees).toBeCloseTo(60 + 3 * SEGMENT_ANGLE)
  })

  it('can mishit and land on a wicket wedge when casual', () => {
    const plan = planBotAim({
      difficulty: 'casual',
      rotation: 0,
      innings: innings(),
      room: room(),
      random: draws(0.0, 0.7, 0.5),
    })

    expect(plan.loose).toBe(true)
    expect(plan.targetIndex).toBe(7)
    expect(angleToSegmentIndex(plan.aimDegrees, 0)).toBe(7)
  })

  it('goes for the boundary that wins a last-ball chase', () => {
    const plan = planBotAim({
      difficulty: 'sharp',
      rotation: 0,
      innings: innings({ number: 2, runs: 0, legalBalls: 5 }),
      room: room({ inningsNumber: 2, target: 5 }),
      random: draws(0.99, 0, 0.5),
    })

    expect(plan.loose).toBe(false)
    expect(plan.targetIndex).toBe(4)
    expect(angleToSegmentIndex(plan.aimDegrees, 0)).toBe(4)
  })

  it('chooses the smallest winning hit when four is enough', () => {
    const plan = planBotAim({
      difficulty: 'sharp',
      rotation: 120,
      innings: innings({ number: 2, runs: 0, legalBalls: 5 }),
      room: room({ inningsNumber: 2, target: 4 }),
      random: draws(0.99, 0, 0.5),
    })

    expect(plan.targetIndex).toBe(3)
    expect(angleToSegmentIndex(plan.aimDegrees, 120)).toBe(3)
  })
})

describe('bot timing', () => {
  it('stays inside the difficulty bands and gets quicker with level', () => {
    expect(botDelayMs('ready', 'casual', () => 0)).toBe(1300)
    expect(botDelayMs('ready', 'casual', () => 1)).toBe(2400)
    expect(botDelayMs('ready', 'sharp', () => 0)).toBe(550)
    expect(botDelayMs('aim', 'sharp', () => 1)).toBe(1800)
    expect(botSpinDurationMs('casual', () => 0)).toBeGreaterThan(botSpinDurationMs('sharp', () => 0))
  })
})
