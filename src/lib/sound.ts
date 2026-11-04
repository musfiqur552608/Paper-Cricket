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

  spin(durationMs = 3000) {
    if (!this.canPlay()) return
    const ctx = this.context()
    if (!ctx) return
    const duration = Math.max(0.8, durationMs / 1000)
    // Wind-up whoosh
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
    // Soft rhythmic "tick-tick" as the board spins
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

  hit(runs: number) {
    if (!this.canPlay()) return
    if (runs >= 4) {
      this.tone(340, 0.14, 'triangle', 0.24, 0, 140)
      this.tone(680, 0.22, 'sine', 0.16, 0.02)
      this.tone(920, 0.3, 'sine', 0.12, 0.06)
      if (runs === 6) {
        this.tone(1280, 0.4, 'sine', 0.1, 0.12)
        this.cheer()
      }
    } else {
      this.tone(460, 0.08, 'triangle', 0.18, 0, 240)
      this.tone(200, 0.1, 'sine', 0.12)
    }
  }

  wicket() {
    if (!this.canPlay()) return
    this.tone(170, 0.15, 'square', 0.14, 0, 70)
    this.tone(95, 0.4, 'sawtooth', 0.11, 0.05, 35)
    this.noise(0.18, 0.12, 280)?.start()
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
