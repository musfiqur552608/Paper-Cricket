import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PAPER_THEME,
  DEFAULT_PEN_STYLE,
  PAPER_THEMES,
  PEN_STYLES,
  darken,
  getPaperTheme,
  getPenStyle,
  lighten,
  mixHex,
} from './themes'

describe('appearance themes', () => {
  it('ships at least twenty paper themes with unique ids', () => {
    expect(PAPER_THEMES.length).toBeGreaterThanOrEqual(20)
    expect(new Set(PAPER_THEMES.map((theme) => theme.id)).size).toBe(PAPER_THEMES.length)
    for (const theme of PAPER_THEMES) {
      expect(theme.name.trim().length, theme.id).toBeGreaterThan(0)
      expect(theme.sheetBg, theme.id).toMatch(/^#[0-9a-f]{6}$/i)
      expect(theme.label, theme.id).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('ships at least twenty pen styles with unique ids', () => {
    expect(PEN_STYLES.length).toBeGreaterThanOrEqual(20)
    expect(new Set(PEN_STYLES.map((style) => style.id)).size).toBe(PEN_STYLES.length)
    for (const style of PEN_STYLES) {
      expect(style.name.trim().length, style.id).toBeGreaterThan(0)
      expect(style.barrelStart, style.id).toMatch(/^#[0-9a-f]{6}$/i)
      expect(style.ink, style.id).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('falls back to the classic look when an unknown id is passed', () => {
    expect(getPaperTheme('nope' as never).id).toBe(DEFAULT_PAPER_THEME)
    expect(getPenStyle('nope' as never).id).toBe(DEFAULT_PEN_STYLE)
  })

  it('mixes, lightens and darkens hex colours', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080')
    expect(lighten('#000000', 1)).toBe('#ffffff')
    expect(darken('#ffffff', 1)).toBe('#000000')
  })
})
