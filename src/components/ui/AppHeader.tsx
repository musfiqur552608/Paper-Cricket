import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Logo } from './Logo'
import { LanguageToggle, SoundToggle } from './Toggles'
import clsx from 'clsx'

export function AppHeader({
  onHowToPlay,
  className,
  compact,
  brandLink = true,
}: {
  onHowToPlay?: () => void
  className?: string
  compact?: boolean
  brandLink?: boolean
}) {
  const { t } = useTranslation()
  return (
    <header className={clsx('relative z-30 w-full', className)}>
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo compact={compact} link={brandLink} />
        <div className="flex items-center gap-2">
          {onHowToPlay ? (
            <button
              type="button"
              onClick={onHowToPlay}
              className="hidden rounded-full px-3 py-2 text-[13px] font-semibold text-ink transition hover:bg-ink/10 sm:inline-flex"
            >
              {t('common.howToPlay')}
            </button>
          ) : null}
          <LanguageToggle />
          <SoundToggle />
        </div>
      </div>
    </header>
  )
}

export function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-8 pt-4 text-center">
      <div className="mx-auto mb-4 h-px w-28 bg-ink/20" />
      <p className="mx-auto max-w-lg text-xs leading-relaxed text-slate-500">{t('landing.footer')}</p>
      <p className="mt-2 font-hand text-lg text-ink/60">
        <Link to="/" className="transition hover:text-ink">
          Paper Cricket · কাগজের ক্রিকেট
        </Link>
      </p>
    </footer>
  )
}

export function GameDoodle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" aria-hidden="true" className={className}>
      <path
        d="M42 94 C40 72 40 51 43 36 C44 28 51 27 53 34 L58 82 C58 88 66 89 68 83 L74 45 C75 38 83 39 83 47 L82 90"
        stroke="#234e8b"
        strokeWidth="2"
        strokeLinecap="round"
        opacity=".75"
      />
      <path d="M52 56 L76 63 M51 70 L79 78 M50 84 L76 91" stroke="#234e8b" strokeWidth="1.5" strokeLinecap="round" opacity=".4" />
      <path d="M27 101 C44 95 84 106 101 94" stroke="#c8544a" strokeWidth="2" strokeLinecap="round" />
      <circle cx="96" cy="27" r="8" stroke="#c8544a" strokeWidth="1.5" strokeDasharray="2 3" />
    </svg>
  )
}
