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
      this.master.gain.value = 0.32
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

  private tone(
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
    this.tone(640, 0.05, 'triangle', 0.08)
  }

  spin(durationMs = 3000) {
    if (!this.canPlay()) return
    const ctx = this.context()
    if (!ctx) return
    const duration = Math.max(0.8, durationMs / 1000)
    const source = this.noise(duration, 0.1, 900)
    if (!source) return
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(500, ctx.currentTime)
    filter.frequency.linearRampToValueAtTime(2600, ctx.currentTime + duration * 0.45)
    filter.frequency.linearRampToValueAtTime(600, ctx.currentTime + duration)
    source.connect(filter)
    source.start()
    source.stop(ctx.currentTime + duration)
  }

  penDown() {
    if (!this.canPlay()) return
    this.tone(180, 0.08, 'sine', 0.14, 0, 120)
    this.tone(700, 0.03, 'square', 0.03, 0.01)
  }

  slide(durationMs = 900) {
    if (!this.canPlay()) return
    const ctx = this.context()
    if (!ctx) return
    const duration = Math.max(0.2, durationMs / 1000)
    const source = this.noise(duration, 0.07, 1400)
    if (!source) return
    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 700
    source.connect(filter)
    source.start()
    source.stop(ctx.currentTime + duration)
    this.tone(260, duration, 'sawtooth', 0.025, 0, 120)
  }

  hit(runs: number) {
    if (!this.canPlay()) return
    if (runs >= 4) {
      this.tone(320, 0.1, 'triangle', 0.18, 0, 120)
      this.tone(620, 0.16, 'sine', 0.12, 0.02)
      this.tone(880, 0.24, 'sine', 0.08, 0.06)
      if (runs === 6) {
        this.tone(1180, 0.35, 'sine', 0.07, 0.12)
        this.cheer()
      }
    } else {
      this.tone(420, 0.06, 'triangle', 0.13, 0, 220)
      this.tone(180, 0.08, 'sine', 0.09)
    }
  }

  wicket() {
    if (!this.canPlay()) return
    this.tone(180, 0.12, 'square', 0.1, 0, 80)
    this.tone(110, 0.35, 'sawtooth', 0.08, 0.06, 45)
    this.noise(0.15, 0.09, 300)?.start()
  }

  extras() {
    if (!this.canPlay()) return
    this.tone(300, 0.15, 'sine', 0.08, 0, 520)
  }

  cheer() {
    if (!this.canPlay()) return
    this.noise(1.2, 0.07, 1800)?.start()
    this.tone(523, 0.3, 'sine', 0.06, 0, 659)
    this.tone(659, 0.38, 'sine', 0.05, 0.08, 784)
    this.tone(784, 0.42, 'sine', 0.04, 0.16, 1046)
  }

  reveal() {
    if (!this.canPlay()) return
    this.tone(520, 0.2, 'sine', 0.07, 0, 720)
    this.noise(0.3, 0.035, 2200)?.start()
  }
}

export const sound = new SoundManager()

export function haptic(pattern: number | number[] = 18) {
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
