import { useId, useMemo, useState } from 'react'
import { motion } from 'framer-motion'

export interface ChartPoint {
  label: string
  value: number
  fullLabel?: string
}

interface LineChartProps {
  data: ChartPoint[]
  accent?: string
  height?: number
  valueFormatter?: (value: number) => string
  emptyLabel?: string
  ariaLabel?: string
}

const WIDTH = 720

function niceMax(value: number): number {
  if (value <= 0) return 4
  const rough = value / 4
  const power = Math.pow(10, Math.floor(Math.log10(rough)))
  const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * power >= rough) ?? 10
  return step * power * 4
}

function formatTick(value: number): string {
  if (value >= 1000) return `${Math.round(value / 100) / 10}k`
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(1)
}

function smoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M${points[0]!.x},${points[0]!.y}`
  let d = `M${points[0]!.x},${points[0]!.y}`
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]!
    const curr = points[i]!
    const midX = (prev.x + curr.x) / 2
    d += ` C${midX},${prev.y} ${midX},${curr.y} ${curr.x},${curr.y}`
  }
  return d
}

export function LineChart({
  data,
  accent = 'var(--ink-mid)',
  height = 260,
  valueFormatter = (value) => String(value),
  emptyLabel,
  ariaLabel,
}: LineChartProps) {
  const gradientId = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const [hover, setHover] = useState<number | null>(null)

  const padding = { left: 46, right: 18, top: 18, bottom: 34 }
  const plotWidth = WIDTH - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const lastIndex = data.length - 1

  const chart = useMemo(() => {
    const values = data.map((point) => point.value)
    const max = niceMax(Math.max(...values, 0))
    const points = data.map((point, index) => ({
      x: padding.left + (index / Math.max(data.length - 1, 1)) * plotWidth,
      y: padding.top + plotHeight - (Math.max(point.value, 0) / max) * plotHeight,
    }))
    return { max, points, total: values.reduce((sum, value) => sum + value, 0) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, height])

  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">
        {emptyLabel}
      </div>
    )
  }

  const { max, points, total } = chart
  const linePath = smoothPath(points)
  const first = points[0]!
  const last = points[lastIndex]!
  const baseline = padding.top + plotHeight
  const areaPath = `${linePath} L${last.x},${baseline} L${first.x},${baseline} Z`

  const labelStep = data.length <= 8 ? 1 : Math.ceil(data.length / 7)
  const labelIndices = new Set<number>()
  for (let i = 0; i < data.length; i += labelStep) labelIndices.add(i)
  const lastLabelGap = lastIndex - (labelIndices.size - 1) * labelStep
  if (labelIndices.size > 0 && lastLabelGap > labelStep / 2) labelIndices.add(lastIndex)

  const hovered = hover != null ? data[hover] : null
  const hoveredPoint = hover != null ? points[hover] : null
  const bubbleWidth = 138
  const bubbleHeight = 42
  const bubbleX = hoveredPoint
    ? Math.min(Math.max(hoveredPoint.x - bubbleWidth / 2, padding.left), WIDTH - padding.right - bubbleWidth)
    : 0
  const bubbleY = hoveredPoint
    ? hoveredPoint.y - bubbleHeight - 12 < padding.top
      ? hoveredPoint.y + 14
      : hoveredPoint.y - bubbleHeight - 12
    : 0

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={ariaLabel}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`grad-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.32" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Horizontal grid + y-axis labels */}
        {[0, 1, 2, 3, 4].map((tick) => {
          const value = (max / 4) * tick
          const y = baseline - (tick / 4) * plotHeight
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                x2={WIDTH - padding.right}
                y1={y}
                y2={y}
                stroke="var(--card-border)"
                strokeWidth={1}
                strokeDasharray={tick === 0 ? undefined : '3 6'}
              />
              <text
                x={padding.left - 10}
                y={y + 3.5}
                textAnchor="end"
                fontSize="9.5"
                fill="var(--text-slate-500)"
              >
                {formatTick(value)}
              </text>
            </g>
          )
        })}

        {/* X-axis labels */}
        {data.map((point, index) =>
          labelIndices.has(index) ? (
            <text
              key={`x-${index}`}
              x={points[index]!.x}
              y={baseline + 20}
              textAnchor={index === 0 ? 'start' : index === lastIndex ? 'end' : 'middle'}
              fontSize="9.5"
              fill="var(--text-slate-500)"
            >
              {point.label}
            </text>
          ) : null,
        )}

        {/* Area + line */}
        <motion.path
          key={`area-${data.length}-${accent}`}
          d={areaPath}
          fill={`url(#grad-${gradientId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
        <motion.path
          key={`line-${data.length}-${accent}`}
          d={linePath}
          fill="none"
          stroke={accent}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Dots for short ranges */}
        {data.length <= 14 &&
          points.map((point, index) => (
            <circle
              key={`dot-${index}`}
              cx={point.x}
              cy={point.y}
              r={index === hover ? 4.5 : 3}
              fill={accent}
              stroke="var(--card-bg)"
              strokeWidth={2}
            />
          ))}
        {data.length > 14 && (
          <circle cx={last.x} cy={last.y} r={3.5} fill={accent} stroke="var(--card-bg)" strokeWidth={2} />
        )}

        {/* Hover targets */}
        {points.map((point, index) => {
          const band = plotWidth / Math.max(data.length - 1, 1)
          return (
            <rect
              key={`hit-${index}`}
              x={point.x - band / 2}
              y={padding.top}
              width={band}
              height={plotHeight}
              fill="transparent"
              onMouseEnter={() => setHover(index)}
              onFocus={() => setHover(index)}
              tabIndex={-1}
            />
          )
        })}

        {/* Crosshair + tooltip */}
        {hovered && hoveredPoint && (
          <g pointerEvents="none">
            <line
              x1={hoveredPoint.x}
              x2={hoveredPoint.x}
              y1={padding.top}
              y2={baseline}
              stroke="var(--ink-ghost)"
              strokeWidth={1.5}
              strokeDasharray="3 4"
            />
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r={5}
              fill={accent}
              stroke="var(--card-bg)"
              strokeWidth={2.5}
            />
            <g transform={`translate(${bubbleX},${bubbleY})`}>
              <rect
                width={bubbleWidth}
                height={bubbleHeight}
                rx={9}
                fill="var(--card-bg)"
                stroke="var(--card-border)"
              />
              <text x={11} y={16} fontSize="9" fill="var(--text-slate-500)">
                {hovered.fullLabel ?? hovered.label}
              </text>
              <text x={11} y={32} fontSize="13" fontWeight="700" fill="var(--ink-deep)">
                {valueFormatter(hovered.value)}
              </text>
            </g>
          </g>
        )}

        {total === 0 && emptyLabel && (
          <text
            x={padding.left + plotWidth / 2}
            y={padding.top + plotHeight / 2}
            textAnchor="middle"
            fontSize="12"
            fill="var(--text-slate-500)"
          >
            {emptyLabel}
          </text>
        )}
      </svg>
    </div>
  )
}
