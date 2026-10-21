import { useTranslation } from 'react-i18next'
import { AlertCircle, Loader2, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Board } from '../board/Board'

export function LoadingSheet({ label }: { label?: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="relative grid h-20 w-20 place-items-center">
        <div className="absolute inset-0 animate-breathe rounded-full border border-ink/15" />
        <Loader2 size={30} className="animate-spin text-ink/50" />
      </div>
      <p className="font-hand text-2xl text-ink/65">{label ?? t('common.loading')}</p>
    </div>
  )
}

export function ErrorSheet({
  title,
  body,
  onRetry,
  home = true,
}: {
  title: string
  body?: string
  onRetry?: () => void
  home?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-5 text-center">
      <div className="paper-card w-full rounded-3xl p-6">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-500">
          <AlertCircle size={23} />
        </div>
        <h1 className="font-hand text-3xl font-bold text-ink-deep">{title}</h1>
        {body ? <p className="mt-2 text-sm leading-relaxed text-slate-500">{body}</p> : null}
        <div className="mt-5 flex flex-col gap-2">
          {onRetry ? (
            <button type="button" className="btn-primary" onClick={onRetry}>
              <RotateCcw size={16} /> {t('common.retry')}
            </button>
          ) : null}
          {home ? (
            <Link to="/" className="btn-paper">
              {t('common.back')}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function SetupRequiredSheet() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto flex min-h-[70dvh] w-full max-w-3xl flex-col items-center justify-center gap-5 px-4 py-8 sm:flex-row sm:items-center">
      <div className="w-full max-w-xs shrink-0">
        <Board className="opacity-90" compact />
      </div>
      <div className="paper-card w-full max-w-md rounded-2xl p-5 text-left">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-pencil">Paper Cricket</p>
        <h1 className="font-hand text-3xl font-bold leading-tight text-ink-deep">{t('errors.notConfiguredTitle')}</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{t('errors.notConfiguredBody')}</p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900/90 p-3 text-[10.5px] leading-relaxed text-slate-100">
{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...`}
        </pre>
        <Link to="/" className="btn-primary mt-4 w-full">
          {t('common.back')}
        </Link>
      </div>
    </div>
  )
}
