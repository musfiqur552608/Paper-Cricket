import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { EyeOff, Hourglass, Lock, PenLine, Timer } from 'lucide-react'
import clsx from 'clsx'
import { usePreferences } from '../../store/preferences'

type ScreenPhase = 'spinning' | 'aiming'

function angleFromEvent(event: React.PointerEvent<HTMLDivElement>): number {
  const rect = event.currentTarget.getBoundingClientRect()
  const x = event.clientX - rect.left - rect.width / 2
  const y = event.clientY - rect.top - rect.height / 2
  const degrees = (Math.atan2(x, -y) * 180) / Math.PI
  return ((degrees % 360) + 360) % 360
}

interface OpaqueScreenProps {
  visible: boolean
  phase: ScreenPhase
  interactive: boolean
  showAim: boolean
  aimAngle: number
  onAim: (angle: number) => void
  onSubmit: (angle: number) => void
  sliding: boolean
  remainingMs: number
  spinDurationMs: number
  reducedMotion: boolean
  spinningText?: string
}

export function OpaqueScreen({
  visible,
  phase,
  interactive,
  showAim,
  aimAngle,
  onAim,
  onSubmit,
  sliding,
  remainingMs,
  spinDurationMs,
  reducedMotion,
  spinningText,
}: OpaqueScreenProps) {
  const { t } = useTranslation()
  const [dragging, setDragging] = useState(false)
  const draggingRef = useRef(false)
  const padRef = useRef<HTMLDivElement>(null)
  const reducedPref = usePreferences((state) => state.reducedMotion)
  const reduced = reducedMotion || reducedPref
  const aimSeconds = Math.ceil(remainingMs / 1000)

  useEffect(() => {
    if (interactive) padRef.current?.focus({ preventScroll: true })
  }, [interactive])

  function releaseCapture(pointerId: number) {
    if (padRef.current?.hasPointerCapture(pointerId)) {
      padRef.current.releasePointerCapture(pointerId)
    }
  }

  function start(event: React.PointerEvent<HTMLDivElement>) {
    if (!interactive || sliding) return
    event.preventDefault()
    draggingRef.current = true
    setDragging(true)
    padRef.current?.setPointerCapture(event.pointerId)
    const angle = angleFromEvent(event)
    onAim(angle)
  }

  function move(event: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current || !interactive || sliding) return
    onAim(angleFromEvent(event))
  }

  function end(event: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return
    draggingRef.current = false
    setDragging(false)
    const angle = angleFromEvent(event)
    releaseCapture(event.pointerId)
    if (!interactive || sliding) return
    onAim(angle)
    onSubmit(angle)
  }

  function cancel(event: React.PointerEvent<HTMLDivElement>) {
    draggingRef.current = false
    setDragging(false)
    releaseCapture(event.pointerId)
  }

  function handleKey(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!interactive || sliding) return
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      const delta = event.key === 'ArrowLeft' ? -5 : 5
      const next = ((aimAngle + delta) % 360 + 360) % 360
      onAim(next)
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      const delta = event.key === 'ArrowUp' ? -15 : 15
      const next = ((aimAngle + delta) % 360 + 360) % 360
      onAim(next)
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSubmit(aimAngle)
    }
  }

  const radians = (aimAngle * Math.PI) / 180
  const aimRadius = sliding ? 178 : 128
  const endX = 200 + Math.sin(radians) * aimRadius
  const endY = 200 - Math.cos(radians) * aimRadius

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="screen"
          className="absolute inset-0 z-30 overflow-hidden rounded-[3%]"
          initial={reduced ? { opacity: 0 } : { y: '-107%', rotate: -1.4 }}
          animate={{ y: '0%', rotate: 0, opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { y: '-110%', rotate: -1.6 }}
          transition={{ duration: reduced ? 0.1 : 0.85, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="screen-paper absolute inset-0 border border-[#cbbb98] shadow-[inset_0_0_40px_rgba(130,108,70,.08)]">
            {/* faint ruled paper + folded corner */}
            <div className="absolute inset-x-0 top-0 h-5 bg-gradient-to-b from-black/10 to-transparent" />
            <div className="absolute -right-10 -top-10 h-28 w-28 rotate-45 border border-[#d8c7a2] bg-[#f8f1df] shadow-md" />
            <span className="absolute left-4 top-4 rotate-[-2deg] font-hand text-[12px] tracking-wider text-ink/35">
              {t('match.screenOn')}
            </span>

            {phase === 'spinning' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                <div className="relative grid h-32 w-32 place-items-center">
                  <div
                    className={clsx(
                      'absolute inset-0 rounded-full border-2 border-dashed border-ink/25',
                      !reduced && 'animate-spin',
                    )}
                    style={{ animationDuration: `${Math.max(1.4, spinDurationMs / 4500)}s` }}
                  />
                  <div className="absolute inset-5 rounded-full border border-ink/15" />
                  <PenLine size={34} className="text-ink/65" />
                  <span className="absolute -right-1 top-1 h-2.5 w-2.5 rounded-full bg-marigold" />
                </div>
                <p className="mt-5 font-hand text-[30px] font-bold leading-none text-ink-deep">
                  {spinningText ?? t('match.spinning')}
                </p>
                <p className="mt-2 max-w-[220px] text-[11.5px] leading-relaxed text-slate-500">{t('match.handsOff')}</p>
                <div className="mt-4 flex items-center gap-1.5 rounded-full border border-ink/15 bg-white/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink/50">
                  <Lock size={11} /> {t('match.screenNote')}
                </div>
              </div>
            ) : (
              <div
                ref={padRef}
                tabIndex={interactive ? 0 : -1}
                role={interactive ? 'application' : 'presentation'}
                aria-label={t('match.aimTitle')}
                aria-describedby="aim-instructions"
                className={clsx('absolute inset-0 select-none outline-none', interactive && 'aim-surface cursor-crosshair')}
                onPointerDown={start}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={cancel}
                onKeyDown={handleKey}
              >
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center">
                  <div className="mt-5 flex w-full items-start justify-between px-5">
                    <div className="rounded-md border border-ink/20 bg-white/55 px-2 py-1 text-left">
                      <p className="flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        <EyeOff size={10} /> {t('match.aimTitle')}
                      </p>
                      <p className="font-hand text-lg leading-none text-ink-deep">{t('match.aimSub')}</p>
                    </div>
                    {showAim ? (
                      <div className="flex items-center gap-1.5 rounded-full border border-pencil/25 bg-[#fff8f5]/80 px-2.5 py-1.5 text-pencil">
                        <Timer size={13} />
                        <span className="font-mono text-sm font-bold">
                          {aimSeconds}
                          <span className="ml-0.5 text-[10px] font-semibold">{t('match.secondsShort')}</span>
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 rounded-full border border-ink/15 bg-white/55 px-2.5 py-1.5 text-[10px] font-semibold text-ink/60">
                        <Hourglass size={12} /> {t('match.waitingAim')}
                      </div>
                    )}
                  </div>

                  <div className="relative mt-3 h-[62%] w-[72%] max-w-[340px]">
                    <div className="absolute inset-0 rounded-full border border-ink/15" />
                    <div className="absolute inset-[12%] rounded-full border border-dashed border-ink/15" />
                    <div className="absolute inset-[28%] rounded-full border border-ink/10" />
                    <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
                      <defs>
                        <marker id="aim-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="#c8544a" />
                        </marker>
                      </defs>
                      <line x1="200" y1="200" x2="200" y2="200" stroke="#c8544a" strokeWidth="2" opacity={showAim ? 0.25 : 0} />
                      <circle cx="200" cy="200" r="7" fill="#fff8f1" stroke="#c8544a" strokeWidth="2.5" />
                      {showAim ? (
                        <>
                          <line
                            x1="200"
                            y1="200"
                            x2={endX}
                            y2={endY}
                            stroke="#c8544a"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeDasharray={dragging ? '7 8' : undefined}
                            markerEnd="url(#aim-arrow)"
                            opacity={0.9}
                            style={{ transition: sliding ? 'all .7s cubic-bezier(.2,.8,.3,1)' : 'none' }}
                          />
                          <g transform={`translate(${endX} ${endY}) rotate(${aimAngle})`} style={{ transition: sliding ? 'transform .7s cubic-bezier(.2,.8,.3,1)' : 'none' }}>
                            <path d="M 4 -4 L 18 -9 L 24 0 L 18 9 L 4 4 Z" fill="#fdf8ef" stroke="#9d4139" strokeWidth="1.4" />
                          </g>
                        </>
                      ) : null}
                    </svg>
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-hand text-[90px] leading-none text-ink/[0.045]">
                      ?
                    </span>
                  </div>

                  <div id="aim-instructions" className="mt-auto w-full bg-gradient-to-t from-[#f3ead8]/95 to-transparent px-5 pb-5 pt-6 text-center">
                    {showAim ? (
                      <>
                        <p className="font-hand text-[23px] font-bold leading-none text-ink-deep">
                          {sliding ? t('match.reveal') : dragging ? t('match.releaseToSlide') : t('match.aimTitle')}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">{t('match.aimBody')}</p>
                        <p className="mt-1 hidden text-[10px] text-slate-400 sm:block">{t('match.aimWithKeys')}</p>
                        {!sliding ? (
                          <button
                            type="button"
                            className="btn-pencil btn-sm mt-2.5"
                            onPointerDown={(event) => event.stopPropagation()}
                            onPointerUp={(event) => event.stopPropagation()}
                            onClick={(event) => {
                              event.stopPropagation()
                              onSubmit(aimAngle)
                            }}
                          >
                            <PenLine size={13} /> {t('match.slideButton')}
                          </button>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <p className="font-hand text-[23px] font-bold leading-none text-ink-deep">{t('match.waitingAim')}</p>
                        <p className="mt-1 text-[11px] text-slate-500">{t('match.aimSub')}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
