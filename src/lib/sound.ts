import { usePreferences } from '../store/preferences'

/**
 * Tiny WebAudio synth — no asset downloads, no third-party audio.
 * Each sound is generated from oscillators and filtered noise.
 */
class SoundManager {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null

  private context(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return null
      this.ctx = new Ctx()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.65
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  private canPlay(): boolean {
    return !usePreferences.getState().muted
  }

  private noise(duration: number, gain: number, filterFreq: number): AudioBufferSourceNode | null {
    const ctx = this.context()
    if (!ctx || !this.master) return null
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration))
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i += 1) {
      data[i] = Math.random() * 2 - 1
    }
    const source = ctx.createBufferSource()
    source.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = filterFreq
    filter.Q.value = 0.8
    const envelope = ctx.createGain()
    envelope.gain.setValueAtTime(gain, ctx.currentTime)
    envelope.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
    source.connect(filter).connect(envelope).connect(this.master)
    return source
  }

  tone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    gain = 0.16,
    delay = 0,
    endFrequency?: number,
  ) {
    const ctx = this.context()
    if (!ctx || !this.master) return
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    const start = ctx.currentTime + delay
    osc.type = type
    osc.frequency.setValueAtTime(frequency, start)
    if (endFrequency) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration)
    env.gain.setValueAtTime(0.0001, start)
    env.gain.exponentialRampToValueAtTime(gain, start + 0.012)
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    osc.connect(env).connect(this.master)
    osc.start(start)
    osc.stop(start + duration + 0.02)
  }

  click() {
    if (!this.canPlay()) return
    this.tone(640, 0.06, 'triangle', 0.12)
  }

  /** Spin sound that reacts to drag speed (deg/sec). Call repeatedly while dragging. */
  spinBySpeed(degPerSec: number) {
    if (!this.canPlay()) return
    const ctx = this.context()
    if (!ctx) return
    // Clamp speed to reasonable range
    const speed = Math.max(0, Math.min(degPerSec, 720))
    const norm = speed / 720 // 0..1
    // Whoosh layer: filter opens with speed
    const dur = 0.12
    const source = this.noise(dur, 0.08 + norm * 0.18, 800)
    if (!source) return
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(500 + norm * 2500, ctx.currentTime)
    filter.frequency.linearRampToValueAtTime(400 + norm * 800, ctx.currentTime + dur)
    filter.Q.value = 1.2 + norm * 2
    source.connect(filter)
    source.start()
    source.stop(ctx.currentTime + dur)
    // Tick layer: faster ticks at higher speed
    const tickRate = 0.04 + norm * 0.18 // 40ms..220ms between ticks
    // Only fire a tick occasionally to avoid flooding
    if (Math.random() < tickRate * 4) {
      this.tone(1000 + norm * 800, 0.02, 'sine', 0.02 + norm * 0.03)
    }
  }

  /** Legacy full-duration spin (used for auto-stop fallback). */
  spin(durationMs = 3000) {
    if (!this.canPlay()) return
    const ctx = this.context()
    if (!ctx) return
    const duration = Math.max(0.8, durationMs / 1000)
    const source = this.noise(duration, 0.18, 900)
    if (!source) return
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(600, ctx.currentTime)
    filter.frequency.linearRampToValueAtTime(2800, ctx.currentTime + duration * 0.5)
    filter.frequency.linearRampToValueAtTime(700, ctx.currentTime + duration)
    source.connect(filter)
    source.start()
    source.stop(ctx.currentTime + duration)
    for (let i = 0; i < duration; i += 0.25) {
      this.tone(1200, 0.03, 'sine', 0.03, i)
    }
  }

  penDown() {
    if (!this.canPlay()) return
    this.tone(160, 0.1, 'sine', 0.18, 0, 100)
    this.tone(680, 0.04, 'square', 0.04, 0.015)
  }

  slide(durationMs = 900) {
    if (!this.canPlay()) return
    const ctx = this.context()
    if (!ctx) return
    const duration = Math.max(0.2, durationMs / 1000)
    const source = this.noise(duration, 0.12, 1400)
    if (!source) return
    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 700
    source.connect(filter)
    source.start()
    source.stop(ctx.currentTime + duration)
    // Descending "flick" tone
    this.tone(300, duration * 0.8, 'sawtooth', 0.04, 0, 100)
  }

  /** Score-specific hit sounds. */
  hitByScore(runs: number) {
    if (!this.canPlay()) return
    switch (runs) {
      case 1: // Sharp single
        this.tone(520, 0.07, 'triangle', 0.18, 0, 280)
        this.tone(260, 0.05, 'sine', 0.08)
        break
      case 2: // Double bounce
        this.tone(480, 0.08, 'triangle', 0.2, 0, 260)
        this.tone(220, 0.06, 'sine', 0.1)
        this.tone(620, 0.04, 'sine', 0.06, 0.04)
        break
      case 3: // Triple - rising chord
        this.tone(440, 0.09, 'triangle', 0.22, 0, 240)
        this.tone(550, 0.07, 'sine', 0.1, 0.01)
        this.tone(660, 0.05, 'sine', 0.08, 0.03)
        break
      case 4: // Boundary - bright major chord
        this.tone(380, 0.12, 'triangle', 0.26, 0, 180)
        this.tone(570, 0.16, 'sine', 0.18, 0.01)
        this.tone(760, 0.22, 'sine', 0.14, 0.03)
        this.tone(1040, 0.28, 'sine', 0.08, 0.06)
        break
      case 6: // Six - big chord + cheer
        this.tone(340, 0.14, 'triangle', 0.3, 0, 140)
        this.tone(510, 0.22, 'sine', 0.22, 0.01)
        this.tone(680, 0.3, 'sine', 0.18, 0.03)
        this.tone(920, 0.38, 'sine', 0.14, 0.06)
        this.tone(1280, 0.45, 'sine', 0.1, 0.12)
        this.cheer()
        break
      default: // Extras / fallbacks
        this.tone(320, 0.18, 'sine', 0.11, 0, 560)
    }
  }

  /** Legacy hit(runs) kept for compatibility. */
  hit(runs: number) {
    this.hitByScore(runs)
  }

  /** Wicket-specific sounds. */
  wicketByType(kind: 'caught' | 'bowled' | 'lbw' | 'runout' | 'stumped') {
    if (!this.canPlay()) return
    switch (kind) {
      case 'caught': // Clean snap + hang
        this.tone(180, 0.12, 'square', 0.16, 0, 80)
        this.tone(720, 0.35, 'sine', 0.12, 0.02, 440)
        this.noise(0.1, 0.08, 4000)?.start()
        break
      case 'bowled': // Heavy thud + wood rattle
        this.tone(110, 0.25, 'sawtooth', 0.22, 0, 55)
        this.tone(180, 0.15, 'triangle', 0.18, 0.02, 90)
        this.noise(0.2, 0.15, 200)?.start()
        this.tone(800, 0.06, 'square', 0.08, 0.03) // stumps hit
        break
      case 'lbw': // Low ominous pad
        this.tone(95, 0.45, 'sawtooth', 0.14, 0, 40)
        this.tone(160, 0.3, 'triangle', 0.1, 0.05, 80)
        this.noise(0.3, 0.07, 150)?.start()
        break
      case 'runout': // Sharp whip + impact
        this.tone(220, 0.08, 'square', 0.2, 0, 110)
        this.tone(880, 0.05, 'sawtooth', 0.12, 0, 440)
        this.noise(0.12, 0.1, 3000)?.start()
        break
      case 'stumped': // Quick snap + pop
        this.tone(160, 0.1, 'square', 0.18, 0, 70)
        this.tone(920, 0.04, 'sine', 0.1, 0, 1200)
        this.noise(0.08, 0.07, 5000)?.start()
        break
    }
  }

  /** Legacy wicket() kept for compatibility. */
  wicket() {
    this.wicketByType('bowled')
  }

  extras() {
    if (!this.canPlay()) return
    this.tone(320, 0.18, 'sine', 0.11, 0, 560)
  }

  cheer() {
    if (!this.canPlay()) return
    this.noise(1.4, 0.1, 1800)?.start()
    this.tone(523, 0.35, 'sine', 0.08, 0, 659)
    this.tone(659, 0.42, 'sine', 0.07, 0.08, 784)
    this.tone(784, 0.48, 'sine', 0.06, 0.16, 1046)
  }

  reveal() {
    if (!this.canPlay()) return
    this.tone(540, 0.25, 'sine', 0.1, 0, 760)
    this.noise(0.35, 0.05, 2200)?.start()
  }
}

export const sound = new SoundManager()

export function haptic(pattern: number | number[] = 30) {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
  if (usePreferences.getState().muted) return
  try {
    navigator.vibrate(pattern)
  } catch {
    // Haptics can be disallowed by the browser; never fail the match for it.
  }
}

export function useSound() {
  return sound
}
