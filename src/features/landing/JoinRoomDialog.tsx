import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowRight, Search } from 'lucide-react'
import { Dialog } from '../../components/ui/Dialog'
import { normalizeRoomCode } from '../../lib/supabase/api'
import { IS_SUPABASE_CONFIGURED } from '../../config/gameConfig'
import { sound } from '../../lib/sound'

export function JoinRoomDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setCode('')
      setError(null)
      setBusy(false)
    }
  }, [open])

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const clean = normalizeRoomCode(code)
    if (clean.length !== 6) {
      setError(t('join.invalidCode'))
      return
    }
    if (!IS_SUPABASE_CONFIGURED) {
      setError(t('errors.notConfiguredBody'))
      return
    }
    setBusy(true)
    sound.click()
    onClose()
    navigate(`/room/${clean}`)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('join.title')}
      eyebrow={t('join.eyebrow')}
      size="sm"
    >
      <p className="-mt-2 mb-5 text-sm leading-relaxed text-slate-600">{t('join.subtitle')}</p>
      <form onSubmit={submit}>
        <label className="label" htmlFor="room-code">
          {t('join.codeLabel')}
        </label>
        <div className="relative">
          <input
            id="room-code"
            value={code}
            onChange={(event) => {
              setCode(normalizeRoomCode(event.target.value))
              setError(null)
            }}
            placeholder={t('join.codePlaceholder')}
            className="input h-16 pr-12 text-center font-mono text-3xl font-bold tracking-[0.32em] text-ink-deep"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            maxLength={6}
            autoFocus
            aria-describedby="room-code-hint"
          />
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-ink/35" size={20} />
        </div>
        <p id="room-code-hint" className="mt-2 text-[11.5px] leading-snug text-slate-500">
          {t('join.codeHint')}
        </p>

        {error ? (
          <div className="mt-3 flex gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[12.5px] text-red-800" role="alert">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <button className="btn-primary mt-5 w-full btn-lg" type="submit" disabled={busy}>
          {busy ? (
            t('join.joining')
          ) : (
            <>
              {t('join.submit')}
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>
    </Dialog>
  )
}
