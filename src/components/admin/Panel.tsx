import type { ReactNode } from 'react'
import clsx from 'clsx'

interface PanelProps {
  title?: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

/** Consistent paper card used across the admin panel. */
export function Panel({ title, subtitle, action, children, className, bodyClassName }: PanelProps) {
  return (
    <section className={clsx('paper-card overflow-hidden', className)}>
      {(title || subtitle || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--card-border)] px-5 py-4">
          <div className="min-w-0">
            {title && (
              <h3 className="text-[15px] font-bold tracking-tight text-ink-deep">{title}</h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{subtitle}</p>
            )}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={clsx('p-5', bodyClassName)}>{children}</div>
    </section>
  )
}
