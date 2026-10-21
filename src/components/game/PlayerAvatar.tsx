import clsx from 'clsx'

const COLORS = [
  'bg-[#dfe9fa] text-ink-deep',
  'bg-[#f8e4df] text-[#8c3d35]',
  'bg-[#e2efe5] text-[#2f6f52]',
  'bg-[#fbefd2] text-[#8c6421]',
]

export function PlayerAvatar({
  name,
  slot = 1,
  size = 'md',
  className,
}: {
  name: string
  slot?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const initial = name.trim().slice(0, 1).toUpperCase() || '?'
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'relative grid shrink-0 place-items-center rounded-full border-[1.5px] border-current/20 font-hand font-bold shadow-inner',
        COLORS[(slot - 1) % COLORS.length],
        size === 'sm' && 'h-8 w-8 text-lg',
        size === 'md' && 'h-11 w-11 text-2xl',
        size === 'lg' && 'h-14 w-14 text-3xl',
        className,
      )}
    >
      {initial}
      <span className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-current opacity-30" />
    </span>
  )
}
