import clsx from 'clsx'

const STYLES: Record<string, string> = {
  live: 'border-[#1f5c3d]/25 bg-[#1f5c3d]/10 text-[#1f5c3d] dark:border-[#93c5a8]/30 dark:bg-[#93c5a8]/10 dark:text-[#93c5a8]',
  lobby: 'border-[#234e8b]/25 bg-[#234e8b]/10 text-[#234e8b] dark:border-[#7fa6e0]/30 dark:bg-[#7fa6e0]/10 dark:text-[#a9c6f0]',
  finished: 'border-slate-400/30 bg-slate-500/10 text-slate-600 dark:border-slate-400/30 dark:bg-slate-400/10 dark:text-slate-300',
  abandoned: 'border-[#c8544a]/25 bg-[#c8544a]/10 text-[#c8544a] dark:border-[#e98a80]/30 dark:bg-[#e98a80]/10 dark:text-[#e98a80]',
}

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]',
        STYLES[status] ?? 'border-[var(--card-border)] bg-[var(--ink-ghost-2)] text-slate-500',
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  )
}
