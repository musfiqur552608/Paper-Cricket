import { useTranslation } from 'react-i18next'
import { Languages, Volume2, VolumeX, Sparkles, Zap } from 'lucide-react'
import { sound } from '../../lib/sound'
import { usePreferences } from '../../store/preferences'
import clsx from 'clsx'

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { i18n, t } = useTranslation()
  const isBn = i18n.language.startsWith('bn')

  function choose(language: 'bn' | 'en') {
    sound.click()
    void i18n.changeLanguage(language)
    try {
      window.localStorage.setItem('pc.lang', language)
      document.documentElement.lang = language
    } catch {
      // ignore storage failures
    }
  }

  return (
    <div
      className="flex items-center rounded-full border border-[#d3c2a0] bg-paper-50/80 p-0.5 shadow-sm"
      role="group"
      aria-label={t('common.language')}
    >
      <Languages size={13} className={clsx('ml-2 mr-1.5 text-slate-500', compact && 'hidden sm:block')} aria-hidden="true" />
      {(['bn', 'en'] as const).map((language) => {
        const active = (language === 'bn') === isBn
        return (
          <button
            key={language}
            type="button"
            onClick={() => choose(language)}
            aria-pressed={active}
            className={clsx(
              'rounded-full px-2 py-1 text-[11px] font-bold uppercase tracking-wide transition',
              active ? 'bg-ink text-white shadow-sm' : 'text-slate-600 hover:bg-ink/5',
            )}
          >
            {language === 'bn' ? 'বাংলা' : 'EN'}
          </button>
        )
      })}
    </div>
  )
}

export function SoundToggle() {
  const { t } = useTranslation()
  const muted = usePreferences((state) => state.muted)
  const toggleMuted = usePreferences((state) => state.toggleMuted)

  return (
    <button
      type="button"
      onClick={() => {
        toggleMuted()
        if (muted) {
          setTimeout(() => sound.click(), 20)
        }
      }}
      aria-label={muted ? t('audio.toggleOn') : t('audio.toggleOff')}
      aria-pressed={!muted}
      title={muted ? t('common.unmute') : t('common.mute')}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#d3c2a0] bg-paper-50/80 text-ink shadow-sm transition hover:bg-white"
    >
      {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
    </button>
  )
}

export function MotionToggle() {
  const { t } = useTranslation()
  const reducedMotion = usePreferences((state) => state.reducedMotion)
  const setReducedMotion = usePreferences((state) => state.setReducedMotion)
  return (
    <button
      type="button"
      onClick={() => setReducedMotion(!reducedMotion)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#ded0b6] bg-white/50 px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-white"
      aria-pressed={reducedMotion}
    >
      <span className="flex items-center gap-2">
        {reducedMotion ? <Zap size={16} className="text-pencil" /> : <Sparkles size={16} className="text-ink" />}
        <span>{t('reducedMotion.label')}</span>
      </span>
      <span className="text-xs font-semibold text-slate-500">
        {reducedMotion ? t('reducedMotion.on') : t('reducedMotion.off')}
      </span>
    </button>
  )
}
