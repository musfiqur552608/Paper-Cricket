import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

interface DonutItem {
  label: string
  value: number
  color: string
}

interface DonutChartProps {
  title: string
  data: DonutItem[]
  subtitle?: string
  size?: number
}

export function DonutChart({ title, data, subtitle, size = 220 }: DonutChartProps) {
  const { t } = useTranslation()

  if (data.length === 0) {
    return (
      <div className="paper-card p-6 h-[220px] flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
        {t('admin.noData')}
      </div>
    )
  }

  const total = data.reduce((sum, d) => sum + d.value, 0)
  const cx = size / 2
  const cy = size / 2
  const r = (size - 50) / 2

  let startAngle = 0
  const arcs = data.map((d) => {
    const sweep = (d.value / total) * 360
    const endAngle = startAngle + sweep
    const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180)
    const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180)
    const x2 = cx + r * Math.cos((endAngle * Math.PI) / 180)
    const y2 = cy + r * Math.sin((endAngle * Math.PI) / 180)
    const largeArc = sweep > 180 ? 1 : 0
    const dPath = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`
    startAngle = endAngle
    return { dPath, pct: total > 0 ? ((d.value / total) * 100).toFixed(0) : '0', ...d }
  })

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="paper-card p-4 sm:p-5 overflow-hidden"
    >
      <div className="mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{title}</p>
        {subtitle && <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      <div className="flex flex-col items-center justify-center h-[180px]">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="text-ink-deep dark:text-ink-deep">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--card-border)" strokeWidth="8" className="dark:stroke-slate-700/40" />
          {arcs.map((arc, i) => (
            <motion.path
              key={i}
              d={arc.dPath}
              fill="none"
              stroke={arc.color}
              strokeWidth="10"
              strokeLinecap="round"
              className="dark:stroke-ink-soft"
              initial={{ strokeDasharray: `0 ${arc.dPath.length * 10}` }}
              animate={{
                strokeDasharray: `${arc.dPath.length * 0.98} ${arc.dPath.length * 10}`,
              }}
              transition={{ delay: i * 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}
          <text
            x={cx}
            y={cy + 5}
            textAnchor="middle"
            fontSize="16"
            fontWeight="800"
            fill="var(--ink-deep)"
            className="dark:fill-white"
          >
            {total}
          </text>
        </svg>
      </div>
      <div className="flex flex-wrap justify-center gap-3 mt-2">
        {arcs.map((arc) => (
          <span key={arc.label} className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: arc.color }} />
            {arc.label} <span className="text-slate-400">{arc.pct}%</span>
          </span>
        ))}
      </div>
    </motion.div>
  )
}
