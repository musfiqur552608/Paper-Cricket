import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Palette, PenTool } from 'lucide-react'
import clsx from 'clsx'
import type { PenStyleId, PaperThemeId } from '../../types/game'
import { PAPER_THEMES, PEN_STYLES, getPaperTheme, getPenStyle } from '../../config/themes'
import { Pen3D } from '../board/Pen3D'
import { ColorModeControl } from './Toggles'
import { useThemePrefs } from '../../store/preferences'
import { sound, haptic } from '../../lib/sound'
import { updatePlayerTheme } from '../../lib/supabase/api'

interface ThemePenPickerProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  roomId: string
  currentTheme: PaperThemeId | null
  currentPen: PenStyleId | null
  disabled?: boolean
  hideSave?: boolean
}

export function ThemePenPicker({
  open,
  onClose,
  onSaved,
  roomId,
  currentTheme,
  currentPen,
  disabled = false,
  hideSave = false,
}: ThemePenPickerProps) {
  const { t } = useTranslation()
  const { paperThemeId: savedTheme, penStyleId: savedPen, setThemePrefs } = useThemePrefs()
  const [theme, setTheme] = useState<PaperThemeId | null>(savedTheme ?? currentTheme ?? 'notebook')
  const [pen, setPen] = useState<PenStyleId | null>(savedPen ?? currentPen ?? 'clear')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const prevThemeRef = useRef(theme)
  const prevPenRef = useRef(pen)

  // Re-seed the selection each time the picker opens. Local storage wins so a
  // choice made before the server sync works still survives a reopen.
  useEffect(() => {
    if (!open) return
    setTheme(savedTheme ?? currentTheme ?? 'notebook')
    setPen(savedPen ?? currentPen ?? 'clear')
    setSaved(false)
    setSaving(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Play a subtle sound when switching themes so the change feels tactile.
  useEffect(() => {
    if (prevThemeRef.current !== theme) {
      prevThemeRef.current = theme
      if (!saved) sound.tone(900, 0.02, 'sine', 0.02)
    }
    if (prevPenRef.current !== pen) {
      prevPenRef.current = pen
      if (!saved) sound.tone(700, 0.02, 'sine', 0.02)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, pen, saved])

  const paperTheme = useMemo(() => getPaperTheme(theme), [theme])
  const penStyle = useMemo(() => getPenStyle(pen), [pen])

  async function handleSave() {
    if (saving) return
    setSaving(true)
    // Local storage is the source of truth for this browser and always works,
    // even before the Supabase migration is applied.
    setThemePrefs({ paperThemeId: theme, penStyleId: pen })
    try {
      await updatePlayerTheme(roomId, { paperThemeId: theme ?? 'notebook', penStyleId: pen ?? 'clear' })
    } catch {
      // A missing migration or offline blip must not block the local look.
    }
    setSaved(true)
    sound.tone(660, 0.06, 'sine', 0.05)
    sound.tone(880, 0.05, 'sine', 0.04, 0.06)
    haptic([8, 20])
    window.setTimeout(() => {
      setSaving(false)
      setSaved(false)
      onSaved()
      onClose()
    }, 600)
  }

  const themePicks = PAPER_THEMES.map((item) => ({
    ...item,
    active: theme === item.id,
  }))
  const penPicks = PEN_STYLES.map((item) => ({
    ...item,
    active: pen === item.id,
  }))

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="theme-picker-title"
    >
      <div
        className="absolute inset-0 cursor-default bg-[#2a2418]/45 backdrop-blur-[2px]"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        className={clsx(
          'paper-card paper-card-hover relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-b-none shadow-desk sm:rounded-[26px] sm:max-w-2xl',
          'animate-in fade-in slide-in-from-top-4 duration-300',
        )}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-ink/25 to-transparent dark:via-white/15" />
        <header className="flex items-start justify-between gap-4 px-5 pb-3 pt-5 sm:px-7 sm:pt-6">
          <div>
            <p className="mb-1 flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.22em] text-pencil">
              <Palette size={14} /> {t('theme.picker.title')}
            </p>
            <h2 id="theme-picker-title" className="font-hand text-[34px] font-bold leading-[1.05] text-ink-deep sm:text-[38px]">
              {t('theme.picker.pickYourLook')}
            </h2>
            <div className="mt-2">
              <ColorModeControl />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="btn-ghost -mr-2 -mt-1 h-9 w-9 shrink-0 rounded-full p-0 disabled:opacity-50 disabled:pointer-events-none"
            disabled={disabled}
          >
            <span className="text-[20px] leading-none">✕</span>
          </button>
        </header>

        <div className="no-scrollbar min-h-0 overflow-y-auto px-5 pb-[calc(1rem+var(--safe-bottom))] sm:px-7">
          <div className="space-y-6">
            {/* Paper theme grid */}
            <section>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    <span className="grid h-4 w-4 place-items-center rounded-full" style={{ backgroundColor: paperTheme.sheetBg, border: `1px solid ${paperTheme.sheetBorder}` }} />
                    {t('theme.picker.paper')}
                  </p>
                  <p className="text-[11px] text-slate-500">{t('theme.picker.paperSub')}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                {themePicks.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={item.active}
                    aria-label={item.name}
                    disabled={disabled}
                    onClick={() => {
                      if (disabled) return
                      setTheme(item.id as PaperThemeId)
                      sound.click()
                      haptic(6)
                    }}
                    className={clsx(
                      'group relative flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2 transition-all duration-150',
                      item.active
                        ? 'ring-1 ring-inset ring-current'
                        : 'border-[#d8c7a2]/40 bg-white/60 hover:border-ink/50 hover:bg-white',
                    )}
                    style={{
                      backgroundColor: item.sheetBg,
                      color: item.label,
                      borderColor: item.active ? item.label : undefined,
                      boxShadow: item.active ? `0 0 0 3px ${item.label}2e` : undefined,
                    }}
                  >
                    <div
                      className="relative h-10 w-full overflow-hidden rounded-lg border border-current/20 shadow-sm transition-transform duration-150 group-hover:scale-105 sm:h-12"
                      style={{
                        background: `linear-gradient(135deg, ${item.wedgeEven}, ${item.wedgeOdd})`,
                      }}
                    >
                      {item.active && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <CheckCircle2 size={14} style={{ color: item.label }} />
                        </div>
                      )}
                    </div>
                    <span
                      className="text-[9px] font-semibold leading-tight text-center"
                      style={{ color: item.label, opacity: item.active ? 1 : 0.78 }}
                    >
                      {item.name}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Pen style grid */}
            <section>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    <PenTool size={14} /> {t('theme.picker.pen')}
                  </p>
                  <p className="text-[11px] text-slate-500">{t('theme.picker.penSub')}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {penPicks.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={pen === item.id}
                    aria-label={item.name}
                    disabled={disabled}
                    onClick={() => {
                      if (disabled) return
                      setPen(item.id as PenStyleId)
                      sound.click()
                      haptic(6)
                    }}
                    className={clsx(
                      'relative flex flex-col items-center justify-center gap-0.5 rounded-xl border px-2 pb-1.5 pt-1 transition-all duration-150',
                      pen === item.id
                        ? 'border-ink ring-1 ring-inset ring-ink bg-ink/5 shadow-[0_0_0_3px_rgba(35,78,139,.12)]'
                        : 'border-[#d8c7a2]/40 bg-white/60 hover:border-ink/50 hover:bg-white',
                    )}
                  >
                    <div className="h-8 w-full">
                      <Pen3D className="h-full w-full" style={item} />
                    </div>
                    <span className="text-[9px] font-semibold leading-tight text-center text-ink/70">
                      {item.name}
                    </span>
                    {pen === item.id && (
                      <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-paper-50 shadow-sm">
                        <CheckCircle2 size={11} className="text-ink" aria-hidden="true" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>

            {/* Live preview */}
            <section className="rounded-xl border border-[#d8c7a2]/50 bg-[#fffdf6]/40 p-4 dark:border-slate-600/35 dark:bg-white/10">
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div
                  className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border border-ink/20 shadow-sm"
                  style={{ backgroundColor: paperTheme.sheetBg }}
                >
                  <div
                    className="h-full w-full"
                    style={{
                      background: `radial-gradient(circle at 30% 30%, ${paperTheme.wedgeEven}, ${paperTheme.wedgeOdd})`,
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    {t('theme.picker.preview')}
                  </p>
                  <p className="font-hand text-[20px] font-bold leading-none text-ink-deep">
                    {paperTheme.name}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-500">{penStyle.name}</p>
                </div>
                <div className="w-full flex-shrink-0 rounded-lg border border-[#d8c7a2]/40 bg-white/60 px-2 py-1 sm:w-44 dark:border-slate-600/35 dark:bg-white/10">
                  <Pen3D className="h-10 w-full" style={penStyle} />
                </div>
              </div>
            </section>
          </div>
        </div>

        {!hideSave && (
          <footer className="border-t border-[#dfd1b7] bg-paper-100/60 px-5 py-4 sm:px-7 flex items-center justify-between gap-3">
            <span className="text-[10px] text-slate-400">
              {saved ? t('theme.picker.saved') : t('theme.picker.saveNote')}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={disabled}
                className="btn-ghost disabled:opacity-50 disabled:pointer-events-none"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || disabled}
                className="btn-primary disabled:opacity-50 disabled:pointer-events-none"
              >
                {saving ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  )
}
