import { create } from 'zustand'

interface PreferencesState {
  muted: boolean
  reducedMotion: boolean
  setMuted: (muted: boolean) => void
  toggleMuted: () => void
  setReducedMotion: (value: boolean) => void
}

function readBoolean(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback
  let value: string | null = null
  try {
    value = window.localStorage.getItem(key)
  } catch {
    return fallback
  }
  if (value === null) {
    if (key === 'pc.reduceMotion') {
      return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? fallback
    }
    return fallback
  }
  return value === 'true'
}

function save(key: string, value: boolean) {
  try {
    window.localStorage.setItem(key, String(value))
  } catch {
    // Storage may be blocked. Preferences are not essential to the match.
  }
}

export const usePreferences = create<PreferencesState>((set, get) => ({
  muted: readBoolean('pc.muted', false),
  reducedMotion: readBoolean('pc.reduceMotion', false),
  setMuted: (muted) => {
    save('pc.muted', muted)
    set({ muted })
  },
  toggleMuted: () => get().setMuted(!get().muted),
  setReducedMotion: (reducedMotion) => {
    save('pc.reduceMotion', reducedMotion)
    set({ reducedMotion })
  },
}))
