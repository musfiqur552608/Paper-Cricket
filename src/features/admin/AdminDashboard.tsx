import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import {
  ArrowUpRight,
  Clock,
  Inbox,
  Info,
  RefreshCw,
  Swords,
  Timer,
  Trophy,
  Users,
} from 'lucide-react'
import {
  getAllRooms,
  getDashboardStats,
  type AdminRoom,
  type DailyStat,
  type DashboardStats,
} from '../../lib/adminApi'
import { PageHeader } from '../../components/admin/PageHeader'
import { Panel } from '../../components/admin/Panel'
import { StatCard } from '../../components/admin/StatCard'
import { LineChart } from '../../components/admin/LineChart'
import { BarChart } from '../../components/admin/BarChart'
import { DonutChart } from '../../components/admin/DonutChart'
import { HourChart } from '../../components/admin/HourChart'
import { StatusBadge } from '../../components/admin/StatusBadge'
import { Skeleton } from '../../components/admin/Skeleton'
import { relativeTime } from '../../lib/time'

const RANGES = [7, 30, 90] as const
type RangeDays = (typeof RANGES)[number]
type Metric = 'matches' | 'players' | 'hours'

const OUTCOME_COLORS: Record<string, string> = {
  sixes: 'var(--chart-red)',
  fours: 'var(--chart-blue)',
  wickets: 'var(--chart-amber)',
  noBalls: 'var(--chart-green)',
  wides: 'var(--chart-gray)',
  runs: 'var(--chart-purple)',
}

function percentChange(current?: number, previous?: number): number | null {
  if (current == null || previous == null) return null
  if (previous === 0) return current === 0 ? 0 : null
  return Math.round(((current - previous) / previous) * 100)
}

/** Build a matches/hours series from the rooms list before migration 0008. */
function buildFallbackSeries(rooms: AdminRoom[], days: number): DailyStat[] {
  const now = new Date()
  const buckets = new Map<string, DailyStat>()
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i))
    const key = date.toISOString().slice(0, 10)
    buckets.set(key, { date: key, matches: 0, players: 0, hours: 0, runs: 0, wickets: 0 })
  }
  for (const room of rooms) {
    const finished = room.finishedAt ? new Date(room.finishedAt) : null
    const created = new Date(room.createdAt)
    const key = (finished ?? created).toISOString().slice(0, 10)
    const bucket = buckets.get(key)
    if (!bucket) continue
    if (room.status === 'finished') bucket.matches += 1
    if (room.startedAt) {
      const start = new Date(room.startedAt).getTime()
      const end = finished?.getTime() ?? Date.now()
      bucket.hours += Math.max(0, end - start) / 3_600_000
    }
  }
  return [...buckets.values()].map((bucket) => ({
    ...bucket,
    hours: Math.round(bucket.hours * 100) / 100,
  }))
}

function buildFallbackHourly(rooms: AdminRoom[]): Array<{ hour: number; matches: number }> {
  const counts = Array.from({ length: 24 }, (_, hour) => ({ hour, matches: 0 }))
  for (const room of rooms) {
    const hour = new Date(room.createdAt).getUTCHours()
    const bucket = counts[hour]
    if (bucket) bucket.matches += 1
  }
  return counts
}

export function AdminDashboard() {
  const { t, i18n } = useTranslation()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [rooms, setRooms] = useState<AdminRoom[]>([])
  const [range, setRange] = useState<RangeDays>(30)
  const [metric, setMetric] = useState<Metric>('matches')
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const [statsResult, roomsResult] = await Promise.allSettled([
        getDashboardStats(range),
        getAllRooms(),
      ])
      if (cancelled) return
      if (statsResult.status === 'fulfilled') setStats(statsResult.value)
      if (roomsResult.status === 'fulfilled') setRooms(roomsResult.value)
      setFailed(statsResult.status === 'rejected')
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [range, refreshKey])

  const showSkeleton = loading && !stats
  const numberFormat = useMemo(() => new Intl.NumberFormat(i18n.language), [i18n.language])
  const formatNumber = (value: number) => numberFormat.format(value)
  const formatHours = (value: number) => numberFormat.format(Math.round(value * 10) / 10)

  const formatHour = (hour: number) =>
    new Intl.DateTimeFormat(i18n.language, { hour: 'numeric' }).format(new Date(2020, 0, 1, hour))

  const series = useMemo(
    () => stats?.series ?? buildFallbackSeries(rooms, range),
    [stats, rooms, range],
  )

  const trend = useMemo(
    () =>
      series.map((point) => {
        const date = new Date(`${point.date}T00:00:00Z`)
        const label =
          range <= 7
            ? date.toLocaleDateString(i18n.language, { weekday: 'short', timeZone: 'UTC' })
            : date.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', timeZone: 'UTC' })
        const fullLabel = date.toLocaleDateString(i18n.language, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          timeZone: 'UTC',
        })
        const value =
          metric === 'matches' ? point.matches : metric === 'players' ? point.players : point.hours
        return { label, fullLabel, value }
      }),
    [series, metric, range, i18n.language],
  )

  const rangeMatches = series.reduce((sum, point) => sum + point.matches, 0)
  const rangePlayers = series.reduce((sum, point) => sum + point.players, 0)
  const rangeHours = series.reduce((sum, point) => sum + point.hours, 0)

  const roomCounts = useMemo(() => {
    if (stats) {
      return {
        live: stats.roomsLive,
        lobby: stats.roomsLobby,
        finished: stats.roomsFinished,
        abandoned: stats.roomsAbandoned,
        total: stats.totalRooms,
      }
    }
    return {
      live: rooms.filter((room) => room.status === 'live').length,
      lobby: rooms.filter((room) => room.status === 'lobby').length,
      finished: rooms.filter((room) => room.status === 'finished').length,
      abandoned: rooms.filter((room) => room.status === 'abandoned').length,
      total: rooms.length,
    }
  }, [stats, rooms])

  const completionRate = useMemo(() => {
    if (typeof stats?.completionRate === 'number') return stats.completionRate
    const decided = roomCounts.finished + roomCounts.abandoned
    return decided > 0 ? Math.round((roomCounts.finished / decided) * 1000) / 10 : 0
  }, [stats, roomCounts])

  const roomStates = [
    { label: t('admin.live'), value: roomCounts.live, color: 'var(--chart-green)' },
    { label: t('admin.lobby'), value: roomCounts.lobby, color: 'var(--chart-blue)' },
    { label: t('admin.finished'), value: roomCounts.finished, color: 'var(--chart-gray)' },
    { label: t('admin.abandoned'), value: roomCounts.abandoned, color: 'var(--chart-red)' },
  ]

  const outcomes = useMemo(() => {
    const labelFor = (key: string) => {
      switch (key) {
        case 'sixes':
          return t('admin.sixes')
        case 'fours':
          return t('admin.fours')
        case 'wickets':
          return t('admin.wickets')
        case 'noBalls':
          return t('admin.noBalls')
        case 'wides':
          return t('admin.wides')
        case 'runs':
          return t('admin.runsShort')
        default:
          return key
      }
    }

    if (stats?.outcomes?.length) {
      return stats.outcomes
        .filter((item) => item.value > 0)
        .map((item) => ({
          label: labelFor(item.key),
          value: item.value,
          color: OUTCOME_COLORS[item.key],
        }))
    }

    if (!stats) return []
    return [
      { label: t('admin.sixes'), value: stats.totalSixes, color: OUTCOME_COLORS.sixes },
      { label: t('admin.fours'), value: stats.totalFours, color: OUTCOME_COLORS.fours },
      { label: t('admin.wickets'), value: stats.totalWickets, color: OUTCOME_COLORS.wickets },
      { label: t('admin.noBalls'), value: stats.totalNoBalls, color: OUTCOME_COLORS.noBalls },
      { label: t('admin.wides'), value: stats.totalWides, color: OUTCOME_COLORS.wides },
    ].filter((item) => item.value > 0)
  }, [stats, t])

  const hourly = useMemo(() => {
    const source = stats?.hourly?.length ? stats.hourly : buildFallbackHourly(rooms)
    return source.map((point) => ({ hour: point.hour, value: point.matches }))
  }, [stats, rooms])

  const peakHour = hourly.reduce(
    (best, point) => (point.value > best.value ? point : best),
    { hour: 0, value: 0 },
  )

  const topPlayers = stats?.topPlayers ?? []
  const recentRooms = rooms.slice(0, 6)

  const statusLabel = (status: string) => {
    switch (status) {
      case 'live':
        return t('admin.live')
      case 'lobby':
        return t('admin.lobby')
      case 'finished':
        return t('admin.finished')
      case 'abandoned':
        return t('admin.abandoned')
      default:
        return status
    }
  }

  const updatedLabel = stats?.generatedAt
    ? t('admin.lastUpdated', {
        time: new Date(stats.generatedAt).toLocaleTimeString(i18n.language, {
          hour: '2-digit',
          minute: '2-digit',
        }),
      })
    : null

  const metricAccent =
    metric === 'hours'
      ? 'var(--pencil)'
      : metric === 'players'
        ? 'var(--chart-green)'
        : 'var(--ink-mid)'

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t('admin.workspace')}
        title={t('admin.dashboard')}
        subtitle={t('admin.dashboardSub')}
        actions={
          <>
            {updatedLabel && (
              <span className="hidden text-[10px] font-medium text-slate-400 md:inline">
                {updatedLabel}
              </span>
            )}
            <div className="inline-flex rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-1 shadow-sm">
              {RANGES.map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setRange(days)}
                  className={clsx(
                    'rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition sm:px-3',
                    range === days
                      ? 'bg-[#234e8b] text-[#fbf7ec] shadow-sm dark:bg-[#7fa6e0] dark:text-[#0d1b30]'
                      : 'text-slate-500 hover:text-ink-deep dark:text-slate-400',
                  )}
                  aria-pressed={range === days}
                >
                  {t(`admin.last${days}Days`)}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setRefreshKey((key) => key + 1)}
              disabled={loading}
              className="btn-ghost flex items-center gap-2 text-xs font-semibold disabled:opacity-60"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : undefined} />
              {t('admin.refresh')}
            </button>
          </>
        }
      />

      {failed && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#c8544a]/25 bg-[#c8544a]/10 px-4 py-3 text-xs font-medium text-[#c8544a] dark:border-[#e98a80]/25 dark:bg-[#e98a80]/10 dark:text-[#e98a80]">
          {t('admin.loadFailed')}
          <button
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            className="font-bold underline underline-offset-2"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {stats && !Array.isArray(stats.series) && (
        <div className="flex items-start gap-2.5 rounded-xl border border-[#234e8b]/20 bg-[#234e8b]/10 px-4 py-3 text-[11px] leading-relaxed text-slate-600 dark:border-[#7fa6e0]/25 dark:bg-[#7fa6e0]/10 dark:text-slate-300">
          <Info size={14} className="mt-0.5 shrink-0 text-[#234e8b] dark:text-[#a9c6f0]" />
          {t('admin.analyticsSetup')}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={t('admin.matchesThisWeek')}
          value={formatNumber(stats?.matchesWeek ?? 0)}
          hint={t('admin.allTimeMatches', { value: formatNumber(stats?.totalMatches ?? 0) })}
          icon={Swords}
          tone="ink"
          delta={percentChange(stats?.matchesWeek, stats?.matchesPrevWeek)}
          deltaLabel={t('admin.vsLastWeek')}
          loading={showSkeleton}
        />
        <StatCard
          title={t('admin.playersThisWeek')}
          value={formatNumber(stats?.playersWeek ?? 0)}
          hint={t('admin.allTimePlayers', { value: formatNumber(stats?.totalPlayers ?? 0) })}
          icon={Users}
          tone="leaf"
          delta={percentChange(stats?.playersWeek, stats?.playersPrevWeek)}
          deltaLabel={t('admin.vsLastWeek')}
          loading={showSkeleton}
        />
        <StatCard
          title={t('admin.hoursThisWeek')}
          value={`${formatHours(stats?.hoursWeek ?? 0)}h`}
          hint={t('admin.allTimeHours', { value: formatHours(stats?.totalHours ?? 0) })}
          icon={Clock}
          tone="pencil"
          delta={percentChange(stats?.hoursWeek, stats?.hoursPrevWeek)}
          deltaLabel={t('admin.vsLastWeek')}
          loading={showSkeleton}
        />
        <StatCard
          title={t('admin.avgMatch')}
          value={`${formatHours(stats?.avgMatchMinutes ?? 0)} ${t('admin.minutesShort')}`}
          hint={t('admin.completed', { value: formatHours(completionRate) })}
          icon={Timer}
          tone="amber"
          loading={showSkeleton}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel
          className="xl:col-span-8"
          title={t('admin.performance')}
          subtitle={t('admin.performanceSub')}
          action={
            <div className="inline-flex rounded-lg border border-[var(--card-border)] bg-[var(--ink-ghost-3)] p-0.5">
              {(['matches', 'players', 'hours'] as Metric[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMetric(item)}
                  className={clsx(
                    'rounded-md px-2.5 py-1 text-[10px] font-bold capitalize transition',
                    metric === item
                      ? 'bg-[var(--card-bg)] text-ink-deep shadow-sm'
                      : 'text-slate-500 hover:text-ink-deep dark:text-slate-400',
                  )}
                  aria-pressed={metric === item}
                >
                  {item === 'matches'
                    ? t('admin.matches')
                    : item === 'players'
                      ? t('admin.players')
                      : t('admin.hours')}
                </button>
              ))}
            </div>
          }
        >
          {showSkeleton ? (
            <Skeleton className="h-[280px] w-full" />
          ) : (
            <LineChart
              data={trend}
              accent={metricAccent}
              height={280}
              emptyLabel={t('admin.noActivity')}
              valueFormatter={(value) =>
                metric === 'hours'
                  ? `${formatHours(value)} ${t('admin.hours')}`
                  : formatNumber(value)
              }
              ariaLabel={t('admin.performance')}
            />
          )}

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              { label: t('admin.matches'), value: formatNumber(rangeMatches) },
              { label: t('admin.playerAppearances'), value: formatNumber(rangePlayers) },
              { label: t('admin.hours'), value: `${formatHours(rangeHours)}h` },
              { label: t('admin.avgRuns'), value: formatHours(stats?.avgRunsPerMatch ?? 0) },
              { label: t('admin.avgBalls'), value: formatHours(stats?.avgBallsPerMatch ?? 0) },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-[var(--card-border)] bg-[var(--ink-ghost-3)] px-3 py-2.5"
              >
                <p className="truncate text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {item.label}
                </p>
                <p className="mt-1 font-hand text-xl font-bold leading-none text-ink-deep tabular-nums">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          className="xl:col-span-4"
          title={t('admin.roomStates')}
          subtitle={t('admin.roomStateSub')}
        >
          {showSkeleton ? (
            <div className="space-y-4">
              <Skeleton className="mx-auto h-[180px] w-[180px] rounded-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <div className="space-y-5">
              <DonutChart
                data={roomStates}
                centerValue={formatNumber(roomCounts.total)}
                centerLabel={t('admin.rooms')}
                emptyLabel={t('admin.noRooms')}
              />
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--ink-ghost-3)] p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    {t('admin.completionRate')}
                  </span>
                  <span className="font-hand text-xl font-bold leading-none text-ink-deep tabular-nums">
                    {formatHours(completionRate)}%
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--ink-ghost-2)]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(Math.max(completionRate, 0), 100)}%` }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-full bg-[#1f5c3d] dark:bg-[#93c5a8]"
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1f5c3d]/10 px-2 py-1 text-[10px] font-semibold text-[#1f5c3d] dark:bg-[#93c5a8]/10 dark:text-[#93c5a8]">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {t('admin.liveNow')} · {formatNumber(roomCounts.live)} {t('admin.rooms')}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ink-ghost-2)] px-2 py-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    {t('admin.inLobby', { count: roomCounts.lobby })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title={t('admin.activityByHour')}
          subtitle={t('admin.activityByHourSub')}
          action={
            peakHour.value > 0 ? (
              <span className="rounded-full bg-[#c8544a]/10 px-2.5 py-1 text-[10px] font-bold text-[#c8544a] dark:bg-[#e98a80]/10 dark:text-[#e98a80]">
                {t('admin.peakHour', { hour: formatHour(peakHour.hour) })}
              </span>
            ) : null
          }
        >
          {showSkeleton ? (
            <Skeleton className="h-[170px] w-full" />
          ) : (
            <HourChart
              data={hourly}
              language={i18n.language}
              emptyLabel={t('admin.noData')}
              tooltipLabel={(hour, value) =>
                `${formatHour(hour)} · ${t('admin.matchesCount', { count: value })}`
              }
            />
          )}
        </Panel>

        <Panel
          title={t('admin.shotMix')}
          subtitle={t('admin.shotMixSub')}
          action={
            <span className="text-[10px] font-semibold text-slate-400">
              {t('admin.totalBalls')} · {formatNumber(stats?.totalBalls ?? 0)}
            </span>
          }
        >
          {showSkeleton ? (
            <Skeleton className="h-[180px] w-full" />
          ) : (
            <BarChart
              data={outcomes}
              emptyLabel={t('admin.noData')}
              valueFormatter={formatNumber}
            />
          )}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel
          className="xl:col-span-7"
          title={t('admin.recentRooms')}
          subtitle={t('admin.recentRoomsSub')}
          action={
            <Link
              to="/admin/rooms"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-pencil transition hover:underline underline-offset-2"
            >
              {t('admin.viewAll')}
              <ArrowUpRight size={12} />
            </Link>
          }
          bodyClassName="p-0"
        >
          {showSkeleton ? (
            <div className="space-y-2 p-5">
              {[0, 1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-11 w-full" />
              ))}
            </div>
          ) : recentRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
              <Inbox size={24} className="text-slate-300 dark:text-slate-600" />
              <p className="text-xs text-slate-400">{t('admin.noRooms')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--card-border)] text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    <th className="px-5 py-2.5">{t('admin.roomCode')}</th>
                    <th className="px-3 py-2.5">{t('admin.status')}</th>
                    <th className="px-3 py-2.5">{t('admin.players')}</th>
                    <th className="px-5 py-2.5 text-right">{t('admin.lastActive')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--card-border)]">
                  {recentRooms.map((room) => (
                    <tr key={room.id} className="transition hover:bg-[var(--ink-ghost-3)]">
                      <td className="px-5 py-3">
                        <Link
                          to={`/room/${room.code}`}
                          className="group inline-flex items-center gap-1.5 font-mono text-xs font-bold text-ink-deep transition hover:text-pencil"
                        >
                          {room.code}
                          <ArrowUpRight
                            size={12}
                            className="opacity-0 transition group-hover:opacity-100"
                          />
                        </Link>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {room.overs} {t('admin.oversShort')} · {room.wickets}{' '}
                          {t('admin.wicketsShort')}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={room.status} label={statusLabel(room.status)} />
                      </td>
                      <td className="px-3 py-3 text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-400">
                        {formatNumber(room.playerCount)}
                      </td>
                      <td className="px-5 py-3 text-right text-[10px] text-slate-400">
                        {relativeTime(room.lastActiveAt, i18n.language)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel
          className="xl:col-span-5"
          title={t('admin.topPlayers')}
          subtitle={t('admin.topPlayersSub')}
        >
          {showSkeleton ? (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((item) => (
                <Skeleton key={item} className="h-11 w-full" />
              ))}
            </div>
          ) : topPlayers.length === 0 ? (
            <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-center">
              <Trophy size={26} className="text-slate-300 dark:text-slate-600" />
              <p className="text-xs text-slate-400">{t('admin.noPlayersYet')}</p>
            </div>
          ) : (
            <ol className="space-y-2.5">
              {topPlayers.map((player, index) => (
                <li
                  key={`${player.name}-${index}`}
                  className="flex items-center gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--ink-ghost-3)] px-3 py-2.5"
                >
                  <span
                    className={clsx(
                      'grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold',
                      index === 0 && 'bg-[#e9a23b]/20 text-[#a16207] dark:text-[#fcd34d]',
                      index === 1 && 'bg-slate-400/20 text-slate-500 dark:text-slate-300',
                      index === 2 && 'bg-[#c8544a]/10 text-[#c8544a] dark:text-[#e98a80]',
                      index > 2 && 'bg-[var(--ink-ghost-2)] text-slate-500 dark:text-slate-400',
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink-deep">
                    {player.name}
                  </span>
                  <span className="shrink-0 text-[10px] font-bold tabular-nums text-slate-500 dark:text-slate-400">
                    {t('admin.matchesCount', { count: player.matches })}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  )
}
