import clsx from 'clsx'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={clsx('animate-pulse rounded-lg bg-[var(--ink-ghost-2)]', className)}
    />
  )
}
