import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { PenLine, RotateCw } from 'lucide-react'
import clsx from 'clsx'

function pointerAngle(element: HTMLElement, clientX: number, clientY: number): number {
  const rect = element.getBoundingClientRect()
  const x = clientX - rect.left - rect.width / 2
  const y = clientY - rect.top - rect.height / 2
  return (Math.atan2(x, -y) * 180) / Math.PI
}

function shortestDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180
}

interface BoardSpinControlProps {
  active: boolean
  rotation: number
  onRotation: (rotation: number) => void
  onStop: () => void
}

/**
 * The bowler's transparent drag surface. The board stays fully visible; only
 * this dashed ring and the two small labels sit above it. Moving around the
 * centre turns the board 1:1 with the pointer. Letting go commits the angle and
 * immediately hands the pen to the batter: there is no start or stop button.
 */
export function BoardSpinControl({
  active,
  rotation,
  onRotation,
  onStop,
}: BoardSpinControlProps) {
  const { t } = useTranslation()
  const padRef = useRef<HTMLDivElement>(null)
  const rotationRef = useRef(rotation)
  const lastAngleRef = useRef<number | null>(null)
  const draggingRef = useRef(false)
  const turnedRef = useRef(false)
  const [dragging, setDragging] = useState(false)
  const [hasTurned, setHasTurned] = useState(false)

  useEffect(() => {
    rotationRef.current = rotation
  }, [rotation])

  useEffect(() => {
    if (active) return
    draggingRef.current = false
    lastAngleRef.current = null
    turnedRef.current = false
    setDragging(false)
    setHasTurned(false)
  }, [active])

  function begin(event: React.PointerEvent<HTMLDivElement>) {
    if (!active) return
    event.preventDefault()
    const pad = padRef.current
    if (!pad) return
    pad.focus({ preventScroll: true })
    pad.setPointerCapture(event.pointerId)
    draggingRef.current = true
    lastAngleRef.current = pointerAngle(pad, event.clientX, event.clientY)
    setDragging(true)
  }

  function move(event: React.PointerEvent<HTMLDivElement>) {
    if (!active || !draggingRef.current || !padRef.current) return
    const next = pointerAngle(padRef.current, event.clientX, event.clientY)
    const last = lastAngleRef.current
    if (last == null) {
      lastAngleRef.current = next
      return
    }
    const delta = shortestDelta(last, next)
    if (Math.abs(delta) < 0.05) return
    lastAngleRef.current = next
    rotationRef.current += delta
    turnedRef.current = true
    if (!hasTurned) setHasTurned(true)
    onRotation(rotationRef.current)
  }

  function finish(event: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return
    draggingRef.current = false
    lastAngleRef.current = null
    setDragging(false)
    const pad = padRef.current
    if (pad?.hasPointerCapture(event.pointerId)) {
      pad.releasePointerCapture(event.pointerId)
    }
    // A tap with no turn should not lock in a spin. Once the bowler has turned
    // the board, releasing is the stop action.
    if (turnedRef.current) onStop()
  }

  function cancel(event: React.PointerEvent<HTMLDivElement>) {
    draggingRef.current = false
    lastAngleRef.current = null
    setDragging(false)
    const pad = padRef.current
    if (pad?.hasPointerCapture(event.pointerId)) {
      pad.releasePointerCapture(event.pointerId)
    }
  }

  function handleKey(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!active) return
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      const delta = event.key === 'ArrowLeft' ? -8 : 8
      rotationRef.current += delta
      turnedRef.current = true
      setHasTurned(true)
      onRotation(rotationRef.current)
    }
    if ((event.key === 'Enter' || event.key === ' ') && turnedRef.current) {
      event.preventDefault()
      onStop()
    }
  }

  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          ref={padRef}
          role="application"
          tabIndex={0}
          aria-label={t('match.spinBoardTitle')}
          aria-describedby="spin-board-instructions"
          className={clsx(
            'absolute inset-[1.5%] z-20 touch-none select-none rounded-[4%] outline-none',
            dragging ? 'cursor-grabbing' : 'cursor-grab',
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onPointerDown={begin}
          onPointerMove={move}
          onPointerUp={finish}
          onPointerCancel={cancel}
          onLostPointerCapture={cancel}
          onKeyDown={handleKey}
        >
          <div
            className={clsx(
              'pointer-events-none absolute inset-[4%] rounded-full border-2 border-dashed transition-colors',
              dragging ? 'border-pencil/45 bg-pencil/[0.035]' : 'border-ink/15',
            )}
          />

          {/* Little grip marks on the left and right edges. */}
          <span className="pointer-events-none absolute left-[1%] top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full border border-ink/15 bg-paper-50/90 text-ink/45 shadow-sm">
            <RotateCw size={13} />
          </span>
          <span className="pointer-events-none absolute right-[1%] top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full border border-ink/15 bg-paper-50/90 text-ink/45 shadow-sm">
            <RotateCw size={13} />
          </span>

          <div
            id="spin-board-instructions"
            className="pointer-events-none absolute left-1/2 top-[2%] -translate-x-1/2 rounded-full border border-ink/15 bg-paper-50/90 px-3 py-1.5 text-center text-[10px] font-semibold text-ink/60 shadow-sm backdrop-blur"
          >
            <span className="inline-flex items-center gap-1">
              <RotateCw size={11} />
              {dragging ? t('match.dragSpinning') : hasTurned ? t('match.dragStopped') : t('match.dragToSpin')}
            </span>
          </div>

          <div className="pointer-events-none absolute bottom-[2.5%] left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-ink/15 bg-paper-50/90 px-3 py-1.5 text-[10px] font-bold text-ink/60 shadow-sm backdrop-blur">
            <PenLine size={11} />
            {t('match.spinBoardHint')}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
