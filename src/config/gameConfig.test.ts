import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BOARD_SEGMENTS, ROOM_CODE, SEGMENT_ANGLE } from './gameConfig'

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/0001_init.sql'), 'utf8')

function sqlStringArray(name: string): string[] {
  const expression = new RegExp(`${name}\\s+constant\\s+text\\[\\]\\s*:=\\s*array\\[([^\\]]+)\\]`, 'i')
  const match = migration.match(expression)
  if (!match?.[1]) throw new Error(`Could not find ${name} in the migration`)
  return [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1] as string)
}

describe('board configuration', () => {
  it('keeps the eleven segments in the shared house order', () => {
    expect(BOARD_SEGMENTS.map((segment) => segment.code)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '6',
      'N',
      'W',
      'CO',
      'LBW',
      'RO',
      'BO',
    ])
    expect(BOARD_SEGMENTS).toHaveLength(11)
    expect(SEGMENT_ANGLE).toBeCloseTo(360 / 11)
  })

  it('has a valid kind and label for every segment', () => {
    for (const segment of BOARD_SEGMENTS) {
      expect(segment.kind).toMatch(/runs|noBall|wide|wicket/)
      expect(segment.labelEn.length).toBeGreaterThan(0)
      expect(segment.labelBn.length).toBeGreaterThan(0)
      expect(segment.ariaEn.length).toBeGreaterThan(0)
      expect(segment.ariaBn.length).toBeGreaterThan(0)
    }
  })

  it('mirrors the TypeScript board array in the Postgres RPC', () => {
    expect(migration).toContain('BOARD_SEGMENTS_TS_SYNC')
    expect(sqlStringArray('v_segments')).toEqual(BOARD_SEGMENTS.map((segment) => segment.code))
  })
})

describe('room codes', () => {
  it('uses the same unambiguous alphabet as the server', () => {
    expect(migration).toContain(`'${ROOM_CODE.alphabet}'`)
    for (const forbidden of ['0', 'O', '1', 'I']) {
      expect(ROOM_CODE.alphabet).not.toContain(forbidden)
    }
    expect(ROOM_CODE.alphabet).toHaveLength(32)
    expect(ROOM_CODE.length).toBe(6)
  })
})
