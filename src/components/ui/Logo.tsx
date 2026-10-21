import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import clsx from 'clsx'

export function Logo({
  compact = false,
  className,
  link = true,
}: {
  compact?: boolean
  className?: string
  /** Room screens lock the brand so nobody leaves a live sheet by accident. */
  link?: boolean
}) {
  const { t } = useTranslation()
  const content = (
    <>
      <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border-[2.2px] border-ink bg-paper-50 shadow-[1px_2px_0_rgba(35,78,139,.18)] transition-transform group-hover:rotate-[-8deg]">
        <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
          <path d="M16 4.5 L16 16 M16 16 L26 10 M16 16 L26 22 M16 16 L16 27.5 M16 16 L6 22 M16 16 L6 10" stroke="#234e8b" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="16" cy="16" r="2.6" fill="#c8544a" />
          <circle cx="16" cy="16" r="12" fill="none" stroke="#234e8b" strokeWidth="1.3" strokeDasharray="3 4" opacity=".55" />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-hand text-[24px] font-bold tracking-[0.01em] text-ink-deep">
          {compact ? t('common.appName') : t('common.bengaliName')}
        </span>
        <span className="mt-0.5 hidden text-[9.5px] font-semibold uppercase tracking-[0.22em] text-slate-500 sm:block">
          {t('common.appName')} · {t('common.backBench')}
        </span>
      </span>
    </>
  )

  const classes = clsx('group inline-flex items-center gap-2.5 rounded-lg', className)
  const label = `${t('common.appName')} — ${t('common.bengaliName')}`

  if (!link) {
    return (
      <span className={classes} aria-label={label}>
        {content}
      </span>
    )
  }

  return (
    <Link to="/" className={classes} aria-label={label}>
      {content}
    </Link>
  )
}
