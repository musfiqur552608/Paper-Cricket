import { ChevronLeft, ChevronRight } from 'lucide-react'

export function RuleStepper({
  label,
  value,
  min,
  max,
  onChange,
  disabled,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#d8c8ab] bg-white/40 px-3 py-2.5">
      <span className="text-[12px] font-semibold text-slate-700">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={disabled || value <= min}
          onClick={() => onChange(value - 1)}
          aria-label={`${label} −`}
          className="grid h-7 w-7 place-items-center rounded-md border border-[#d8c8ab] bg-paper-50 text-slate-500 hover:bg-white disabled:opacity-30"
        >
          <ChevronLeft size={13} />
        </button>
        <span className="w-7 text-center font-mono text-sm font-bold text-ink-deep">{value}</span>
        <button
          type="button"
          disabled={disabled || value >= max}
          onClick={() => onChange(value + 1)}
          aria-label={`${label} +`}
          className="grid h-7 w-7 place-items-center rounded-md border border-[#d8c8ab] bg-paper-50 text-slate-500 hover:bg-white disabled:opacity-30"
        >
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  )
}
