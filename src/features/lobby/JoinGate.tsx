import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, ClipboardPaste, UserPlus } from 'lucide-react'
import { AppHeader } from '../../components/ui/AppHeader'
import { PlayerAvatar } from '../../components/game/PlayerAvatar'
import { SquadEditor } from '../lobby/SquadEditor'
import { DEFAULT_SQUADS, GAME_DEFAULTS, makeSquadNames } from '../../config/gameConfig'
import { joinRoom } from '../../lib/supabase/api'
import type { PeekRoom } from '../../lib/supabase/api'
import { errorKey, toAppError } from '../../lib/errors'
import type { JoinResult } from '../../types/game'
import { notify } from '../../store/toast'

export function JoinGate({
  peek,
  onJoined,
}: {
  peek: PeekRoom
  onJoined: (result: JoinResult) => Promise<void>
}) {
  const { t, i18n } = useTranslation()
  const isBn = i18n.language.startsWith('bn')
  const wicketsKnown = typeof peek.wickets === 'number' && peek.wickets >= 1
  const roomWickets = Math.max(1, Math.min(peek.wickets ?? GAME_DEFAULTS.maxSquadSize, GAME_DEFAULTS.maxSquadSize))
  const [name, setName] = useState(() => {
    try {
      return window.localStorage.getItem('pc.name') ?? ''
    } catch {
      return ''
    }
  })
  const [teamName, setTeamName] = useState(() => {
    try {
      return window.localStorage.getItem('pc.team') ?? ''
    } catch {
      return ''
    }
  })
  const [showSquad, setShowSquad] = useState(false)
  const [squad, setSquad] = useState<string[]>(() =>
    makeSquadNames(
      isBn ? DEFAULT_SQUADS.bn : DEFAULT_SQUADS.en,
      roomWickets,
      (position) => t('lobby.playerN', { n: position }),
    ),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    if (!name.trim()) {
      setError(t('join.needName'))
      return
    }
    if (!teamName.trim()) {
      setError(t('join.needTeam'))
      return
    }
    const cleanSquad = squad.map((player, index) => player.trim() || `${t('lobby.playerN', { n: index + 1 })}`)
    setBusy(true)
    setError(null)
    try {
      const result = await joinRoom(peek.code, { name: name.trim(), teamName: teamName.trim(), squad: cleanSquad })
      try {
        window.localStorage.setItem('pc.name', name.trim())
        window.localStorage.setItem('pc.team', teamName.trim())
      } catch {
        // ignore storage
      }
      notify.success(t('join.joined'))
      await onJoined(result)
    } catch (caught) {
      setError(t(errorKey(toAppError(caught).code)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-4 sm:px-6">
        <div className="mb-5 flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2 rounded-full border border-ink/15 bg-paper-50/80 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-leaf" />
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              {t('join.emptyChair')}
            </span>
          </div>
          <h1 className="font-hand text-[46px] font-bold leading-none text-ink-deep">{t('join.joinTitle')}</h1>
          <p className="max-w-sm text-sm text-slate-500">{t('join.joinSubtitle')}</p>
        </div>

        <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-[.8fr_1.2fr]">
          <div className="paper-card relative overflow-hidden rounded-2xl p-5">
            <span className="pointer-events-none absolute -right-4 -top-5 rotate-6 font-hand text-[72px] text-pencil/10">02</span>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{t('join.youAreJoining')}</p>
            <div className="mt-3 flex items-center gap-3">
              <PlayerAvatar name={peek.hostName ?? 'H'} slot={1} size="lg" />
              <div className="min-w-0">
                <p className="truncate font-hand text-[27px] font-bold leading-none text-ink-deep">{peek.hostTeamName ?? t('common.team')}</p>
                <p className="mt-1 text-[12px] text-slate-500">
                  {peek.hostName} · {t('common.host')}
                </p>
              </div>
            </div>
            <div className="my-4 border-t border-dashed border-ink/15" />
            {wicketsKnown ? (
              <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] font-semibold text-slate-500">
                <span>{t('lobby.rulesLine', { overs: peek.overs ?? GAME_DEFAULTS.overs, wickets: roomWickets })}</span>
                <span className="text-slate-300">·</span>
                <span>{t('lobby.squadCount', { count: roomWickets })}</span>
              </div>
            ) : (
              <p className="mb-3 text-[10.5px] font-semibold leading-snug text-slate-500">
                {t('join.teamSizedAfterJoin')}
              </p>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{t('common.roomCode')}</p>
                <p className="font-mono text-2xl font-bold tracking-[0.2em] text-ink">{peek.code}</p>
              </div>
              <span className="chip border-leaf/20 bg-leaf/10 text-leaf">
                {t('join.oneWaiting')}
              </span>
            </div>
            <svg viewBox="0 0 200 50" className="mt-4 w-full text-ink/25" fill="none" aria-hidden="true">
              <path d="M4 35 C50 8 130 55 196 20" stroke="currentColor" strokeWidth="1.4" strokeDasharray="3 5" strokeLinecap="round" />
              <path d="M185 14 L197 20 L186 28" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <form onSubmit={submit} className="paper-card rounded-2xl p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-ink/10 text-ink">
                <UserPlus size={16} />
              </span>
              <h2 className="font-hand text-[27px] font-bold leading-none text-ink-deep">
                {t('join.writeName')}
              </h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label" htmlFor="join-name">
                  {t('common.name')}
                </label>
                <input
                  id="join-name"
                  className="input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={24}
                  placeholder={t('create.namePlaceholder')}
                  autoFocus
                />
              </div>
              <div>
                <label className="label" htmlFor="join-team">
                  {t('common.teamName')}
                </label>
                <input
                  id="join-team"
                  className="input"
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  maxLength={32}
                  placeholder={t('create.teamPlaceholder')}
                />
              </div>

              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl border border-dashed border-[#d3c2a0] px-3 py-2.5 text-left text-[12px] font-semibold text-slate-500 transition hover:bg-white/60"
                onClick={() => setShowSquad((value) => !value)}
                aria-expanded={showSquad}
              >
                <span className="flex items-center gap-2">
                  <ClipboardPaste size={14} className="text-ink/60" />
                  {t('join.teamSheetOptional')} · {squad.length}
                </span>
                <span className="font-hand text-lg text-ink/40">{showSquad ? '−' : '+'}</span>
              </button>

              {showSquad ? (
                <div className="rounded-xl border border-[#e1d3b8] bg-white/35 p-3">
                  <SquadEditor squad={squad} onChange={setSquad} />
                </div>
              ) : null}

              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800" role="alert">
                  {error}
                </p>
              ) : null}

              <button type="submit" className="btn-primary w-full btn-lg" disabled={busy}>
                {busy ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    {t('join.joiningNow')}
                  </>
                ) : (
                  <>
                    {t('join.joinSubmit')}
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
