import { useId } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { BOARD_SEGMENTS, SEGMENT_ANGLE } from '../../config/gameConfig'
import { PenGraphic } from './Pen3D'

const SIZE = 560
const CX = SIZE / 2
const CY = SIZE / 2
const R_OUTER = 250
const R_LABEL = 170
const R_HUB = 34

function pointOnCircle(radius: number, angleFromTop: number): [number, number] {
  const radians = ((angleFromTop - 90) * Math.PI) / 180
  return [CX + radius * Math.cos(radians), CY + radius * Math.sin(radians)]
}

/** A hand-drawn-ish circle made from sampled points. Deterministic per seed. */
function wobblyCircle(radius: number, seed: number, amplitude = 1.8): string {
  const steps = 72
  const points: string[] = []
  for (let i = 0; i < steps; i += 1) {
    const angle = (i / steps) * 360
    const wobble =
      Math.sin((i * 1.7 + seed) * 1.4) * amplitude + Math.cos((i * 2.3 + seed * 2) * 0.9) * amplitude * 0.45
    const [x, y] = pointOnCircle(radius + wobble, angle)
    points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`)
  }
  return `${points.join(' ')} Z`
}

function wedgePath(index: number, count: number): string {
  const half = 360 / count / 2
  const start = index * (360 / count) - half
  const end = index * (360 / count) + half
  const radius = R_OUTER + Math.sin(index * 2.1) * 1.4
  const [x1, y1] = pointOnCircle(radius, start)
  const [x2, y2] = pointOnCircle(radius, end)
  const largeArc = 360 / count > 180 ? 1 : 0
  return `M ${CX} ${CY} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`
}

function spokePath(index: number, count: number): string {
  const angle = index * (360 / count) - 360 / count / 2
  const [x1, y1] = pointOnCircle(R_HUB - 2, angle)
  const [x2, y2] = pointOnCircle(R_OUTER - 1, angle + 0.12)
  const [cx, cy] = pointOnCircle((R_HUB + R_OUTER) / 2, angle + 0.32)
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

export interface BoardProps {
  rotation?: number
  highlightIndex?: number | null
  aimAngle?: number | null
  aimActive?: boolean
  penAtEnd?: boolean
  revealed?: boolean
  className?: string
  transitionMs?: number
  showAim?: boolean
  compact?: boolean
}

export function Board({
  rotation = 0,
  highlightIndex = null,
  aimAngle = null,
  aimActive = false,
  penAtEnd = false,
  revealed = false,
  className,
  transitionMs = 0,
  showAim = true,
  compact = false,
}: BoardProps) {
  const { t } = useTranslation()
  const rawId = useId()
  const uid = rawId.replace(/[:]/g, '')
  const roughId = `rough-${uid}`
  const glowId = `glow-${uid}`
  const hatchId = `hatch-${uid}`

  const aimEnd = aimAngle != null ? pointOnCircle(R_OUTER - 34, aimAngle) : null
  const aimStart = aimAngle != null ? pointOnCircle(R_HUB + 4, aimAngle) : null
  const penPoint = aimAngle != null ? pointOnCircle(R_OUTER - 8, aimAngle) : null

  return (
    <div className={clsx('relative aspect-square w-full select-none', className)}>
      {/* paper sheet under the board */}
      <div className="absolute inset-[1.5%] rotate-[-0.8deg] rounded-[4%] border border-[#d6c7a9] bg-[#fffdf6] shadow-[0_22px_45px_-20px_rgba(60,45,17,.5),0_2px_0_rgba(255,255,255,.7)_inset]" />
      <div className="absolute inset-[3%] rotate-[0.5deg] rounded-[3%] border border-[#e3d8c2]/80" />
      {/* tape strips */}
      <div className="absolute -left-[1%] top-[19%] h-[6%] w-[13%] -rotate-[32deg] bg-[#e7cfa1]/55 shadow-sm" aria-hidden="true" />
      <div className="absolute -right-[1%] bottom-[21%] h-[6%] w-[12%] rotate-[27deg] bg-[#e7cfa1]/50 shadow-sm" aria-hidden="true" />

      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="relative z-10 h-full w-full overflow-visible"
        role="img"
        aria-label={t('board.aria')}
      >
        <defs>
          <filter id={roughId} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.014 0.02" numOctaves="2" seed="4" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feFlood floodColor="#e9a23b" floodOpacity="0.65" />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <pattern id={hatchId} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
            <line x1="0" y1="0" x2="0" y2="9" stroke="#234e8b" strokeWidth="1.1" opacity="0.12" />
          </pattern>
        </defs>

        {/* board group: this is what rotates */}
        <g
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: `${CX}px ${CY}px`,
            transition: transitionMs > 0 ? `transform ${transitionMs}ms cubic-bezier(.16,.8,.22,1)` : 'none',
            willChange: transitionMs > 0 ? 'transform' : undefined,
          }}
        >
          <g filter={`url(#${roughId})`}>
            {BOARD_SEGMENTS.map((segment, index) => {
              const isHighlighted = highlightIndex === index
              const isWicket = segment.kind === 'wicket'
              return (
                <g key={segment.code}>
                  <path
                    d={wedgePath(index, BOARD_SEGMENTS.length)}
                    fill={
                      isHighlighted
                        ? '#f6cf72'
                        : index % 2 === 0
                          ? '#fffdf7'
                          : isWicket
                            ? '#edf2fb'
                            : '#f6f1e6'
                    }
                    stroke="none"
                    opacity={isHighlighted ? 0.96 : 1}
                  />
                  {isWicket ? (
                    <path d={wedgePath(index, BOARD_SEGMENTS.length)} fill={`url(#${hatchId})`} stroke="none" />
                  ) : null}
                  <path
                    d={wedgePath(index, BOARD_SEGMENTS.length)}
                    fill="none"
                    stroke={isHighlighted ? '#b87812' : 'transparent'}
                    strokeWidth={isHighlighted ? 3.2 : 0}
                  />
                </g>
              )
            })}

            {/* outer rings */}
            <path d={wobblyCircle(252, 2, 2.1)} fill="none" stroke="#234e8b" strokeWidth="3.1" strokeLinecap="round" />
            <path d={wobblyCircle(243, 9, 1.3)} fill="none" stroke="#234e8b" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
            <path
              d={wobblyCircle(257, 15, 1.2)}
              fill="none"
              stroke="#234e8b"
              strokeWidth="1"
              strokeLinecap="round"
              strokeDasharray="2.5 5"
              opacity="0.35"
            />

            {/* spokes */}
            {BOARD_SEGMENTS.map((segment, index) => (
              <path
                key={`spoke-${segment.code}`}
                d={spokePath(index, BOARD_SEGMENTS.length)}
                fill="none"
                stroke="#234e8b"
                strokeWidth={index === 0 ? 2 : 1.75}
                strokeLinecap="round"
                opacity={0.88}
              />
            ))}

            {/* labels, tangential, like writing around a circle */}
            {BOARD_SEGMENTS.map((segment, index) => {
              const baseAngle = index * SEGMENT_ANGLE
              const [x, y] = pointOnCircle(R_LABEL, baseAngle)
              const flip = baseAngle > 90 && baseAngle < 270
              const rotationDeg = baseAngle + (flip ? 180 : 0)
              const isHighlighted = highlightIndex === index
              return (
                <g
                  key={`label-${segment.code}`}
                  transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rotationDeg.toFixed(2)})`}
                  style={{ transition: 'opacity .2s' }}
                >
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontFamily="Caveat, Hind Siliguri, cursive"
                    fontSize={compact ? 27 : 31}
                    fontWeight={700}
                    letterSpacing="0.01em"
                    fill={isHighlighted ? '#7a4b0a' : '#234e8b'}
                    style={{ filter: isHighlighted ? 'drop-shadow(0 1px 0 rgba(255,255,255,.45))' : undefined }}
                  >
                    {segment.labelEn}
                  </text>
                  <path
                    d={`M -13 17 Q 0 20.5 14 16`}
                    fill="none"
                    stroke={isHighlighted ? '#a76510' : '#234e8b'}
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    opacity={isHighlighted ? 0.8 : 0.28}
                  />
                </g>
              )
            })}

            {/* centre hub */}
            <circle cx={CX} cy={CY} r={R_HUB + 6} fill="#fffdf7" stroke="none" />
            <path
              d={wobblyCircle(R_HUB + 4.5, 8, 0.8)}
              fill="none"
              stroke="#234e8b"
              strokeWidth="2.6"
            />
            <path
              d={wobblyCircle(R_HUB - 1, 17, 0.7)}
              fill="none"
              stroke="#234e8b"
              strokeWidth="1.15"
              opacity="0.5"
            />
            <circle cx={CX} cy={CY} r={3.4} fill="#234e8b" />
            <path d={`M ${CX - 9} ${CY - 7} l 2.2 2.6 M ${CX + 8} ${CY + 9} l 2.2 2.6`} stroke="#c8544a" strokeWidth="1.5" strokeLinecap="round" opacity=".65" />
          </g>
        </g>

        {/* aim overlay lives in screen space, NOT rotated with the board */}
        {showAim && aimAngle != null && aimStart && aimEnd && (
          <g className="pointer-events-none">
            {revealed && highlightIndex != null ? (
              <circle
                cx={aimEnd[0]}
                cy={aimEnd[1]}
                r={45}
                fill="#f2c75f"
                opacity={0.32}
                filter={`url(#${glowId})`}
              />
            ) : null}
            <line
              x1={aimStart[0]}
              y1={aimStart[1]}
              x2={aimEnd[0]}
              y2={aimEnd[1]}
              stroke="#c8544a"
              strokeWidth={aimActive ? 4 : 3}
              strokeLinecap="round"
              strokeDasharray={aimActive && !penAtEnd ? '9 11' : undefined}
              opacity={aimActive ? 0.92 : 0.8}
            />
            <circle cx={aimStart[0]} cy={aimStart[1]} r={4} fill="#fffdf7" stroke="#c8544a" strokeWidth="2" />
            {penAtEnd && penPoint ? (
              <g transform={`translate(${penPoint[0]} ${penPoint[1]}) rotate(${aimAngle + 90}) scale(0.62)`}>
                <PenGraphic />
              </g>
            ) : null}
          </g>
        )}
      </svg>
      {/* tiny margin scribbles */}
      <span className="absolute bottom-[3.5%] right-[7%] font-hand text-[11px] text-ink/40 sm:text-[13px]">
        {t('board.paperCricket')}
      </span>
      <span className="absolute left-[7%] top-[4%] font-hand text-[10px] tracking-wide text-ink/30 sm:text-xs">
        {t('board.exerciseBook')}
      </span>
    </div>
  )
}
