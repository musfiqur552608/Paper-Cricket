import { create } from 'zustand'
import type { PenStyleId, PaperThemeId } from '../config/themes'
import { DEFAULT_PAPER_THEME, DEFAULT_PEN_STYLE, isPenStyleId, isPaperThemeId } from '../config/themes'

/**
 * Colour mode: 'light', 'dark' or 'auto' (follow the device).
 * Stored in localStorage; the resolved value flips a `.dark` class on <html>
 * which Tailwind's `dark:` variant keys off.
 */
export type ColorMode = 'light' | 'dark' | 'auto'

export function isColorMode(value: unknown): value is ColorMode {
  return value === 'light' || value === 'dark' || value === 'auto'
}

const COLOR_MODE_KEY = 'pc.colorMode'

export function readColorMode(): ColorMode {
  try {
    const raw = window.localStorage.getItem(COLOR_MODE_KEY)
    return isColorMode(raw) ? raw : 'auto'
  } catch {
    return 'auto'
  }
}

export function applyColorMode(mode: ColorMode) {
  if (typeof document === 'undefined') return
  const systemDark =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  const resolved = mode === 'auto' ? (systemDark ? 'dark' : 'light') : mode
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  document.documentElement.dataset.colorMode = resolved
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#0b0f1a' : '#faf5e7')
}

export function persistColorMode(mode: ColorMode) {
  try {
    window.localStorage.setItem(COLOR_MODE_KEY, mode)
  } catch {
    // storage blocked; mode still applies for this session
  }
}

interface PreferencesState {
  muted: boolean
  reducedMotion: boolean
  colorMode: ColorMode
  setMuted: (muted: boolean) => void
  toggleMuted: () => void
  setReducedMotion: (value: boolean) => void
  setColorMode: (mode: ColorMode) => void
  cycleColorMode: () => void
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

export const usePreferences = create<PreferencesState>((set, get) => {
  const initialMode = readColorMode()
  applyColorMode(initialMode)
  const systemMedia: MediaQueryList | null =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null
  // Keep 'auto' honest when the OS flips between light and dark.
  systemMedia?.addEventListener?.('change', () => {
    if (get().colorMode === 'auto') applyColorMode('auto')
  })
  return {
    muted: readBoolean('pc.muted', false),
    reducedMotion: readBoolean('pc.reduceMotion', false),
    colorMode: initialMode,
    setMuted: (muted) => {
      save('pc.muted', muted)
      set({ muted })
    },
    toggleMuted: () => get().setMuted(!get().muted),
    setReducedMotion: (reducedMotion) => {
      save('pc.reduceMotion', reducedMotion)
      set({ reducedMotion })
    },
    setColorMode: (colorMode) => {
      persistColorMode(colorMode)
      applyColorMode(colorMode)
      set({ colorMode })
    },
    cycleColorMode: () => {
      const order: ColorMode[] = ['light', 'auto', 'dark']
      const next = order[(order.indexOf(get().colorMode) + 1) % order.length] ?? 'light'
      get().setColorMode(next)
    },
  }
})

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
