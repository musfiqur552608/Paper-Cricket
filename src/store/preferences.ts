import { create } from 'zustand'
import type { PenStyleId, PaperThemeId } from '../config/themes'
import { DEFAULT_PAPER_THEME, DEFAULT_PEN_STYLE, isPenStyleId, isPaperThemeId } from '../config/themes'

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

/**
 * Theme & pen preferences stored per-user locally and synced to a room.
 * These live in localStorage so a returning player sees their last choice,
 * and they are written to Supabase when joining a room so each seat can
 * render its own paper and pen.
 */
export type ThemePrefs = {
  paperThemeId: PaperThemeId | null
  penStyleId: PenStyleId | null
  configured: boolean
}

function readString(key: string, fallback: string | null): string | null {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ?? fallback
  } catch {
    return fallback
  }
}

function writeString(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    // Storage may be blocked; theme is cosmetic only.
  }
}

export const useThemePrefs = create<ThemePrefs & {
  setThemePrefs: (prefs: Omit<ThemePrefs, 'configured'>) => void
}>((set) => {
  const storedPaper = readString('pc.paperTheme', DEFAULT_PAPER_THEME)
  const storedPen = readString('pc.penStyle', DEFAULT_PEN_STYLE)
  const storedConfigured = readString('pc.themeConfigured', 'false') === 'true'
  return {
    paperThemeId: isPaperThemeId(storedPaper) ? storedPaper : DEFAULT_PAPER_THEME,
    penStyleId: isPenStyleId(storedPen) ? storedPen : DEFAULT_PEN_STYLE,
    configured: storedConfigured,
    setThemePrefs: (prefs) => {
      writeString('pc.paperTheme', prefs.paperThemeId ?? DEFAULT_PAPER_THEME)
      writeString('pc.penStyle', prefs.penStyleId ?? DEFAULT_PEN_STYLE)
      writeString('pc.themeConfigured', 'true')
      set({
        paperThemeId: prefs.paperThemeId ?? DEFAULT_PAPER_THEME,
        penStyleId: prefs.penStyleId ?? DEFAULT_PEN_STYLE,
        configured: true,
      })
    },
  }
})
