import type { BallDTO, OutcomeCode } from '../types/game'
import type { TFunction } from 'i18next'

const KEYS: Record<OutcomeCode, string[]> = {
  '1': ['commentary.1.0', 'commentary.1.1', 'commentary.1.2'],
  '2': ['commentary.2.0', 'commentary.2.1', 'commentary.2.2'],
  '3': ['commentary.3.0', 'commentary.3.1', 'commentary.3.2'],
  '4': ['commentary.4.0', 'commentary.4.1', 'commentary.4.2'],
  '6': ['commentary.6.0', 'commentary.6.1', 'commentary.6.2'],
  N: ['commentary.N.0', 'commentary.N.1', 'commentary.N.2'],
  W: ['commentary.W.0', 'commentary.W.1', 'commentary.W.2'],
  CO: ['commentary.CO.0', 'commentary.CO.1', 'commentary.CO.2'],
  LBW: ['commentary.LBW.0', 'commentary.LBW.1', 'commentary.LBW.2'],
  RO: ['commentary.RO.0', 'commentary.RO.1', 'commentary.RO.2'],
  BO: ['commentary.BO.0', 'commentary.BO.1', 'commentary.BO.2'],
}

function seedFromBall(ball: Pick<BallDTO, 'id' | 'ballSeq' | 'outcome'>): number {
  const source = `${ball.id}:${ball.ballSeq}:${ball.outcome}`
  let hash = 0
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function commentaryForBall(ball: BallDTO, t: TFunction): string {
  if (ball.isFreeHit && !ball.isWicket) {
    const alternative =
      ball.outcome === '4' ? 'commentary.freeHitFour.0' : ball.outcome === '6' ? 'commentary.freeHitSix.0' : null
    const pool = ball.outcome === 'CO' || ball.outcome === 'LBW' || ball.outcome === 'RO' || ball.outcome === 'BO'
      ? ['commentary.freeHitSave.0', 'commentary.freeHitSave.1', 'commentary.freeHitSave.2']
      : alternative
        ? [alternative]
        : KEYS[ball.outcome]
    return t(pool[seedFromBall(ball) % pool.length] ?? pool[0] ?? 'commentary.1.0')
  }
  const pool = KEYS[ball.outcome]
  return t(pool[seedFromBall(ball) % pool.length] ?? pool[0] ?? 'commentary.1.0')
}
