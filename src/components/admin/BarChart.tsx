import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

interface BarItem {
  label: string
  value: number
  color?: string
}

interface BarChartProps {
  title: string
  data: BarItem[]
  subtitle?: string
  height?: number
}

export function BarChart({ title, data, subtitle, height = 220 }: BarChartProps) {
  const { t } = useTranslation()

  if (data.length === 0) {
    return (
      <div className="paper-card p-6 h-[220px] flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
        {t('admin.noData')}
      </div>
    )
  }

  const max = Math.max(...data.map((d) => d.value), 1)
  const h = height - 60
  const gap = 14
  const barW = 26
  const colors = ['#234e8b', '#c8544a', '#1f5c3d', '#92400e', '#6b21a8', '#0f766e']

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="paper-card p-4 sm:p-5 overflow-hidden"
    >
      <div className="mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{title}</p>
        {subtitle && <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      <div className="flex items-end justify-between h-[200px] w-full pt-2 pb-10">
        {data.map((item, i) => {
          const pct = max === 0 ? 0 : (item.value / max) * 100
          const color = item.color ?? colors[i % colors.length]
          return (
            <motion.div
              key={item.label}
              className="flex flex-col items-center gap-2"
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className="w-[26px] rounded-t-xl transition-all duration-300 hover:scale-x-110"
                style={{
                  height: `${pct}%`,
                  background: `linear-gradient(to top, ${color}, ${color}dd)`,
                  boxShadow: `0 0 14px ${color}40`,
                }}
              />
              <span className="text-[10px] font-bold text-ink-deep dark:text-ink-deep leading-none">
                {item.value}
              </span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400 leading-none">
                {item.label}
              </span>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
