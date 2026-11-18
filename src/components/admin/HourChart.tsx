import { motion } from 'framer-motion'
import clsx from 'clsx'

interface HourChartProps {
  data: Array<{ hour: number; value: number }>
  language: string
  emptyLabel?: string
  tooltipLabel?: (hour: number, value: number) => string
}

export function HourChart({ data, language, emptyLabel, tooltipLabel }: HourChartProps) {
  const max = Math.max(...data.map((point) => point.value), 1)
  const peak = data.reduce(
    (best, point) => (point.value > best.value ? point : best),
    { hour: 0, value: 0 },
  )

  const formatHour = (hour: number) =>
    new Intl.DateTimeFormat(language, { hour: 'numeric' }).format(new Date(2020, 0, 1, hour))

  if (data.length === 0) {
    return <div className="flex h-[170px] items-center justify-center text-sm text-slate-400">{emptyLabel}</div>
  }

  return (
    <div>
      <div className="relative flex h-[150px] items-end gap-[3px] border-b border-[var(--card-border)]">
        {[25, 50, 75].map((mark) => (
          <span
            key={mark}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-[var(--ink-ghost)]"
            style={{ bottom: `${mark}%` }}
          />
        ))}
        {data.map((point) => {
          const isPeak = point.value === peak.value && peak.value > 0
          const height = (point.value / max) * 100
          return (
            <div
              key={point.hour}
              className="group relative z-10 flex h-full flex-1 items-end"
              title={tooltipLabel?.(point.hour, point.value)}
            >
              <motion.div
                className={clsx(
                  'w-full rounded-t-[3px] transition-opacity',
                  isPeak
                    ? 'bg-[#c8544a]/80 group-hover:bg-[#c8544a] dark:bg-[#e98a80]/70 dark:group-hover:bg-[#e98a80]'
                    : 'bg-[#234e8b]/30 group-hover:bg-[#234e8b]/60 dark:bg-[#7fa6e0]/25 dark:group-hover:bg-[#7fa6e0]/50',
                )}
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(height, point.value > 0 ? 3 : 0)}%` }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-1.5 flex">
        {data.map((point) => (
          <span
            key={point.hour}
            className="flex-1 text-center text-[9px] font-semibold text-slate-400"
          >
            {point.hour % 6 === 0 ? formatHour(point.hour) : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
