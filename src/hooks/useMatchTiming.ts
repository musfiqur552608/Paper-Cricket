import { useEffect, useRef, useState } from 'react'

/**
 * Aligns a ticking local clock with `serverNow` from the snapshot. This is used
 * only for countdowns (spin, aim, grace) — never for deciding outcomes.
 */
export function useServerClock(serverNow: string | undefined): number {
  const offset = useRef(0)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!serverNow) return
    const parsed = Date.parse(serverNow)
    if (Number.isNaN(parsed)) return
    // A one-way network delay makes serverNow appear in the past; ignore tiny
    // corrections under 0.7s to stop the clock wobbling on every poll.
    const candidate = parsed - Date.now()
    if (Math.abs(candidate - offset.current) > 700) {
      offset.current = candidate
    } else {
      offset.current = offset.current * 0.7 + candidate * 0.3
    }
  }, [serverNow])

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now() + offset.current), 250)
    return () => window.clearInterval(interval)
  }, [])

  return now
}

function hashSeed(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 33 + seed.charCodeAt(i)) | 0
  return Math.abs(hash)
}

/**
 * Visual-only spin. The server's final angle is a secret, so the board is spun
 * behind the opaque screen to an arbitrary, seed-derived orientation. When the
 * reveal arrives, the board is snapped to the server rotation while hidden.
 */
export function useSpinAnimation(active: boolean, durationMs: number, seed: string, reducedMotion: boolean): number {
  const [rotation, setRotation] = useState(0)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active) return
    if (reducedMotion) {
      setRotation(hashSeed(seed) % 360)
      return
    }
    const start = performance.now()
    const duration = Math.max(800, durationMs)
    const total = 840 + (hashSeed(seed) % 5) * 160
    const base = 0

    const tick = (time: number) => {
      const progress = Math.min(1, (time - start) / duration)
      // Smoothstep: a gentle wind-up, a long coast, and a soft stop.
      const eased = progress * progress * (3 - 2 * progress)
      setRotation(base + eased * total)
      if (progress < 1) frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [active, durationMs, seed, reducedMotion])

  return rotation
}

export function useCountdown(deadline: string | null | undefined, now: number): number {
  if (!deadline) return 0
  return Math.max(0, Date.parse(deadline) - now)
}
