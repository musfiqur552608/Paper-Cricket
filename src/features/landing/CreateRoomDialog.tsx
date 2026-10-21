import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowRight, PenLine } from 'lucide-react'
import { Dialog } from '../../components/ui/Dialog'
import { createRoom } from '../../lib/supabase/api'
import { errorKey, toAppError } from '../../lib/errors'
import { DEFAULT_SQUADS, IS_SUPABASE_CONFIGURED, makeDefaultSquad } from '../../config/gameConfig'
import { notify } from '../../store/toast'
import { sound } from '../../lib/sound'

function readSaved(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

export function CreateRoomDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isBn = i18n.language.startsWith('bn')
  const [name, setName] = useState(() => readSaved('pc.name'))
  const [teamName, setTeamName] = useState(() => readSaved('pc.team'))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setError(null)
      setName(readSaved('pc.name'))
      setTeamName(readSaved('pc.team'))
    }
  }, [open])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    if (!name.trim()) {
      setError(t('create.nameRequired'))
      return
    }
    if (!teamName.trim()) {
      setError(t('create.teamRequired'))
      return
    }
    if (!IS_SUPABASE_CONFIGURED) {
      setError(t('errors.notConfiguredBody'))
      return
    }

    setBusy(true)
    setError(null)
    try {
      sound.click()
      const defaultNames = isBn ? DEFAULT_SQUADS.bn : DEFAULT_SQUADS.en
      const squad = makeDefaultSquad(defaultNames).map((player) => player.name)
      const result = await createRoom({ name: name.trim(), teamName: teamName.trim(), squad })
      try {
        window.localStorage.setItem('pc.name', name.trim())
        window.localStorage.setItem('pc.team', teamName.trim())
      } catch {
        // no-op
      }
      onClose()
      notify.success(t('create.roomMade'))
      navigate(`/room/${result.code}`)
    } catch (caught) {
      const appError = toAppError(caught)
      setError(t(errorKey(appError.code)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('create.title')}
      eyebrow={t('create.eyebrow')}
      size="md"
    >
      <p className="-mt-2 mb-5 text-sm leading-relaxed text-slate-600">{t('create.subtitle')}</p>

      {!IS_SUPABASE_CONFIGURED ? (
        <div className="mb-4 flex gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-[12.5px] leading-relaxed text-amber-900">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">{t('errors.notConfiguredTitle')}</p>
            <p>{t('errors.notConfiguredBody')}</p>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="create-name">
            {t('common.name')}
          </label>
          <input
            id="create-name"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('create.namePlaceholder')}
            maxLength={24}
            autoComplete="nickname"
            autoFocus
          />
        </div>
        <div>
          <label className="label" htmlFor="create-team">
            {t('common.teamName')}
          </label>
          <input
            id="create-team"
            className="input"
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
            placeholder={t('create.teamPlaceholder')}
            maxLength={32}
          />
        </div>

        <div className="rounded-xl border border-[#e1d3b8] bg-white/45 px-3 py-2.5">
          <p className="text-xs font-semibold text-ink-deep">{t('create.starterSquad')}</p>
          <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500">{t('create.starterSquadBody')}</p>
        </div>

        {error ? (
          <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[12.5px] text-red-800" role="alert">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <button type="submit" className="btn-primary w-full btn-lg" disabled={busy}>
          {busy ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              {t('create.creating')}
            </>
          ) : (
            <>
              <PenLine size={18} />
              {t('create.submit')}
              <ArrowRight size={17} className="ml-1 opacity-60" />
            </>
          )}
        </button>
        <p className="-mt-1 pb-1 text-center text-[11px] text-slate-400">{t('create.hint')}</p>
      </form>
    </Dialog>
  )
}
