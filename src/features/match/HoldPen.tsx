import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import clsx from 'clsx'
import { haptic } from '../../lib/sound'
import { Pen3D } from '../../components/board/Pen3D'

const HOLD_MS = 700

export function HoldPen({
  ready,
  disabled,
  onReady,
}: {
  ready: boolean
  disabled?: boolean
  onReady: () => void
}) {
  const { t } = useTranslation()
  const [holding, setHolding] = useState(false)
  const [progress, setProgress] = useState(0)
  const timer = useRef<number | null>(null)
  const frame = useRef<number | null>(null)
  const started = useRef(false)

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
      if (frame.current) cancelAnimationFrame(frame.current)
    }
  }, [])

  // If the ready call failed, allow the batter to retry after a short pause.
  useEffect(() => {
    if (ready) {
      started.current = true
      setProgress(1)
      setHolding(false)
      return
    }
    if (progress < 1) return
    const retry = window.setTimeout(() => {
      started.current = false
      setProgress(0)
    }, 3000)
    return () => window.clearTimeout(retry)
  }, [progress, ready])

  function begin() {
    if (ready || disabled || started.current) return
    started.current = true
    setHolding(true)
    const start = performance.now()
    const tick = (time: number) => {
      const value = Math.min(1, (time - start) / HOLD_MS)
      setProgress(value)
      if (value < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    timer.current = window.setTimeout(() => {
      setHolding(false)
      setProgress(1)
      onReady()
      haptic(14)
    }, HOLD_MS)
  }

  function cancel() {
    if (ready || !started.current || progress >= 1) return
    started.current = false
    setHolding(false)
    setProgress(0)
    if (timer.current) window.clearTimeout(timer.current)
    if (frame.current) cancelAnimationFrame(frame.current)
  }

  const complete = ready || progress >= 1
  const circumference = 2 * Math.PI * 34

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <div className="relative flex flex-col items-center">
        <button
          type="button"
          className={clsx(
            'pointer-events-auto relative grid h-[88px] w-[88px] place-items-center rounded-full border-[2.5px] transition-colors',
            complete
              ? 'border-leaf bg-[#eef6f0] text-leaf shadow-[0_0_0_5px_rgba(47,111,82,.08)]'
              : 'border-ink bg-white/90 text-ink shadow-[0_8px_25px_-8px_rgba(23,55,99,.55)] hover:bg-white',
            holding && 'scale-[1.03]',
          )}
          aria-label={t('match.tapToReady')}
          aria-pressed={complete}
          onPointerDown={(event) => {
            event.preventDefault()
            begin()
          }}
          onPointerUp={cancel}
          onPointerLeave={cancel}
          onPointerCancel={cancel}
          onKeyDown={(event) => {
            if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
              event.preventDefault()
              begin()
            }
          }}
          onKeyUp={(event) => {
            if (event.key === ' ' || event.key === 'Enter') cancel()
          }}
          onClick={(event) => {
            if (event.detail === 0) {
              // keyboard / assistive activation does not expose a hold gesture
              if (!complete) onReady()
            }
          }}
          disabled={disabled || ready}
        >
          {complete ? (
            <Check size={30} />
          ) : (
            <Pen3D
              className={clsx(
                'h-12 w-[94px] -rotate-[24deg] transition-transform duration-200',
                holding ? 'translate-y-[2px] scale-[.97]' : 'drop-shadow-sm',
              )}
            />
          )}
          {!complete || holding ? (
            <svg className="pointer-events-none absolute inset-[-7px] h-[102px] w-[102px] -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(35,78,139,.13)" strokeWidth="3" />
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="#c8544a"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
                style={{ transition: holding ? 'none' : 'stroke-dashoffset .2s' }}
              />
            </svg>
          ) : null}
        </button>
        <span className="mt-2 max-w-[170px] text-center text-[11px] font-semibold leading-tight text-ink/65 drop-shadow-[0_1px_0_rgba(255,255,255,.8)]">
          {complete ? t('match.penReady') : holding ? t('match.penHold') : t('match.tapToReady')}
        </span>
      </div>
    </div>
  )
}
