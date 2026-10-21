import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { Flame, Target, Zap } from 'lucide-react'
import type { BallDTO, MatchSnapshot, PlayerDTO } from '../../types/game'
import type { MatchView } from '../../lib/matchView'
import { buildPlayerScores, buildOverTimeline, formatOvers } from '../../lib/gameEngine'
import { inningsLabel } from '../../lib/matchView'
import { PlayerAvatar } from '../../components/game/PlayerAvatar'

export function LiveScore({ snapshot, view }: { snapshot: MatchSnapshot; view: MatchView }) {
  const { t } = useTranslation()
  const { room, balls } = snapshot
  const current = view.innings
  const currentTeam = view.battingPlayer
  const otherTeam = view.bowlingPlayer

  const scores = current ? buildPlayerScores(current, balls, currentTeam?.squad ?? []) : []
  const striker = scores.find((score) => score.isStriker) ?? scores[scores.length - 1] ?? null
  const totalOvers = view.overs
  const chase = room.inningsNumber === 2 || room.inningsNumber === 4

  const previousScore = otherTeam
    ? [...snapshot.innings]
        .filter((entry) => entry.battingUserId === otherTeam.userId && entry.id !== current?.id)
        .sort((a, b) => b.number - a.number)[0]
    : null

  return (
    <section className="paper-card overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between gap-2 border-b border-dashed border-ink/15 px-3.5 py-2">
        <div className="flex items-center gap-2">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-ink/10 text-[9px] font-bold text-ink">
            {current?.number ?? 1}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
            {current ? inningsLabel(current.number, t) : t('common.innings')}
          </span>
          {chase ? (
            <span className="hidden items-center gap-1 rounded-full bg-marigold/15 px-2 py-0.5 text-[9px] font-bold text-[#966313] sm:inline-flex">
              <Target size={9} /> {room.target}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          {current?.nextIsFreeHit ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-pencil/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-pencil">
              <Zap size={9} /> {t('common.freeHit')}
            </span>
          ) : null}
          <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            {currentOversLabel(current?.legalBalls ?? 0, totalOvers)}
          </span>
        </div>
      </div>

      <div className="px-3.5 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <PlayerAvatar name={currentTeam?.name ?? '?'} slot={currentTeam?.slot ?? 1} size="md" />
            <div className="min-w-0">
              <p className="truncate font-hand text-[26px] font-bold leading-none text-ink-deep">{currentTeam?.teamName ?? '—'}</p>
              <p className="mt-0.5 truncate text-[10.5px] text-slate-500">
                {striker && current?.status === 'live' ? (
                  <>
                    <span className="font-semibold text-slate-700">{striker.name}</span> {striker.runs}
                    <span className="text-slate-400"> ({striker.balls})*</span>
                    {current.nextIsFreeHit ? <span className="ml-1 text-pencil">{t('match.freeHitShort')}</span> : null}
                  </>
                ) : (
                  <span>{current?.status === 'complete' ? t('match.endInnings') : t('match.waitingOpponent')}</span>
                )}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-hand text-[42px] font-bold leading-[0.8] tracking-tight text-ink-deep">
              {current?.runs ?? 0}
              <span className="text-[28px] text-ink/45">/{current?.wickets ?? 0}</span>
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {current ? formatOvers(current.legalBalls) : '0.0'} / {totalOvers} {t('common.oversShort')}
            </p>
          </div>
        </div>

        {chase && view.requiredRuns != null ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-[#eef4fe]/80 px-2.5 py-1.5">
            <p className="text-[11px] font-bold text-ink">
              {t('match.needRuns', { runs: view.requiredRuns, balls: view.ballsRemaining })}
            </p>
            {view.rrr != null ? (
              <p className="text-[10px] font-medium text-slate-500">
                {t('match.requiredRate', { rate: view.rrr.toFixed(2) })}
              </p>
            ) : null}
            <div className="ml-auto flex items-center gap-1 text-[9.5px] font-semibold text-slate-400">
              <Flame size={11} className="text-marigold" />
              {t('common.target')} {room.target}
            </div>
          </div>
        ) : null}

        {previousScore && otherTeam ? (
          <div className="mt-2 flex items-center justify-between border-t border-dashed border-ink/10 pt-2 text-[10.5px] text-slate-500">
            <span className="truncate">{otherTeam.teamName}</span>
            <span className="ml-2 shrink-0 font-semibold text-slate-600">
              {previousScore.runs}/{previousScore.wickets} <span className="font-normal text-slate-400">({formatOvers(previousScore.legalBalls)})</span>
            </span>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function currentOversLabel(legalBalls: number, overs: number): string {
  return `${formatOvers(legalBalls)} / ${overs}`
}

function dismissalLabel(outcome: string | null, t: (key: string) => string): string {
  switch (outcome) {
    case 'CO':
      return t('match.resultCaught')
    case 'LBW':
      return t('match.resultLbw')
    case 'RO':
      return t('match.resultRunOut')
    case 'BO':
      return t('match.resultBowled')
    default:
      return t('score.out')
  }
}

export function BallChip({ ball, small = false }: { ball: BallDTO; small?: boolean }) {
  const { t } = useTranslation()
  const isWicket = ball.isWicket
  const isExtra = ball.outcome === 'W' || ball.outcome === 'N'
  const isBoundary = ball.outcome === '4' || ball.outcome === '6'
  const savedOnFreeHit = ball.isFreeHit && ['CO', 'LBW', 'RO', 'BO'].includes(ball.outcome)
  const label = isWicket
    ? 'W'
    : ball.outcome === 'W'
      ? t('score.wideShort')
      : ball.outcome === 'N'
        ? t('score.noBallShort')
        : savedOnFreeHit
          ? t('match.safeShort')
          : ball.outcome
  const title = isWicket
    ? t('match.resultWicket')
    : ball.outcome === 'W'
      ? t('score.wide')
      : ball.outcome === 'N'
        ? t('score.noBall')
        : savedOnFreeHit
          ? t('match.safe')
          : ball.outcome
  return (
    <span
      className={clsx(
        'inline-grid shrink-0 place-items-center rounded-full border text-[10px] font-bold',
        small ? 'h-6 w-6' : 'h-7 w-7',
        isWicket && 'border-pencil/30 bg-pencil text-white',
        isBoundary && 'border-ink/20 bg-ink text-white',
        isExtra && 'border-[#d8c7a2] bg-[#f5eddc] text-slate-500',
        !isWicket && !isBoundary && !isExtra && 'border-ink/15 bg-white/80 text-ink-deep',
      )}
      title={`${title}${ball.isFreeHit ? ` · ${t('common.freeHit')}` : ''}`}
    >
      {label}
    </span>
  )
}

export function OverStrip({ balls, children }: { balls: BallDTO[]; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
      {balls.map((ball) => (
        <BallChip key={ball.id} ball={ball} small />
      ))}
      {balls.length === 0 ? <span className="text-[10.5px] italic text-slate-400">—</span> : null}
      {children}
    </div>
  )
}

export function InningsPanel({ snapshot, view, userId }: { snapshot: MatchSnapshot; view: MatchView; userId: string }) {
  const { t } = useTranslation()
  const innings = view.innings
  const battingPlayer = view.battingPlayer
  const squad = battingPlayer?.squad ?? []
  const scores = innings ? buildPlayerScores(innings, snapshot.balls, squad) : []
  const timeline = innings ? buildOverTimeline(innings, snapshot.balls) : []
  const lastOver = timeline[timeline.length - 1]

  return (
    <div className="paper-card rounded-2xl p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 font-hand text-[23px] font-bold leading-none text-ink-deep">
          <span className="text-pencil">✎</span> {t('match.scorecard')}
        </h3>
        <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-slate-400">{battingPlayer?.teamName}</span>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#e1d3b8] bg-white/40">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-[#e1d3b8] text-[9px] uppercase tracking-wide text-slate-400">
              <th className="px-2 py-1 text-left font-semibold">{t('score.batting')}</th>
              <th className="w-7 py-1 text-right font-semibold">R</th>
              <th className="w-7 py-1 text-right font-semibold">B</th>
              <th className="w-7 py-1 text-right font-semibold">4</th>
              <th className="w-7 py-1 text-right font-semibold">6</th>
            </tr>
          </thead>
          <tbody>
            {scores.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-2 py-3 text-center text-[10.5px] italic text-slate-400">
                  {t('match.noBallsYet')}
                </td>
              </tr>
            ) : (
              scores.map((score) => (
                <tr key={score.index} className="border-b border-[#e8dbc2]/60 last:border-0">
                  <td className="max-w-[120px] px-2 py-1.5">
                    <span className="block truncate font-medium text-slate-700">{score.name}</span>
                    <span className="block text-[8.5px] text-slate-400">
                      {score.isOut ? `${t('score.out')} · ${dismissalLabel(score.outType, t)}` : t('score.notOut')}
                    </span>
                  </td>
                  <td className="py-1.5 text-right font-bold text-ink-deep">{score.runs}</td>
                  <td className="py-1.5 text-right text-slate-500">{score.balls}</td>
                  <td className="py-1.5 text-right text-slate-500">{score.fours}</td>
                  <td className="py-1.5 text-right text-slate-500">{score.sixes}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">{t('match.lastSix')}</span>
        <OverStrip balls={lastOver?.balls.slice(-6) ?? []} />
      </div>

      <div className="mt-2 flex items-center justify-between rounded-lg bg-ink/[0.045] px-2.5 py-1.5 text-[10.5px]">
        <span className="text-slate-500">
          {t('common.extras')} <b className="text-slate-700">{innings?.extras ?? 0}</b>
        </span>
        <span className="font-semibold text-ink-deep">
          {innings?.runs ?? 0}/{innings?.wickets ?? 0}{' '}
          <span className="font-normal text-slate-400">({formatOvers(innings?.legalBalls ?? 0)})</span>
        </span>
      </div>

      {userId && view.bowlingPlayer?.squad.length ? (
        <p className="mt-2 truncate text-center text-[9px] text-slate-400">
          {t('match.bowlingTeam')}: {view.bowlingPlayer.teamName}
        </p>
      ) : null}
    </div>
  )
}

export function TeamBadge({ player, label }: { player: PlayerDTO | null; label?: string }) {
  if (!player) return null
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-paper-50/70 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
      <PlayerAvatar name={player.name} slot={player.slot} size="sm" className="h-5 w-5 text-[11px]" />
      {player.teamName}
      {label ? <span className="text-slate-400">· {label}</span> : null}
    </span>
  )
}
