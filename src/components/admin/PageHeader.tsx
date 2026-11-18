import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <div className="mb-2.5 flex items-center gap-2.5">
          <span className="h-1.5 w-7 rounded-full bg-[#c8544a]/70 dark:bg-[#e98a80]/70" aria-hidden="true" />
          {eyebrow && (
            <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
              {eyebrow}
            </span>
          )}
        </div>
        <h1 className="font-hand text-[34px] font-bold leading-none tracking-tight text-ink-deep sm:text-[42px]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
