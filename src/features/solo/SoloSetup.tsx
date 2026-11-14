import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import {
  ArrowLeft,
  ArrowRight,
  Coins,
  Cpu,
  Flame,
  Play,
  ShieldCheck,
  Smile,
  Sparkles,
  Target,
  UserRound,
} from 'lucide-react'
import { AppHeader, Footer } from '../../components/ui/AppHeader'
import { RuleStepper } from '../../components/ui/RuleStepper'
import { PlayerAvatar } from '../../components/game/PlayerAvatar'
import { GAME_DEFAULTS } from '../../config/gameConfig'
import { sound } from '../../lib/sound'
import type { BotDifficulty } from '../../lib/botEngine'

export type SoloFirstChoice = 'human' | 'cpu' | 'toss'

export interface SoloSetupValues {
  name: string
  teamName: string
  overs: number
  wickets: number
  batFirst: SoloFirstChoice
  difficulty: BotDifficulty
}

function readSaved(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

const DIFFICULTY_OPTIONS: Array<{
  id: BotDifficulty
  label: string
  body: string
  Icon: typeof Smile
}> = [
  { id: 'casual', label: 'solo.difficultyCasual', body: 'solo.difficultyCasualBody', Icon: Smile },
  { id: 'balanced', label: 'solo.difficultyBalanced', body: 'solo.difficultyBalancedBody', Icon: Target },
  { id: 'sharp', label: 'solo.difficultySharp', body: 'solo.difficultySharpBody', Icon: Flame },
]

const FIRST_OPTIONS: Array<{
  id: SoloFirstChoice
  label: string
  Icon: typeof UserRound
}> = [
  { id: 'human', label: 'solo.youBatFirst', Icon: UserRound },
  { id: 'cpu', label: 'solo.cpuBatFirst', Icon: Cpu },
  { id: 'toss', label: 'solo.tossFirst', Icon: Coins },
]

export function SoloSetup({
  initial,
  onStart,
  onBack,
}: {
  initial?: SoloSetupValues | null
  onStart: (values: SoloSetupValues) => void
  onBack: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(() => initial?.name ?? readSaved('pc.name'))
  const [teamName, setTeamName] = useState(() => {
    const saved = readSaved('pc.team')
    return initial?.teamName ?? (saved || t('create.defaultTeam'))
  })
  const [overs, setOvers] = useState(initial?.overs ?? GAME_DEFAULTS.overs)
  const [wickets, setWickets] = useState(initial?.wickets ?? GAME_DEFAULTS.wickets)
  const [batFirst, setBatFirst] = useState<SoloFirstChoice>(initial?.batFirst ?? 'toss')
  const [difficulty, setDifficulty] = useState<BotDifficulty>(initial?.difficulty ?? 'balanced')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const cleanName = name.trim()
    if (!cleanName) {
      setError(t('solo.needName'))
      return
    }
    setError(null)
    sound.click()
    onStart({
      name: cleanName,
      teamName: teamName.trim() || t('create.defaultTeam'),
      overs,
      wickets,
      batFirst,
      difficulty,
    })
  }

  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-500 transition hover:text-ink"
        >
          <ArrowLeft size={14} /> {t('solo.backHome')}
        </button>

        <header className="mx-auto mt-5 max-w-2xl text-center">
          <p className="mb-2 flex items-center justify-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.24em] text-pencil">
            <Cpu size={14} /> {t('solo.eyebrow')}
          </p>
          <h1 className="font-hand text-[48px] font-bold leading-[0.92] text-ink-deep sm:text-[64px]">
            {t('solo.title')}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[14px] leading-relaxed text-slate-600 sm:text-[15px]">
            {t('solo.subtitle')}
          </p>
        </header>

        <div className="mt-7 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <form onSubmit={handleSubmit} className="paper-card rounded-[26px] p-5 sm:p-7">
            <div className="mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-pencil">{t('solo.eyebrow')}</p>
              <h2 className="mt-1 font-hand text-[34px] font-bold leading-none text-ink-deep">{t('solo.setupTitle')}</h2>
              <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">{t('solo.setupBody')}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="solo-name">
                  {t('common.name')}
                </label>
                <input
                  id="solo-name"
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
                <label className="label" htmlFor="solo-team">
                  {t('common.teamName')}
                </label>
                <input
                  id="solo-team"
                  className="input"
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  placeholder={t('create.teamPlaceholder')}
                  maxLength={32}
                />
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-[#e1d3b8] bg-white/45 px-3 py-3 dark:border-slate-600/35 dark:bg-white/10">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{t('create.matchSetup')}</p>
                <span className="chip border-ink/15 bg-ink/[0.055] text-ink/70 dark:border-slate-600/35 dark:bg-white/10 dark:text-slate-300">
                  {t('create.playersFromWickets', { count: wickets })}
                </span>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <RuleStepper
                  label={t('common.overs')}
                  value={overs}
                  min={1}
                  max={GAME_DEFAULTS.maxOvers}
                  onChange={setOvers}
                />
                <RuleStepper
                  label={t('common.wickets')}
                  value={wickets}
                  min={1}
                  max={GAME_DEFAULTS.maxSquadSize}
                  onChange={setWickets}
                />
              </div>
              <p className="mt-2 text-[11.5px] leading-snug text-slate-500">
                {t('solo.rulesNote', { overs, wickets })}
              </p>
            </div>

            <fieldset className="mt-5">
              <legend className="label mb-2">{t('solo.batFirst')}</legend>
              <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t('solo.batFirst')}>
                {FIRST_OPTIONS.map(({ id, label, Icon }) => {
                  const selected = batFirst === id
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        setBatFirst(id)
                        sound.click()
                      }}
                      className={clsx(
                        'flex min-h-[62px] items-center gap-2 rounded-xl border px-3 py-2 text-left text-[12px] font-semibold transition',
                        selected
                          ? 'border-ink bg-ink/[0.065] text-ink-deep shadow-[0_0_0_3px_rgba(35,78,139,.08)] dark:border-slate-300/70 dark:bg-white/15 dark:text-white'
                          : 'border-[#d8c7a2]/70 bg-white/50 text-slate-600 hover:border-ink/40 hover:bg-white/80 dark:border-slate-600/40 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-white/10',
                      )}
                    >
                      <Icon size={17} className={selected ? 'text-pencil' : 'text-slate-400'} />
                      {t(label)}
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 text-[11px] text-slate-400">{t('solo.tossNote')}</p>
            </fieldset>

            <fieldset className="mt-5">
              <legend className="label mb-2">{t('solo.difficulty')}</legend>
              <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t('solo.difficulty')}>
                {DIFFICULTY_OPTIONS.map(({ id, label, body, Icon }) => {
                  const selected = difficulty === id
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        setDifficulty(id)
                        sound.click()
                      }}
                      className={clsx(
                        'relative rounded-xl border px-3 pb-2.5 pt-3 text-left transition',
                        selected
                          ? 'border-ink bg-ink/[0.065] shadow-[0_0_0_3px_rgba(35,78,139,.08)] dark:border-slate-300/70 dark:bg-white/15'
                          : 'border-[#d8c7a2]/70 bg-white/50 hover:border-ink/40 hover:bg-white/80 dark:border-slate-600/40 dark:bg-white/[0.06] dark:hover:bg-white/10',
                      )}
                    >
                      <span className="flex items-center justify-between">
                        <Icon size={17} className={selected ? 'text-pencil' : 'text-slate-400'} />
                        {selected ? <ShieldCheck size={14} className="text-leaf" /> : null}
                      </span>
                      <span className="mt-1.5 block font-hand text-[23px] font-bold leading-none text-ink-deep">{t(label)}</span>
                      <span className="mt-1 block text-[10.5px] leading-snug text-slate-500">{t(body)}</span>
                    </button>
                  )
                })}
              </div>
            </fieldset>

            {error ? (
              <div
                className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[12.5px] text-red-800 dark:border-red-500/40 dark:bg-red-950/60 dark:text-red-200"
                role="alert"
              >
                <Sparkles size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <button type="submit" className="btn-primary btn-lg mt-5 w-full">
              <Play size={18} />
              {t('solo.start')}
              <ArrowRight size={17} className="ml-1 opacity-60" />
            </button>
          </form>

          <aside className="space-y-3">
            <div className="paper-card relative overflow-hidden rounded-[24px] p-5">
              <span className="pointer-events-none absolute -right-7 -top-7 h-24 w-24 rotate-12 rounded-full border border-ink/10" />
              <div className="flex items-center gap-3">
                <PlayerAvatar name={t('solo.cpuName')} slot={2} size="lg" />
                <div className="min-w-0">
                  <p className="truncate font-hand text-[26px] font-bold leading-none text-ink-deep">{t('solo.cpuName')}</p>
                  <p className="truncate text-[11px] text-slate-500">{t('solo.cpuTeam')}</p>
                </div>
                <span className="ml-auto h-2.5 w-2.5 rounded-full bg-leaf shadow-[0_0_0_4px_rgba(47,111,82,.1)]" />
              </div>
              <div className="mt-4 border-t border-dashed border-ink/12 pt-3">
                <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">{t('solo.cpuReady')}</p>
                <ul className="space-y-2 text-[11.5px] leading-snug text-slate-500">
                  <li className="flex gap-2">
                    <Coins size={14} className="mt-0.5 shrink-0 text-pencil" />
                    <span>{t('solo.cpuPoint1')}</span>
                  </li>
                  <li className="flex gap-2">
                    <Target size={14} className="mt-0.5 shrink-0 text-pencil" />
                    <span>{t('solo.cpuPoint2')}</span>
                  </li>
                  <li className="flex gap-2">
                    <ShieldCheck size={14} className="mt-0.5 shrink-0 text-pencil" />
                    <span>{t('solo.cpuPoint3')}</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-ink/20 bg-[#eef4ff]/70 p-4 dark:border-slate-600/40 dark:bg-white/[0.06]">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-ink/65 dark:text-slate-300">
                <Sparkles size={12} className="text-marigold" /> {t('solo.noRoomCode')}
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-slate-500">{t('solo.noRoomCodeBody')}</p>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  )
}
