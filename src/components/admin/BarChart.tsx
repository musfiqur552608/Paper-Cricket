import { motion } from 'framer-motion'

export interface BarItem {
  label: string
  value: number
  color?: string
}

interface BarChartProps {
  data: BarItem[]
  emptyLabel?: string
  valueFormatter?: (value: number) => string
}

const COLORS = [
  'var(--chart-blue)',
  'var(--chart-green)',
  'var(--chart-red)',
  'var(--chart-amber)',
  'var(--chart-purple)',
  'var(--chart-gray)',
]

export function BarChart({ data, emptyLabel, valueFormatter = (value) => String(value) }: BarChartProps) {
  if (data.length === 0) {
    return <div className="flex h-[180px] items-center justify-center text-sm text-slate-400">{emptyLabel}</div>
  }

  const total = data.reduce((sum, item) => sum + item.value, 0)
  const max = Math.max(...data.map((item) => item.value), 1)

  return (
    <div className="space-y-4">
      {data.map((item, index) => {
        const color = item.color ?? COLORS[index % COLORS.length]!
        const width = (item.value / max) * 100
        const share = total > 0 ? Math.round((item.value / total) * 100) : 0
        return (
          <div key={item.label}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-xs font-semibold text-ink-deep">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <span className="truncate">{item.label}</span>
              </span>
              <span className="shrink-0 text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                {valueFormatter(item.value)}
                <span className="ml-1 text-[10px] text-slate-400">{share}%</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--ink-ghost-2)]">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(width, item.value > 0 ? 2 : 0)}%` }}
                transition={{ duration: 0.6, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
