import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { TrendingDown, TrendingUp, Minus, type LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import { Skeleton } from './Skeleton'

export type StatTone = 'ink' | 'leaf' | 'pencil' | 'amber'

const TONES: Record<StatTone, { wrap: string; icon: string }> = {
  ink: {
    wrap: 'bg-[#234e8b]/10 dark:bg-[#7fa6e0]/15',
    icon: 'text-[#234e8b] dark:text-[#a9c6f0]',
  },
  leaf: {
    wrap: 'bg-[#1f5c3d]/10 dark:bg-[#93c5a8]/15',
    icon: 'text-[#1f5c3d] dark:text-[#93c5a8]',
  },
  pencil: {
    wrap: 'bg-[#c8544a]/10 dark:bg-[#e98a80]/15',
    icon: 'text-[#c8544a] dark:text-[#e98a80]',
  },
  amber: {
    wrap: 'bg-[#e9a23b]/15 dark:bg-[#e9a23b]/20',
    icon: 'text-[#a16207] dark:text-[#fcd34d]',
  },
}

interface StatCardProps {
  title: string
  value: ReactNode
  hint?: ReactNode
  icon: LucideIcon
  tone?: StatTone
  /** Percentage change vs the previous period. */
  delta?: number | null
  deltaLabel?: string
  loading?: boolean
}

export function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  tone = 'ink',
  delta,
  deltaLabel,
  loading,
}: StatCardProps) {
  if (loading) {
    return (
      <div className="paper-card p-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="mt-5 h-3 w-24" />
        <Skeleton className="mt-2 h-9 w-20" />
        <Skeleton className="mt-2 h-3 w-28" />
      </div>
    )
  }

  const deltaPositive = delta != null && delta > 0
  const deltaNegative = delta != null && delta < 0
  const DeltaIcon = deltaPositive ? TrendingUp : deltaNegative ? TrendingDown : Minus

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      className="paper-card p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <span className={clsx('grid h-10 w-10 place-items-center rounded-xl', TONES[tone].wrap)}>
          <Icon size={19} className={TONES[tone].icon} />
        </span>

        {delta != null && (
          <span
            className={clsx(
              'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold',
              deltaPositive && 'bg-[#1f5c3d]/10 text-[#1f5c3d] dark:bg-[#93c5a8]/15 dark:text-[#93c5a8]',
              deltaNegative && 'bg-[#c8544a]/10 text-[#c8544a] dark:bg-[#e98a80]/15 dark:text-[#e98a80]',
              !deltaPositive && !deltaNegative && 'bg-slate-500/10 text-slate-500 dark:text-slate-400',
            )}
            title={deltaLabel}
            aria-label={deltaLabel ? `${delta > 0 ? '+' : ''}${delta}% ${deltaLabel}` : undefined}
          >
            <DeltaIcon size={12} />
            {deltaPositive ? '+' : ''}{delta}%
          </span>
        )}
      </div>

      <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <p className="mt-1 font-hand text-[42px] font-bold leading-none tracking-tight text-ink-deep tabular-nums">
        {value}
      </p>
      {hint && (
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{hint}</p>
      )}
    </motion.div>
  )
}
