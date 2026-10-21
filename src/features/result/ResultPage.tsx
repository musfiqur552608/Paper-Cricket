import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import {
  ArrowLeft,
  BookOpen,
  Check,
  Copy,
  Download,
  FileDown,
  Flame,
  Image as ImageIcon,
  Loader2,
  LogOut,
  MessageCircle,
  Send,
  Share2,
  Sparkles,
  Trophy,
} from 'lucide-react'
import type { BallDTO, InningsDTO, MatchSnapshot, PlayerDTO } from '../../types/game'
import { Logo } from '../../components/ui/Logo'
import { LanguageToggle, SoundToggle } from '../../components/ui/Toggles'
import { LeaveConfirmDialog } from '../../components/ui/LeaveConfirmDialog'
import { Dialog } from '../../components/ui/Dialog'
import { PlayerAvatar } from '../../components/game/PlayerAvatar'
import { ConfettiBurst } from '../match/ConfettiBurst'
import {
  buildFallOfWickets,
  buildMatchStats,
  buildOverTimeline,
  buildPlayerScores,
  formatOvers,
  strikeRate,
} from '../../lib/gameEngine'
import { copyText, dataUrlToBlob, downloadBlob, providerUrl, slugify, webShare } from '../../lib/share'
import { notify } from '../../store/toast'
import { usePreferences } from '../../store/preferences'
import { APP_URL } from '../../config/gameConfig'

interface ResultProps {
  snapshot: MatchSnapshot
  userId: string
  onLeave: () => Promise<void>
}

const OUTCOME_LABEL_KEYS: Record<string, string> = {
  CO: 'match.resultCaught',
  LBW: 'match.resultLbw',
  RO: 'match.resultRunOut',
  BO: 'match.resultBowled',
}

function outLabel(outcome: string | null, t: (key: string) => string): string {
  if (!outcome) return t('result.notOut')
  return t(OUTCOME_LABEL_KEYS[outcome] ?? 'score.out')
}

export function ResultPage({ snapshot, userId, onLeave }: ResultProps) {
  const { t, i18n } = useTranslation()
  const isBn = i18n.language.startsWith('bn')
  const reduced = usePreferences((state) => state.reducedMotion)
  const exportRef = useRef<HTMLDivElement>(null)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [busy, setBusy] = useState<'png' | 'pdf' | null>(null)
  const [copied, setCopied] = useState(false)

  const { room, players, innings, balls } = snapshot
  const activePlayers = players.filter((player) => !player.leftAt)
  const winner = players.find((player) => player.userId === room.winnerUserId) ?? null
  const isWinner = room.winnerUserId === userId
  const tied = room.status === 'finished' && !room.winnerUserId
  const abandoned = room.status === 'abandoned'

  const squadsByUser = useMemo(() => {
    const map = new Map<string, PlayerDTO['squad']>()
    for (const player of players) map.set(player.userId, player.squad)
    return map
  }, [players])

  const teamsByUser = useMemo(() => {
    const map = new Map<string, string>()
    for (const player of players) map.set(player.userId, player.teamName)
    return map
  }, [players])

  const stats = useMemo(
    () => buildMatchStats({ innings, balls, squadsByUser, teamsByUser }),
    [balls, innings, squadsByUser, teamsByUser],
  )

  const mainInnings = useMemo(
    () => [1, 2].map((number) => innings.find((entry) => entry.number === number)).filter(Boolean) as InningsDTO[],
    [innings],
  )
  const superInnings = useMemo(
    () => [3, 4].map((number) => innings.find((entry) => entry.number === number)).filter(Boolean) as InningsDTO[],
    [innings],
  )

  const titleTeam = winner?.teamName ?? null
  const titleSuffix = abandoned
    ? t('result.abandonedSuffix')
    : tied
      ? t('result.tieTitle')
      : winner
        ? t('result.winnerSuffix')
        : t('result.noResult')
  const subtitle = abandoned ? t('result.abandonedSub') : tied ? t('result.tieSub') : t('result.winnerSub')

  const scoreSummary = useMemo(() => {
    return [1, 2, 3, 4]
      .map((number) => {
        const inn = innings.find((entry) => entry.number === number)
        if (!inn) return null
        const team = teamsByUser.get(inn.battingUserId) ?? ''
        return `${team} ${inn.runs}/${inn.wickets} (${formatOvers(inn.legalBalls)})`
      })
      .filter(Boolean)
      .join(' · ')
  }, [innings, teamsByUser])

  const shareText = t('result.shareText', { summary: scoreSummary })
  const shareUrl = APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')
  const dateLabel = useMemo(() => {
    const date = room.finishedAt ?? room.createdAt
    try {
      return new Intl.DateTimeFormat(isBn ? 'bn-BD' : 'en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(date))
    } catch {
      return new Date(date).toLocaleDateString()
    }
  }, [isBn, room.createdAt, room.finishedAt])

  async function renderPng(pixelRatio = 2): Promise<string> {
    if (!exportRef.current) throw new Error('scorecard missing')
    await document.fonts?.ready
    // let webfonts settle before the DOM is cloned
    await new Promise((resolve) => window.setTimeout(resolve, 120))
    const { toPng } = await import('html-to-image')
    return toPng(exportRef.current, {
      pixelRatio,
      cacheBust: true,
      backgroundColor: '#faf5e7',
    })
  }

  async function renderJpeg(pixelRatio = 2, quality = 0.9): Promise<string> {
    if (!exportRef.current) throw new Error('scorecard missing')
    await document.fonts?.ready
    await new Promise((resolve) => window.setTimeout(resolve, 120))
    const { toJpeg } = await import('html-to-image')
    return toJpeg(exportRef.current, {
      pixelRatio,
      quality,
      cacheBust: true,
      backgroundColor: '#faf5e7',
    })
  }

  async function downloadImage() {
    if (busy) return
    setBusy('png')
    try {
      const dataUrl = await renderPng(2)
      downloadBlob(dataUrlToBlob(dataUrl), `${slugify(scoreSummary)}-scorecard.png`)
      notify.success(t('result.downloadReady'))
    } catch {
      notify.error(t('result.imageError'))
    } finally {
      setBusy(null)
    }
  }

  async function downloadPdf() {
    if (busy) return
    setBusy('pdf')
    try {
      const dataUrl = await renderJpeg(2, 0.9)
      const { jsPDF } = await import('jspdf')
      const image = new window.Image()
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error('image failed'))
        image.src = dataUrl
      })
      const w = image.width / 2
      const h = image.height / 2
      const pdf = new jsPDF({
        orientation: w > h ? 'landscape' : 'portrait',
        unit: 'px',
        format: [w, h],
        hotfixes: ['px_scaling'],
      })
      pdf.addImage(dataUrl, 'JPEG', 0, 0, w, h, undefined, 'FAST')
      pdf.save(`${slugify(scoreSummary)}-scorecard.pdf`)
      notify.success(t('result.downloadReady'))
    } catch {
      notify.error(t('result.pdfError'))
    } finally {
      setBusy(null)
    }
  }

  async function systemShare() {
    const shared = await webShare({
      title: t('result.shareTitle'),
      text: shareText,
      url: shareUrl,
    })
    if (shared) {
      notify.success(t('result.shared'))
    } else {
      setShareOpen(true)
    }
  }

  async function shareImage() {
    if (busy) return
    setBusy('png')
    try {
      const dataUrl = await renderPng(2)
      const blob = dataUrlToBlob(dataUrl)
      const filename = `${slugify(scoreSummary)}-scorecard.png`
      const file = new File([blob], filename, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: t('result.shareTitle'), text: shareText })
        notify.success(t('result.shared'))
      } else {
        downloadBlob(blob, filename)
        notify.info(t('result.downloadReady'))
      }
    } catch (caught) {
      if (!(caught instanceof DOMException && caught.name === 'AbortError')) {
        notify.error(t('result.shareFailed'))
      }
    } finally {
      setBusy(null)
    }
  }

  function openProvider(provider: 'whatsapp' | 'telegram' | 'messenger') {
    void copyText(shareText)
    window.open(providerUrl(provider, shareUrl, shareText), '_blank', 'noopener,noreferrer')
  }

  async function copySummary() {
    const ok = await copyText(shareText)
    setCopied(ok)
    if (ok) {
      notify.success(t('result.summaryCopied'))
      window.setTimeout(() => setCopied(false), 1800)
    } else {
      notify.error(t('result.copyFailed'))
    }
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-[#d8c7a2]/60 bg-paper-50/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-3 sm:px-5">
          <Logo compact link={false} />
          <span className="hidden rounded-md border border-[#d8c7a2] bg-white/65 px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-[0.16em] text-ink sm:inline-block">
            {room.code}
          </span>
          <span className="hidden items-center gap-1 rounded-full border border-leaf/20 bg-leaf/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-leaf sm:inline-flex">
            <Check size={10} /> {abandoned ? t('match.abandonedWinner') : t('common.finished')}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <LanguageToggle compact />
            <SoundToggle />
            <button
              type="button"
              onClick={() => setLeaveOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-full border border-[#d3c2a0] bg-paper-50/80 text-slate-500 transition hover:bg-white hover:text-pencil"
              aria-label={t('common.leaveRoom')}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-3 pb-16 pt-4 sm:px-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setLeaveOpen(true)}
            className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-500 transition hover:text-ink"
          >
            <ArrowLeft size={14} /> {t('common.leaveRoom')}
          </button>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">
            {t('result.matchDetails', { overs: room.overs, wickets: room.wickets, date: dateLabel })}
          </p>
        </div>

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className={clsx(
            'relative mb-4 overflow-hidden rounded-[26px] border px-5 py-6 shadow-desk sm:px-8 sm:py-7',
            isWinner && !tied
              ? 'border-leaf/30 bg-[#eaf4ec]'
              : tied
                ? 'border-[#d8c7a2] bg-paper-50'
                : 'border-ink/15 bg-[#edf3fd]',
          )}
        >
          {isWinner && !reduced ? <ConfettiBurst burstKey={`result-${room.id}`} intense /> : null}
          <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rotate-12 rounded-full border border-ink/10" />
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-pencil">
                <Trophy size={13} /> {abandoned ? t('match.abandonedWinner') : tied ? t('match.matchTied') : t('match.endMatch')}
              </p>
              <h1 className="font-hand text-[46px] font-bold leading-[0.95] text-ink-deep sm:text-[62px]">
                {titleTeam ? (
                  <>
                    <span className={isBn ? 'mr-[0.3em]' : undefined}>{titleTeam}</span>{' '}
                    {titleSuffix}
                  </>
                ) : (
                  titleSuffix
                )}
              </h1>
              <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-slate-600">{subtitle}</p>
            </div>
            {winner ? (
              <div className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/55 px-4 py-3 shadow-sm">
                <PlayerAvatar name={winner.name} slot={winner.slot} size="lg" />
                <div>
                  <p className="font-hand text-[28px] font-bold leading-none text-ink-deep">{winner.teamName}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {winner.name}
                    {winner.userId === room.hostUserId ? ` · ${t('common.host')}` : ''}
                  </p>
                </div>
              </div>
            ) : (
              <span className="grid h-16 w-16 place-items-center rounded-full border border-ink/15 bg-white/60 text-ink">
                <Sparkles size={30} />
              </span>
            )}
          </div>
          <div className="relative z-10 mt-5 grid grid-cols-2 gap-2 sm:max-w-md">
            {[1, 2].map((slot) => {
              const player = activePlayers.find((entry) => entry.slot === slot) ?? players.find((entry) => entry.slot === slot)
              if (!player) return null
              const teamInnings = innings.filter((entry) => entry.battingUserId === player.userId && entry.number <= 2)
              const main = teamInnings[teamInnings.length - 1]
              return (
                <div key={player.userId} className="rounded-xl border border-ink/10 bg-white/50 px-3 py-2">
                  <p className="truncate text-[10px] font-bold text-slate-500">{player.teamName}</p>
                  <p className="font-hand text-[30px] font-bold leading-none text-ink-deep">
                    {main ? main.runs : 0}
                    <span className="text-xl text-ink/40">/{main ? main.wickets : 0}</span>
                  </p>
                  <p className="text-[9.5px] text-slate-400">{main ? formatOvers(main.legalBalls) : '0.0'} {t('common.oversShort')}</p>
                </div>
              )
            })}
          </div>
        </motion.div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button type="button" className="btn-primary btn-sm" onClick={() => void downloadImage()} disabled={Boolean(busy)}>
            {busy === 'png' ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
            {t('result.downloadPng')}
          </button>
          <button type="button" className="btn-paper btn-sm" onClick={() => void downloadPdf()} disabled={Boolean(busy)}>
            {busy === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
            {t('result.downloadPdf')}
          </button>
          <button type="button" className="btn-paper btn-sm" onClick={() => void systemShare()} disabled={Boolean(busy)}>
            <Share2 size={14} /> {t('common.share')}
          </button>
          <button type="button" className="btn-paper btn-sm" onClick={() => void shareImage()} disabled={Boolean(busy)}>
            <Sparkles size={14} /> {t('common.shareImage')}
          </button>
        </div>

        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-300/70 bg-amber-50/80 px-3 py-2.5 text-[11.5px] leading-relaxed text-amber-900">
          <Download size={15} className="mt-0.5 shrink-0" />
          <span>
            {t('result.waitOpponent')} {t('result.roomLife')}
          </span>
        </div>

        {/* export card starts here */}
        <article ref={exportRef} className="paper-card overflow-hidden rounded-[24px] bg-[#fffdf7] p-4 sm:p-6" aria-label={t('result.imageAlt')}>
          <header className="mb-4 border-b-2 border-ink/30 pb-3 text-center">
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-400">{t('result.scorebook')}</p>
            <h2 className="mt-1 font-hand text-[40px] font-bold leading-none text-ink-deep sm:text-[48px]">{t('result.scorecardTitle')}</h2>
            <p className="mt-1 font-hand text-lg text-slate-500">
              {teamsByUser.get(innings[0]?.battingUserId ?? '') ?? ''} {t('result.against')}{' '}
              {teamsByUser.get(innings[0]?.bowlingUserId ?? '') ?? ''}
            </p>
            <p className="text-[10px] text-slate-400">{t('result.matchDetails', { overs: room.overs, wickets: room.wickets, date: dateLabel })}</p>
          </header>

          <div className="space-y-5">
            {mainInnings.length > 0 ? (
              <section>
                <h3 className="mb-2 font-hand text-[27px] font-bold leading-none text-ink-deep">{t('result.theMatch')}</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {mainInnings.map((inn) => (
                    <InningsScorecard key={inn.id} innings={inn} snapshot={snapshot} title={resultInningsLabel(inn.number, t)} />
                  ))}
                </div>
              </section>
            ) : null}

            {superInnings.length > 0 ? (
              <section>
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-marigold/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#956313]">{t('result.superOver')}</span>
                  <span className="h-px flex-1 bg-ink/10" />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {superInnings.map((inn) => (
                    <InningsScorecard key={inn.id} innings={inn} snapshot={snapshot} title={resultInningsLabel(inn.number, t)} />
                  ))}
                </div>
              </section>
            ) : null}

            {mainInnings.length > 0 ? (
              <section>
                <h3 className="mb-2 flex items-center gap-1.5 font-hand text-[27px] font-bold leading-none text-ink-deep">
                  <Flame size={18} className="text-marigold" /> {t('result.runsPerOver')}
                </h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {[...mainInnings, ...superInnings].map((inn) => (
                    <OverChart
                      key={inn.id}
                      innings={inn}
                      snapshot={snapshot}
                      color={inn.number === 1 || inn.number === 3 ? '#234e8b' : '#c8544a'}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <section>
              <h3 className="mb-2 flex items-center gap-1.5 font-hand text-[27px] font-bold leading-none text-ink-deep">
                <BookOpen size={18} className="text-ink" /> {t('result.timeline')}
              </h3>
              <div className="space-y-2">
                {[...mainInnings, ...superInnings].map((inn) => (
                  <OverTimeline key={inn.id} innings={inn} snapshot={snapshot} title={resultInningsLabel(inn.number, t)} />
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-2 flex items-center gap-1.5 font-hand text-[27px] font-bold leading-none text-ink-deep">
                <Sparkles size={18} className="text-marigold" /> {t('result.funStats')}
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <StatBox label={t('result.mostSixes')} value={stats.mostSixes ? `${stats.mostSixes.name} · ${stats.mostSixes.sixes}` : '—'} />
                <StatBox label={t('result.mostFours')} value={stats.mostFours ? `${stats.mostFours.name} · ${stats.mostFours.fours}` : '—'} />
                <StatBox label={t('result.bestOver')} value={stats.bestOver ? `${stats.bestOver.team} · ${stats.bestOver.over} (${stats.bestOver.runs})` : '—'} />
                <StatBox label={t('result.totalSixes')} value={String(stats.totalSixes)} />
                <StatBox label={t('result.totalFours')} value={String(stats.totalFours)} />
                <StatBox label={t('result.wicketsTaken')} value={String(stats.totalWickets)} />
              </div>
            </section>

            <footer className="flex items-center justify-between border-t-2 border-dashed border-ink/20 pt-3">
              <p className="font-hand text-lg text-ink/55">{t('result.scorebook')}</p>
              <p className="font-mono text-[10px] tracking-[0.18em] text-slate-400">{room.code}</p>
            </footer>
          </div>
        </article>

        <div className="mt-4 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <button type="button" className="btn-paper" onClick={() => setLeaveOpen(true)}>
            <LogOut size={16} className="text-pencil" /> {t('result.leave')}
          </button>
          <p className="text-center text-[10.5px] text-slate-400 sm:ml-auto sm:text-right">{t('result.roomLife')}</p>
        </div>
      </main>

      <LeaveConfirmDialog
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        onLeave={onLeave}
        title={t('result.leavingTitle')}
        body={t('result.leavingBody')}
        downloadLabel={t('result.downloadPng')}
        onDownload={downloadImage}
        leavingLabel={t('result.leave')}
      />

      <Dialog open={shareOpen} onClose={() => setShareOpen(false)} title={t('result.shareTitle')} eyebrow={t('result.shareEyebrow')} size="sm">
        <p className="mb-4 text-[13px] leading-relaxed text-slate-600">{scoreSummary}</p>
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={() => openProvider('whatsapp')} className="flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-xl border border-[#cbe7d2] bg-[#eaf7ed] px-2 text-[11px] font-semibold text-[#216c43]">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#25D366] text-white"><MessageCircle size={17} /></span>
            WhatsApp
          </button>
          <button type="button" onClick={() => openProvider('telegram')} className="flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-xl border border-[#c7e6f5] bg-[#e9f6fc] px-2 text-[11px] font-semibold text-[#11658f]">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#229ED9] text-white"><Send size={16} /></span>
            Telegram
          </button>
          <button type="button" onClick={() => openProvider('messenger')} className="flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-xl border border-[#d6d9f5] bg-[#eff0fd] px-2 text-[11px] font-semibold text-[#41428f]">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#5b64e8] text-white"><MessageCircle size={17} /></span>
            Messenger
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" className="btn-paper btn-sm" onClick={() => void copySummary()}>
            {copied ? <Check size={14} className="text-leaf" /> : <Copy size={14} />} {t('common.copy')}
          </button>
          <button type="button" className="btn-primary btn-sm" onClick={() => void shareImage()}>
            <ImageIcon size={14} /> {t('common.shareImage')}
          </button>
        </div>
      </Dialog>
    </div>
  )
}

function resultInningsLabel(number: number, t: (key: string) => string): string {
  if (number === 1) return t('result.firstInnings')
  if (number === 2) return t('result.secondInnings')
  return t('result.superOver')
}

function InningsScorecard({ innings, snapshot, title }: { innings: InningsDTO; snapshot: MatchSnapshot; title: string }) {
  const { t } = useTranslation()
  const player = snapshot.players.find((entry) => entry.userId === innings.battingUserId)
  const bowler = snapshot.players.find((entry) => entry.userId === innings.bowlingUserId)
  const squad = player?.squad ?? []
  const scores = buildPlayerScores(innings, snapshot.balls, squad)
  const didNotBat = squad.filter((_, index) => !scores.some((score) => score.index === index))
  const falls = buildFallOfWickets(innings, snapshot.balls)

  return (
    <div className="overflow-hidden rounded-xl border border-[#ddcfb4] bg-white/45">
      <div className="flex items-center justify-between gap-2 border-b border-[#e1d3b8] bg-ink/[0.04] px-3 py-2">
        <div className="min-w-0">
          <p className="truncate font-hand text-[24px] font-bold leading-none text-ink-deep">{player?.teamName ?? title}</p>
          <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400">{title} · {bowler?.teamName}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-hand text-[28px] font-bold leading-none text-ink-deep">
            {innings.runs}<span className="text-lg text-ink/40">/{innings.wickets}</span>
          </p>
          <p className="text-[9px] text-slate-400">{formatOvers(innings.legalBalls)} {t('common.oversShort')}</p>
        </div>
      </div>
      <table className="w-full border-collapse text-[10.5px]">
        <thead>
          <tr className="border-b border-[#e7d9bd] text-[8.5px] uppercase tracking-wide text-slate-400">
            <th className="px-2.5 py-1 text-left font-semibold">{t('score.batting')}</th>
            <th className="w-7 py-1 text-right font-semibold">R</th>
            <th className="w-7 py-1 text-right font-semibold">B</th>
            <th className="w-7 py-1 text-right font-semibold">4</th>
            <th className="w-7 py-1 text-right font-semibold">6</th>
            <th className="w-10 py-1 text-right font-semibold">SR</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((score) => (
            <tr key={score.index} className="border-b border-[#ece0ca]/70 last:border-0">
              <td className="px-2.5 py-1.5">
                <span className="block truncate font-medium text-slate-700">{score.name}</span>
                <span className="block text-[9px] italic text-slate-400">
                  {score.isOut ? `${t('score.out')} · ${outLabel(score.outType, t)}` : t('result.notOut')}
                </span>
              </td>
              <td className="py-1.5 text-right font-bold text-ink-deep">{score.runs}</td>
              <td className="py-1.5 text-right text-slate-500">{score.balls}</td>
              <td className="py-1.5 text-right text-slate-500">{score.fours}</td>
              <td className="py-1.5 text-right text-slate-500">{score.sixes}</td>
              <td className="py-1.5 pr-2 text-right text-slate-500">{strikeRate(score.runs, score.balls)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {falls.length > 0 ? (
        <p className="border-t border-[#ece0ca] px-2.5 py-1.5 text-[9.5px] leading-relaxed text-slate-400">
          <span className="font-semibold text-slate-500">{t('score.fallOfWickets')}:</span>{' '}
          {falls.map((fall, index) => (
            <span key={fall.wicket}>
              {index > 0 ? ', ' : ''}
              <b className="font-semibold text-slate-600">{fall.runs}/{fall.wicket}</b>{' '}
              ({fall.batterName}, {fall.overs} {t('common.oversShort')})
            </span>
          ))}
        </p>
      ) : null}
      {didNotBat.length > 0 ? (
        <p className="border-t border-[#ece0ca] px-2.5 py-1.5 text-[9.5px] text-slate-400">
          {t('result.dnb')}: {didNotBat.map((entry) => entry.name).join(', ')}
        </p>
      ) : null}
      <div className="flex items-center justify-between border-t border-[#e1d3b8] px-2.5 py-1.5 text-[9.5px]">
        <span className="text-slate-400">{t('result.extrasLine')}: <b className="text-slate-600">{innings.extras}</b></span>
        <span className="font-semibold text-ink-deep">{t('result.totalLine')}: {innings.runs}/{innings.wickets}</span>
      </div>
    </div>
  )
}

function OverChart({ innings, snapshot, color }: { innings: InningsDTO; snapshot: MatchSnapshot; color: string }) {
  const { t } = useTranslation()
  const overList = buildOverTimeline(innings, snapshot.balls)
  const max = Math.max(6, ...overList.map((over) => over.runs))
  const team = snapshot.players.find((entry) => entry.userId === innings.battingUserId)
  return (
    <div className="rounded-xl border border-[#ddcfb4] bg-white/40 p-3">
      <div className="mb-2 flex items-center justify-between text-[9px] font-semibold uppercase tracking-wide text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          {team?.teamName ?? resultInningsLabel(innings.number, t)}
        </span>
        <span>{formatOvers(innings.legalBalls)} {t('common.oversShort')}</span>
      </div>
      {overList.length === 0 ? (
        <p className="py-4 text-center text-[10px] italic text-slate-400">—</p>
      ) : (
        <div className="flex h-24 items-end gap-1.5 border-b border-ink/15 px-1">
          {overList.map((over) => (
            <div key={over.over} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[9px] font-semibold text-slate-500">{over.runs}</span>
              <div
                className="w-full max-w-6 rounded-t-sm"
                style={{ height: `${Math.max(4, (over.runs / max) * 68)}px`, backgroundColor: color, opacity: 0.82 }}
                title={t('result.overTooltip', { over: over.over, runs: over.runs, wickets: over.wickets })}
              />
              <span className="text-[7.5px] text-slate-400">{over.over}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function OverTimeline({ innings, snapshot, title }: { innings: InningsDTO; snapshot: MatchSnapshot; title: string }) {
  const { t } = useTranslation()
  const overList = buildOverTimeline(innings, snapshot.balls)
  const player = snapshot.players.find((entry) => entry.userId === innings.battingUserId)
  return (
    <div className="rounded-xl border border-[#e1d3b8] bg-white/40 p-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[9.5px] font-semibold text-slate-600">{player?.teamName} · {title}</p>
        <p className="text-[9px] text-slate-400">{innings.runs}/{innings.wickets} ({formatOvers(innings.legalBalls)})</p>
      </div>
      <div className="space-y-1">
        {overList.map((over) => (
          <div key={over.over} className="flex items-center gap-2">
            <span className="w-7 shrink-0 text-[8.5px] font-bold text-slate-400">#{over.over}</span>
            <div className="flex flex-1 flex-wrap items-center gap-1">
              {over.balls.map((ball: BallDTO) => (
                <span
                  key={ball.id}
                  className={clsx(
                    'inline-grid h-5 min-w-5 place-items-center rounded-full border px-1 text-[8px] font-bold',
                    ball.isWicket
                      ? 'border-pencil/30 bg-pencil text-white'
                      : ball.outcome === '4' || ball.outcome === '6'
                        ? 'border-ink/20 bg-ink text-white'
                        : ball.outcome === 'W' || ball.outcome === 'N'
                          ? 'border-[#d8c7a2] bg-[#f3ead8] text-slate-500'
                          : 'border-ink/15 bg-white text-ink-deep',
                  )}
                  title={t('result.ballTooltip', {
                    outcome: ball.isWicket ? t('match.resultWicket') : ball.outcome,
                    freeHit: ball.isFreeHit ? ` · ${t('common.freeHit')}` : '',
                  })}
                >
                  {ball.isWicket
                    ? 'W'
                    : ball.isFreeHit && ['CO', 'LBW', 'RO', 'BO'].includes(ball.outcome)
                      ? t('match.safeShort')
                      : ball.outcome === 'W'
                        ? t('score.wideShort')
                        : ball.outcome === 'N'
                          ? t('score.noBallShort')
                          : ball.outcome}
                </span>
              ))}
            </div>
            <span className="shrink-0 text-[8.5px] font-semibold text-slate-500">{over.runs} {t('common.runs')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-box">
      <p className="text-[8.5px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 truncate font-hand text-[19px] font-bold leading-tight text-ink-deep">{value}</p>
    </div>
  )
}
