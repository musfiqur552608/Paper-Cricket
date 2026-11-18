import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

interface ChartPoint {
  label: string
  value: number
}

interface LineChartProps {
  title: string
  data: ChartPoint[]
  subtitle?: string
  height?: number
  accent?: string
}

export function LineChart({ title, data, subtitle, height = 220, accent = '#234e8b' }: LineChartProps) {
  const { t } = useTranslation()

  if (data.length === 0) {
    return (
      <div className="paper-card p-6 h-[220px] flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
        {t('admin.noData')}
      </div>
    )
  }

  const values = data.map((d) => d.value)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const w = 100
  const h = height != null ? height - 40 : 180
  const padding = { left: 40, right: 20, top: 10, bottom: 34 }

  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * (w - padding.left - padding.right)
    const y = padding.top + h - ((d.value - min) / range) * h
    return { x, y }
  })

  const path = points
    .map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`))
    .join('')

  // guards ensure data.length > 0 when we reach here
  const first = points[0]!
  const last = points[points.length - 1]!
  const areaPath = first
    ? `M${padding.left},${padding.top + h} L${first.x},${first.y} ${path} L${last.x},${padding.top + h} Z`
    : `M${padding.left},${padding.top + h} L${padding.left},${padding.top + h} Z`

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="paper-card p-4 sm:p-5 overflow-hidden"
    >
      <div className="mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{title}</p>
        {subtitle && <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      <div className="relative h-[220px] w-full">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${w + padding.left + padding.right} ${height}`}
          className="text-ink-deep dark:text-ink-deep"
          aria-label={title}
          role="img"
        >
          <defs>
            <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.55" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.08" />
            </linearGradient>
          </defs>
          {/* Grid lines (calculation only, not rendered in this path) */}
          {/* Area fill */}
          <motion.path
            d={areaPath}
            fill="url(#chart-gradient)"
            className="dark:fill-ink/15"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          />
          {/* Line */}
          <motion.path
            d={path}
            fill="none"
            stroke={accent}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="dark:stroke-ink-soft"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          />
          {/* Dots */}
          {points.map((p, i) => (
            <motion.circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={0}
              fill={accent}
              className="dark:fill-ink-soft"
              initial={{ r: 0 }}
              animate={{ r: 3.5 }}
              transition={{ delay: 0.3 + i * 0.05, duration: 0.3 }}
            />
          ))}
          {/* Axis labels */}
          {data.map((d, i) => {
              const pt = points[i]!
              return (
                <text
                  key={i}
                  x={pt.x}
                  y={padding.top + h + 20}
                  textAnchor="middle"
                  fontSize="9"
                  fill="var(--text-slate-500)"
                  className="dark:fill-slate-400"
                >
                  {d.label}
                </text>
              )
            })}
          {data.map((d, i) => {
              const pt = points[i]!
              return (
                <text
                  key={`v-${i}`}
                  x={pt.x}
                  y={pt.y - 6}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill={accent}
                  className="dark:fill-ink-soft"
                >
                  {d.value}
                </text>
              )
            })}
        </svg>
      </div>
    </motion.div>
  )
}
