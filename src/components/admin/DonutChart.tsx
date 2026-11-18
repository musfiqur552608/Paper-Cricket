import { motion } from 'framer-motion'

export interface DonutItem {
  label: string
  value: number
  color: string
}

interface DonutChartProps {
  data: DonutItem[]
  centerValue?: string | number
  centerLabel?: string
  emptyLabel?: string
}

const SIZE = 180
const CENTER = SIZE / 2
const RADIUS = 66
const STROKE = 15
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function DonutChart({ data, centerValue, centerLabel, emptyLabel }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  if (total === 0) {
    return <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">{emptyLabel}</div>
  }

  let cumulative = 0
  const segments = data.map((item) => {
    const fraction = item.value / total
    const dash = Math.max(fraction * CIRCUMFERENCE - 3, 0)
    const offset = -cumulative * CIRCUMFERENCE
    cumulative += fraction
    return { ...item, fraction, dash, offset }
  })

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={centerLabel}>
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="var(--ink-ghost-2)"
            strokeWidth={STROKE}
          />
          <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
            {segments.map((segment, index) => (
              <motion.circle
                key={segment.label}
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke={segment.color}
                strokeWidth={STROKE}
                strokeDasharray={`${segment.dash} ${CIRCUMFERENCE}`}
                strokeDashoffset={segment.offset}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: index * 0.07 }}
              />
            ))}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-hand text-[34px] font-bold leading-none text-ink-deep tabular-nums">
            {centerValue ?? total}
          </span>
          {centerLabel && (
            <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
              {centerLabel}
            </span>
          )}
        </div>
      </div>

      <div className="grid w-full grid-cols-2 gap-x-4 gap-y-2.5">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center justify-between gap-2 text-[11px]">
            <span className="flex min-w-0 items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
              <span className="truncate">{segment.label}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-ink-deep">
              {segment.value}
              <span className="ml-1 text-[9px] font-normal text-slate-400">
                {Math.round(segment.fraction * 100)}%
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
