import type { ActiveSpin, StopSpinResult } from '../types/game'

/**
 * The small action contract the match screen needs. Online rooms talk to
 * Supabase; the solo game talks to the local engine. Keeping the surface this
 * narrow lets both modes share the entire match UI.
 */
export interface MatchActions {
  setBatterReady: () => Promise<void>
  startSpin: () => Promise<ActiveSpin>
  stopSpin: (rotation: number) => Promise<StopSpinResult>
  submitAim: (aimDegrees: number, force?: boolean) => Promise<{ ballId: string }>
  advanceBall: (lastBallId: string) => Promise<{ advanced: boolean }>
  claimForfeit: () => Promise<void>
}
