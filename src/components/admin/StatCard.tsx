import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { TrendingUp, Users, Clock, BookOpen, AlertCircle } from 'lucide-react'
import clsx from 'clsx'

type StatVariant = 'primary' | 'pencil' | 'leaf' | 'alert'

const VARIANT: Record<StatVariant, { bg: string; border: string; icon: React.ElementType }> = {
  primary: { bg: 'bg-white/55 dark:bg-white/10', border: 'border-[var(--card-border)]', icon: TrendingUp },
  pencil: { bg: 'bg-pencil/10 dark:bg-pencil/10', border: 'border-pencil/20', icon: Users },
  leaf: { bg: 'bg-leaf/10 dark:bg-leaf/10', border: 'border-leaf/20', icon: Clock },
  alert: { bg: 'bg-amber-50/90 dark:bg-amber-50/20', border: 'border-amber-300/70', icon: AlertCircle },
}

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  variant?: StatVariant
  trend?: { label: string; up: boolean }
}

export function StatCard({
  title,
  value,
  subtitle,
  variant = 'primary',
  trend,
}: StatCardProps) {
  const { t } = useTranslation()
  const Icon = VARIANT[variant].icon

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={clsx(
        'paper-card p-5 sm:p-6 overflow-hidden',
        VARIANT[variant].bg,
        VARIANT[variant].border,
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <motion.span
            whileInView={{ opacity: [0, 1], y: [10, 0] }}
            transition={{ duration: 0.6 }}
            className={clsx(
              'font-hand text-[38px] font-bold leading-none tracking-tight text-ink-deep sm:text-[48px]',
              variant === 'pencil' ? 'text-pencil' : variant === 'leaf' ? 'text-leaf' : 'text-ink',
            )}
          >
            {value}
          </motion.span>
          {subtitle && (
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-end gap-1">
          <Icon size={20} className="text-slate-400 dark:text-slate-500" />
          {trend && (
            <span className={`text-[11px] font-semibold leading-none ${
              trend.up ? 'text-leaf dark:text-leaf' : 'text-pencil dark:text-pencil'
            }`}>
              {trend.up ? '▲' : '▼'} {trend.label}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
