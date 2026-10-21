import { useMemo } from 'react'
import clsx from 'clsx'
import { usePreferences } from '../../store/preferences'

const COLORS = ['#234e8b', '#c8544a', '#e9a23b', '#2f6f52', '#fffdf7', '#6d90c2']

export function ConfettiBurst({ burstKey, intense = false }: { burstKey: string | number; intense?: boolean }) {
  const reduced = usePreferences((state) => state.reducedMotion)
  const pieces = useMemo(
    () =>
      Array.from({ length: intense ? 60 : 32 }, (_, index) => ({
        id: `${burstKey}-${index}`,
        left: 8 + ((index * 37) % 84),
        delay: (index % 7) * 0.045,
        duration: 1.9 + (index % 5) * 0.22,
        dx: `${((index * 53) % 160) - 80}px`,
        rot: `${(index * 97) % 720 - 360}deg`,
        color: COLORS[index % COLORS.length],
        width: 5 + (index % 3) * 2,
        height: 8 + (index % 4) * 4,
        round: index % 4 === 0,
      })),
    [burstKey, intense],
  )

  if (reduced) return null

  return (
    <div key={burstKey} className="pointer-events-none absolute inset-0 z-50 overflow-hidden" aria-hidden="true">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className={clsx('absolute top-0 block animate-confetti', piece.round ? 'rounded-full' : 'rounded-[1px]')}
          style={{
            left: `${piece.left}%`,
            width: piece.width,
            height: piece.height,
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            ['--dx' as string]: piece.dx,
            ['--rot' as string]: piece.rot,
          }}
        />
      ))}
    </div>
  )
}
