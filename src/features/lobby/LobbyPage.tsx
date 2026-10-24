import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  Crown,
  LogOut,
  Pencil,
  Play,
  Settings2,
  Share2,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react'
import type { MatchSnapshot, RoomRules } from '../../types/game'
import { AppHeader } from '../../components/ui/AppHeader'
import { Dialog } from '../../components/ui/Dialog'
import { LeaveConfirmDialog } from '../../components/ui/LeaveConfirmDialog'
import { RuleStepper } from '../../components/ui/RuleStepper'
import { CoinToss, type TossWinner } from '../../components/ui/CoinToss'
import { PlayerAvatar } from '../../components/game/PlayerAvatar'
import { SquadEditor } from './SquadEditor'
import { InviteDialog } from './InviteDialog'
import { setPlayerReady, startMatch, updatePlayerProfile, updateRoomSettings } from '../../lib/supabase/api'
import { errorKey, toAppError } from '../../lib/errors'
import { GAME_DEFAULTS, makeSquadNames } from '../../config/gameConfig'
import { notify } from '../../store/toast'
import { copyText } from '../../lib/share'
import { sound } from '../../lib/sound'

interface LobbyProps {
  snapshot: MatchSnapshot
  userId: string
  opponentOnline: boolean
  presenceReady: boolean
  refresh: () => Promise<void>
  onLeave: () => Promise<void>
}

function onlineLabel(
  t: (key: string) => string,
  online: boolean,
  presenceReady: boolean,
): string {
  if (online) return t('lobby.online')
  return presenceReady ? t('lobby.offline') : t('lobby.reconnecting')
}

export function LobbyPage({ snapshot, userId, opponentOnline, presenceReady, refresh, onLeave }: LobbyProps) {
  const { t } = useTranslation()
  const { room, players } = snapshot
  const activePlayers = useMemo(() => players.filter((player) => !player.leftAt), [players])
  const me = activePlayers.find((player) => player.userId === userId) ?? players.find((player) => player.userId === userId)
  const isHost = room.hostUserId === userId
  const emptySlot = activePlayers.length < 2

  const [inviteOpen, setInviteOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [profileName, setProfileName] = useState(me?.name ?? '')
  const [profileTeam, setProfileTeam] = useState(me?.teamName ?? '')
  const [profileSquad, setProfileSquad] = useState<string[]>(me?.squad.map((player) => player.name) ?? [])
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [readyBusy, setReadyBusy] = useState(false)
  const [startBusy, setStartBusy] = useState(false)
  const [settingsBusy, setSettingsBusy] = useState(false)
  const [rules, setRules] = useState<RoomRules>({
    overs: room.overs,
    wickets: room.wickets,
    batFirst: 'toss',
    superOver: room.superOver,
  })
  const [copiedCode, setCopiedCode] = useState(false)
  const normalizeKeyRef = useRef('')
  const [tossWinner, setTossWinner] = useState<TossWinner | null>(null)
  const [tossPhase, setTossPhase] = useState<'flipping' | 'result'>('flipping')
  const tossShownRef = useRef<string | null>(null)
  const hostStartPendingRef = useRef(false)
  const lastBatFirstRef = useRef(room.batFirst)
  const tossResultTimerRef = useRef<number | null>(null)
  const tossStartTimerRef = useRef<number | null>(null)

  useEffect(() => {
    setRules({ overs: room.overs, wickets: room.wickets, batFirst: 'toss', superOver: room.superOver })
  }, [room.overs, room.wickets, room.superOver])

  // Older databases can return a squad that is longer or shorter than the
  // wicket setting (for example, an 11-name fallback from the join screen).
  // Normalise this player's sheet once the authoritative room rules arrive.
  useEffect(() => {
    if (!me || me.squad.length === room.wickets) return
    const key = `${room.id}:${me.userId}:${room.wickets}:${me.squad.length}`
    if (normalizeKeyRef.current === key) return
    normalizeKeyRef.current = key
    const squad = makeSquadNames(
      me.squad.map((player) => player.name),
      room.wickets,
      (position) => t('lobby.playerN', { n: position }),
    )
    void updatePlayerProfile(room.id, { name: me.name, teamName: me.teamName, squad })
      .then(() => refresh())
      .catch(() => {
        normalizeKeyRef.current = ''
      })
  }, [me, refresh, room.id, room.wickets, t])

  // The guest learns the toss result from the room's bat_first update. The
  // host triggers its own overlay from beginMatch, so the shared ref prevents
  // a duplicate animation.
  useEffect(() => {
    const previous = lastBatFirstRef.current
    lastBatFirstRef.current = room.batFirst
    if (room.status !== 'lobby') return
    const side = room.batFirst
    if ((side === 'host' || side === 'guest') && previous === 'toss' && tossShownRef.current !== side) {
      showToss(side)
    }
  }, [room.batFirst, room.status])

  useEffect(() => {
    return () => {
      if (tossResultTimerRef.current) window.clearTimeout(tossResultTimerRef.current)
      if (tossStartTimerRef.current) window.clearTimeout(tossStartTimerRef.current)
    }
  }, [])

  function randomTossSide(): 'host' | 'guest' {
    try {
      const bytes = new Uint8Array(1)
      window.crypto.getRandomValues(bytes)
      return (bytes[0] ?? 0) >= 128 ? 'host' : 'guest'
    } catch {
      return Math.random() < 0.5 ? 'host' : 'guest'
    }
  }

  function showToss(side: 'host' | 'guest') {
    if (tossShownRef.current === side) return
    const host = activePlayers.find((player) => player.userId === room.hostUserId)
    const guest = activePlayers.find((player) => player.userId !== room.hostUserId)
    const player = side === 'host' ? host : guest
    if (!player) return
    tossShownRef.current = side
    setTossWinner({ side, name: player.name, team: player.teamName })
    setTossPhase('flipping')
    if (tossResultTimerRef.current) window.clearTimeout(tossResultTimerRef.current)
    if (tossStartTimerRef.current) window.clearTimeout(tossStartTimerRef.current)
    tossResultTimerRef.current = window.setTimeout(() => setTossPhase('result'), 1650)
    tossStartTimerRef.current = window.setTimeout(() => finishToss(), 4200)
  }

  function finishToss() {
    setTossWinner(null)
    setTossPhase('flipping')
    tossShownRef.current = null
    if (!isHost || !hostStartPendingRef.current) return
    hostStartPendingRef.current = false
    void (async () => {
      try {
        await startMatch(room.id)
        await refresh()
      } catch (caught) {
        notify.error(t(errorKey(toAppError(caught).code)))
        setStartBusy(false)
      }
    })()
  }

  useEffect(() => {
    if (!profileOpen) return
    setProfileSquad((current) => {
      if (current.length === rules.wickets) return current
      const next = current.slice(0, rules.wickets)
      while (next.length < rules.wickets) {
        next.push(t('lobby.playerN', { n: next.length + 1 }))
      }
      return next
    })
  }, [profileOpen, rules.wickets, t])

  function openProfile() {
    if (!me) return
    setProfileName(me.name)
    setProfileTeam(me.teamName)
    setProfileSquad(me.squad.map((player) => player.name))
    setProfileError(null)
    setProfileOpen(true)
  }

  const bothReady = activePlayers.length === 2 && activePlayers.every((player) => player.isReady)
  const squadsAligned =
    activePlayers.length === 2 && activePlayers.every((player) => player.squad.length === rules.wickets)
  const canStart = isHost && bothReady && squadsAligned && !settingsBusy && !startBusy

  async function toggleReady() {
    if (!me || readyBusy) return
    setReadyBusy(true)
    sound.click()
    try {
      await setPlayerReady(room.id, !me.isReady)
      await refresh()
    } catch (caught) {
      notify.error(t(errorKey(toAppError(caught).code)))
    } finally {
      setReadyBusy(false)
    }
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault()
    if (savingProfile) return
    if (!profileName.trim()) {
      setProfileError(t('create.nameRequired'))
      return
    }
    if (!profileTeam.trim()) {
      setProfileError(t('create.teamRequired'))
      return
    }
    const cleanSquad = profileSquad.map((name, index) => name.trim() || `${t('lobby.playerN', { n: index + 1 })}`)
    setSavingProfile(true)
    setProfileError(null)
    try {
      await updatePlayerProfile(room.id, { name: profileName.trim(), teamName: profileTeam.trim(), squad: cleanSquad })
      try {
        window.localStorage.setItem('pc.name', profileName.trim())
        window.localStorage.setItem('pc.team', profileTeam.trim())
      } catch {
        // Storage is optional; the room itself already has the names.
      }
      await refresh()
      setProfileOpen(false)
      notify.success(t('lobby.profileSaved'))
    } catch (caught) {
      setProfileError(t(errorKey(toAppError(caught).code)))
    } finally {
      setSavingProfile(false)
    }
  }

  async function saveRules(next: RoomRules) {
    if (!isHost || settingsBusy) return
    const previous = rules
    const safeNext: RoomRules = { ...next, batFirst: 'toss' }
    setRules(safeNext)
    setSettingsBusy(true)
    try {
      await updateRoomSettings(room.id, safeNext)
      await refresh()
    } catch (caught) {
      setRules(previous)
      notify.error(t(errorKey(toAppError(caught).code)))
    } finally {
      setSettingsBusy(false)
    }
  }

  async function beginMatch() {
    if (!canStart || startBusy || tossWinner) return
    const side = randomTossSide()
    hostStartPendingRef.current = true
    setStartBusy(true)
    sound.cheer()
    try {
      // Old rooms may still have a host/guest choice stored. Reset it first so
      // both clients see a real transition into the selected toss result.
      if (room.batFirst !== 'toss') {
        await updateRoomSettings(room.id, { ...rules, batFirst: 'toss' })
      }
      await updateRoomSettings(room.id, { ...rules, batFirst: side })
      await refresh()
      showToss(side)
    } catch (caught) {
      hostStartPendingRef.current = false
      setStartBusy(false)
      notify.error(t(errorKey(toAppError(caught).code)))
    }
  }

  async function copyCode() {
    const ok = await copyText(room.code)
    if (!ok) {
      notify.error(t('lobby.copyFailed'))
      return
    }
    setCopiedCode(true)
    notify.success(t('lobby.codeCopied'))
    window.setTimeout(() => setCopiedCode(false), 1800)
  }

  if (!me) return null

  return (
    <div className="min-h-dvh">
      <AppHeader brandLink={false} />
      <main className="mx-auto w-full max-w-5xl px-4 pb-12 pt-1 sm:px-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-pencil">
                {t('lobby.roomLabel')} · {room.code}
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {t('lobby.readyCount', { ready: activePlayers.filter((player) => player.isReady).length })}
              </span>
            </div>
            <h1 className="mt-1 font-hand text-[44px] font-bold leading-none text-ink-deep sm:text-[54px]">
              {t('lobby.title')}
            </h1>
            <p className="mt-1 text-[13px] text-slate-500">{t('lobby.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-paper btn-sm" onClick={() => setInviteOpen(true)}>
              <Share2 size={14} /> {t('lobby.invite')}
            </button>
            <button type="button" className="btn-ghost btn-sm text-slate-500" onClick={() => setLeaveOpen(true)}>
              <LogOut size={14} /> {t('common.leaveRoom')}
            </button>
          </div>
        </div>

        {emptySlot ? (
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-dashed border-ink/25 bg-[#edf3fd]/80 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-ink shadow-sm">
                <UserPlus size={19} />
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-marigold" />
              </span>
              <div>
                <p className="font-hand text-[23px] font-bold leading-none text-ink-deep">{t('lobby.waitingBadge')}</p>
                <p className="mt-0.5 text-[11.5px] text-slate-500">{t('lobby.waitingBody')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 items-center rounded-lg border border-[#d8c7a2] bg-white/75 px-3 font-mono text-lg font-bold tracking-[0.22em] text-ink">
                {room.code}
              </div>
              <button type="button" className="btn-primary btn-sm" onClick={() => setInviteOpen(true)}>
                {t('lobby.invite')} <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[1.25fr_.9fr]">
          {/* Players + actions */}
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {[1, 2].map((slot) => {
                const player = activePlayers.find((entry) => entry.slot === slot)
                const isMe = player?.userId === userId
                const isPlayerHost = player?.userId === room.hostUserId
                if (!player) {
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setInviteOpen(true)}
                      className="flex min-h-[178px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#d3c2a0] bg-paper-50/35 p-5 text-slate-400 transition hover:border-ink/35 hover:bg-paper-50/70 hover:text-ink"
                    >
                      <span className="grid h-12 w-12 place-items-center rounded-full border border-dashed border-current/40">
                        <UserPlus size={21} />
                      </span>
                      <span className="font-hand text-xl">{t('lobby.emptyChair')}</span>
                      <span className="text-[11px]">{t('lobby.waitingTitle')}</span>
                    </button>
                  )
                }
                const online = isMe || (presenceReady && opponentOnline)
                return (
                  <motion.div
                    key={player.userId}
                    layout
                    className={clsx(
                      'paper-card relative overflow-hidden rounded-2xl p-4',
                      isMe && 'ring-1 ring-inset ring-ink/20',
                    )}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        {slot === 1 ? t('lobby.playerCardHost') : t('lobby.playerCardGuest')}
                        {isMe ? ` · ${t('common.you')}` : ''}
                      </span>
                      {isPlayerHost ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-marigold/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#956313]">
                          <Crown size={10} /> {t('common.host')}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-start gap-3">
                      <PlayerAvatar name={player.name} slot={player.slot} size="lg" />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-hand text-[28px] font-bold leading-none text-ink-deep">{player.name}</h3>
                        <p className="mt-1 truncate text-[12px] font-semibold text-slate-500">{player.teamName}</p>
                        <p className="mt-2 flex items-center gap-1 text-[10.5px] font-medium text-slate-400">
                          {online ? <Wifi size={11} className="text-leaf" /> : <WifiOff size={11} />}
                          {onlineLabel(t, online, presenceReady)}
                          <span className="mx-1 text-slate-300">·</span>
                          {t('lobby.squadCount', { count: player.squad.length })}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1">
                      {player.squad.slice(0, 6).map((batter) => (
                        <span key={batter.position} className="rounded-md bg-ink/[0.055] px-1.5 py-0.5 text-[10px] text-slate-500">
                          {batter.name}
                        </span>
                      ))}
                      {player.squad.length > 6 ? (
                        <span className="rounded-md px-1.5 py-0.5 text-[10px] text-slate-400">+{player.squad.length - 6}</span>
                      ) : null}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-dashed border-ink/10 pt-3">
                      {isMe ? (
                        <button type="button" className="text-[11.5px] font-semibold text-ink/70 hover:text-ink" onClick={openProfile}>
                          <Pencil size={12} className="mr-1 inline" />
                          {t('lobby.editTeam')}
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">{player.isReady ? t('lobby.readyStatus') : t('lobby.notReadyStatus')}</span>
                      )}
                      <span
                        className={clsx(
                          'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold',
                          player.isReady ? 'bg-leaf/10 text-leaf' : 'bg-slate-100 text-slate-400',
                        )}
                      >
                        {player.isReady ? <CheckCircle2 size={11} /> : <Clock3 size={11} />}
                        {player.isReady ? t('common.ready') : t('common.notReady')}
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <button
                type="button"
                onClick={() => void toggleReady()}
                disabled={readyBusy}
                className={clsx(
                  'btn btn-lg w-full',
                  me.isReady
                    ? 'border border-leaf/30 bg-leaf/10 text-leaf hover:bg-leaf/15'
                    : 'btn-pencil',
                )}
              >
                {readyBusy ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                ) : me.isReady ? (
                  <CheckCircle2 size={19} />
                ) : (
                  <ShieldCheck size={19} />
                )}
                {me.isReady ? t('lobby.undoReady') : t('lobby.markReady')}
              </button>
              {isHost ? (
                <button
                  type="button"
                  className="btn-primary btn-lg sm:w-auto sm:min-w-[190px]"
                  disabled={!canStart}
                  onClick={() => void beginMatch()}
                >
                  {startBusy ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <Play size={18} fill="currentColor" />
                  )}
                  {startBusy ? t('lobby.matchStarting') : t('lobby.start')}
                </button>
              ) : (
                <span className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#d3c2a0] px-4 text-[11.5px] text-slate-400 sm:w-[190px]">
                  <Clock3 size={13} /> {t('lobby.waitingHost')}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e0d2b8] bg-white/40 px-3.5 py-2.5">
              <div className="flex items-center gap-2 text-[11.5px] font-medium text-slate-500">
                <AlertCircle size={14} className="text-ink/45" />
                {activePlayers.length < 2
                  ? t('lobby.startWaitPlayers')
                  : !squadsAligned
                    ? t('lobby.waitSquads', { count: rules.wickets })
                    : !bothReady
                      ? t('lobby.startWaitReady')
                      : isHost
                        ? t('lobby.rulesTitle')
                        : t('lobby.waitingHost')}
              </div>
              <span className="text-[10.5px] text-slate-400">{t('lobby.rulesLine', { overs: rules.overs, wickets: rules.wickets })}</span>
            </div>

            <div className="paper-card rounded-2xl p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    <Users size={12} /> {t('common.createRoom')}
                  </p>
                  <p className="mt-0.5 text-[12px] text-slate-500">
                    {t('lobby.linkHint')}
                  </p>
                </div>
                <button type="button" className="btn-ghost btn-sm" onClick={() => setInviteOpen(true)}>
                  <Share2 size={14} /> {t('common.share')}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void copyCode()}
                  className="flex min-h-[46px] flex-1 items-center justify-center gap-3 rounded-xl border border-dashed border-ink/25 bg-white/55 font-mono text-xl font-bold tracking-[0.24em] text-ink transition hover:bg-white"
                >
                  {room.code}
                  {copiedCode ? <Check size={15} className="text-leaf" /> : <Copy size={14} className="text-slate-400" />}
                </button>
                <button type="button" className="btn-paper min-h-[46px]" onClick={() => setInviteOpen(true)}>
                  <Share2 size={15} /> {t('lobby.invite')}
                </button>
              </div>
            </div>
          </div>

          {/* Settings */}
          <aside className="paper-card relative h-fit overflow-hidden rounded-2xl p-4 sm:p-5">
            <div className="pointer-events-none absolute -right-5 -top-6 rotate-12 font-hand text-[86px] text-ink/[0.045]">
              {t('lobby.rulesScribble')}
            </div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  <Settings2 size={12} /> {t('lobby.hostSettings')}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {isHost ? t('lobby.hostPencil') : t('lobby.hostOnly')}
                </p>
              </div>
              {isHost ? <span className="chip border-marigold/30 bg-marigold/10 text-[#94620f]">{t('common.host')}</span> : null}
            </div>

            <div className="space-y-3">
              <RuleStepper
                label={t('common.overs')}
                value={rules.overs}
                min={1}
                max={GAME_DEFAULTS.maxOvers}
                disabled={!isHost || settingsBusy}
                onChange={(value) => void saveRules({ ...rules, overs: value })}
              />
              <RuleStepper
                label={t('common.wickets')}
                value={rules.wickets}
                min={1}
                max={GAME_DEFAULTS.maxSquadSize}
                disabled={!isHost || settingsBusy}
                onChange={(value) => void saveRules({ ...rules, wickets: value })}
              />
              <p className="-mt-1 px-1 text-[10.5px] leading-snug text-slate-400">
                {t('lobby.wicketsSetSquad', { count: rules.wickets })}
              </p>
              <div className="rounded-xl border border-[#d8c8ab] bg-white/40 px-3 py-2.5">
                <p className="text-[12px] font-semibold text-slate-700">{t('lobby.batFirst')}</p>
                <p className="mt-1 text-[10.5px] leading-snug text-slate-400">{t('lobby.coinTossNote')}</p>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-xl border border-[#d8c8ab] bg-white/40 px-3 py-2.5">
                <div>
                  <p className="text-[12px] font-semibold text-slate-700">{t('lobby.superOverLabel')}</p>
                  <p className="text-[10px] text-slate-400">{rules.superOver ? t('lobby.superOverOn') : t('lobby.superOverOff')}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={rules.superOver}
                  aria-label={t('lobby.superOverLabel')}
                  disabled={!isHost || settingsBusy}
                  onClick={() => void saveRules({ ...rules, superOver: !rules.superOver })}
                  className={clsx(
                    'relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50',
                    rules.superOver ? 'bg-ink' : 'bg-slate-300',
                  )}
                >
                  <span
                    className={clsx(
                      'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all',
                      rules.superOver ? 'left-[22px]' : 'left-0.5',
                    )}
                  />
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-ink/[0.045] px-3 py-2.5 text-center">
              <p className="font-hand text-[23px] font-bold leading-none text-ink-deep">
                {t('lobby.settingsSummary', {
                  overs: rules.overs,
                  wickets: rules.wickets,
                  squad: rules.wickets,
                })}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#d3c2a0] px-3 py-2.5 text-[11.5px] font-semibold text-slate-500 transition hover:border-ink/30 hover:text-ink"
            >
              <Sparkles size={13} className="text-marigold" />
              {t('lobby.shareCall')}
              <ChevronRight size={13} />
            </button>
          </aside>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[10.5px] text-slate-400">
          <ShieldCheck size={12} /> {t('match.freezeNote')}
        </p>
      </main>

      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} code={room.code} />

      <Dialog
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        title={t('lobby.profileTitle')}
        eyebrow={`${t('common.team')} · ${t('lobby.editTeam')}`}
        size="md"
      >
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="profile-name">
                {t('common.name')}
              </label>
              <input
                id="profile-name"
                className="input"
                value={profileName}
                maxLength={24}
                onChange={(event) => setProfileName(event.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="profile-team">
                {t('common.teamName')}
              </label>
              <input
                id="profile-team"
                className="input"
                value={profileTeam}
                maxLength={32}
                onChange={(event) => setProfileTeam(event.target.value)}
              />
            </div>
          </div>
          <SquadEditor squad={profileSquad} onChange={setProfileSquad} />
          {profileError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800" role="alert">
              {profileError}
            </p>
          ) : null}
          <button type="submit" className="btn-primary w-full" disabled={savingProfile}>
            {savingProfile ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : null}
            {t('lobby.saveProfile')}
          </button>
        </form>
      </Dialog>

      <LeaveConfirmDialog
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        onLeave={onLeave}
        title={t('lobby.leaveTitle')}
        body={t('lobby.leaveBodyLobby')}
      />

      <CoinToss open={Boolean(tossWinner)} winner={tossWinner} phase={tossPhase} />
    </div>
  )
}
