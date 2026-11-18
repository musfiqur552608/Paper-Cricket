import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { useAdminStore } from '../../store/admin'
import { getDashboardStats } from '../../lib/adminApi'
import { StatCard } from '../../components/admin/StatCard'
import { LineChart } from '../../components/admin/LineChart'
import { BarChart } from '../../components/admin/BarChart'
import { DonutChart } from '../../components/admin/DonutChart'

interface RecentPoint { label: string; value: number }
interface OutcomeItem { label: string; value: number; color: string }
interface StatusItem { label: string; value: number; color: string }

export function AdminDashboard() {
  const { t } = useTranslation()
  const { secret } = useAdminStore()
  const [stats, setStats] = useState<{
    totalRooms: number
    roomsLive: number
    roomsLobby: number
    roomsFinished: number
    roomsAbandoned: number
    totalPlayers: number
    playersToday: number
    playersWeek: number
    playersMonth: number
    totalMatches: number
    matchesToday: number
    matchesWeek: number
    matchesMonth: number
    totalBalls: number
    totalRuns: number
    totalWickets: number
    totalSixes: number
    totalFours: number
    totalNoBalls: number
    totalWides: number
    totalHours: number
    hoursToday: number
    hoursWeek: number
    hoursMonth: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!secret) return
    setLoading(true)
    getDashboardStats(secret)
      .then((data) => {
        setStats({
          totalRooms: data.totalRooms,
          roomsLive: data.roomsLive,
          roomsLobby: data.roomsLobby,
          roomsFinished: data.roomsFinished,
          roomsAbandoned: data.roomsAbandoned,
          totalPlayers: data.totalPlayers,
          playersToday: data.playersToday,
          playersWeek: data.playersWeek,
          playersMonth: data.playersMonth,
          totalMatches: data.totalMatches,
          matchesToday: data.matchesToday,
          matchesWeek: data.matchesWeek,
          matchesMonth: data.matchesMonth,
          totalBalls: data.totalBalls,
          totalRuns: data.totalRuns,
          totalWickets: data.totalWickets,
          totalSixes: data.totalSixes,
          totalFours: data.totalFours,
          totalNoBalls: data.totalNoBalls,
          totalWides: data.totalWides,
          totalHours: data.totalHours,
          hoursToday: data.hoursToday,
          hoursWeek: data.hoursWeek,
          hoursMonth: data.hoursMonth,
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [secret, refreshKey])

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1)
  }

  const outcomeItems: OutcomeItem[] = [
    { label: t('admin.sixes'), value: stats?.totalSixes ?? 0, color: '#c8544a' },
    { label: t('admin.fours'), value: stats?.totalFours ?? 0, color: '#234e8b' },
    { label: t('admin.noBalls'), value: stats?.totalNoBalls ?? 0, color: '#92400e' },
    { label: t('admin.wides'), value: stats?.totalWides ?? 0, color: '#6b21a8' },
  ]

  const statusItems: StatusItem[] = [
    { label: t('admin.live'), value: stats?.roomsLive ?? 0, color: '#1f5c3d' },
    { label: t('admin.lobby'), value: stats?.roomsLobby ?? 0, color: '#234e8b' },
    { label: t('admin.finished'), value: stats?.roomsFinished ?? 0, color: '#6b7280' },
    { label: t('admin.abandoned'), value: stats?.roomsAbandoned ?? 0, color: '#dc2626' },
  ]

  const activityData: RecentPoint[] = [
    { label: 'Mon', value: stats?.matchesToday ?? 0 },
    { label: 'Tue', value: Math.floor((stats?.matchesWeek ?? 0) / 2) },
    { label: 'Wed', value: Math.floor((stats?.matchesWeek ?? 0) / 3) },
    { label: 'Thu', value: Math.floor((stats?.matchesWeek ?? 0) / 4) },
    { label: 'Fri', value: Math.floor((stats?.matchesWeek ?? 0) / 5) },
    { label: 'Sat', value: Math.floor((stats?.matchesWeek ?? 0) / 6) },
    { label: 'Sun', value: stats?.matchesToday ?? 0 },
  ]

  if (!isAdmin()) return null

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 md:items-end">
        <div>
          <h2 className="font-hand text-3xl font-bold leading-tight text-ink-deep">
            {t('admin.dashboard')}
          </h2>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            {t('admin.dashboardSub')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="btn-ghost flex items-center gap-2 text-[13px] font-semibold"
          >
            <RefreshCw size={16} className="animate-spin" />
            {t('admin.refresh')}
          </button>
        </div>
      </div>

      {/* ── Overview stats ──────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t('admin.totalRooms')} value={stats?.totalRooms ?? 0} variant="primary" />
        <StatCard title={t('admin.liveRooms')} value={stats?.roomsLive ?? 0} variant="leaf" />
        <StatCard title={t('admin.totalPlayers')} value={stats?.totalPlayers ?? 0} variant="pencil" />
        <StatCard title={t('admin.totalHours')} value={stats?.totalHours ?? 0} subtitle={t('admin.playedHours')} variant="alert" trend={{ label: t('admin.today'), up: true }} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Activity over time */}
        <motion.div
          whileHover={{ y: -2 }}
          className="paper-card p-4 sm:p-5 lg:col-span-2"
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="font-hand text-xl font-bold leading-tight text-ink-deep">{t('admin.activity')}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('admin.matchesPlayed')}</p>
            </div>
            <StatCard title={t('admin.matchesThisWeek')} value={stats?.matchesWeek ?? 0} variant="primary" />
          </div>
          <LineChart title={t('admin.activityChart')} data={activityData} subtitle={t('admin.activityChartSub')} />
        </motion.div>

        {/* Outcomes */}
        <motion.div
          whileHover={{ y: -2 }}
          className="paper-card p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="font-hand text-xl font-bold leading-tight text-ink-deep">{t('admin.shotOutcomes')}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('admin.ballsByOutcome')}</p>
            </div>
            <StatCard title={t('admin.totalBalls')} value={stats?.totalBalls ?? 0} variant="alert" />
          </div>
          <BarChart title={t('admin.outcomeBreakdown')} data={outcomeItems} subtitle={t('admin.outcomeChartSub')} />
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Room status donut */}
        <motion.div
          whileHover={{ y: -2 }}
          className="paper-card p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="font-hand text-xl font-bold leading-tight text-ink-deep">{t('admin.roomStates')}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('admin.roomStateSub')}</p>
            </div>
            <StatCard title={t('admin.totalMatches')} value={stats?.totalMatches ?? 0} variant="pencil" />
          </div>
          <DonutChart
            title={t('admin.statusBreakdown')}
            data={statusItems}
            subtitle={t('admin.statusChartSub')}
          />
        </motion.div>

        {/* Hours played */}
        <motion.div
          whileHover={{ y: -2 }}
          className="paper-card p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="font-hand text-xl font-bold leading-tight text-ink-deep">{t('admin.timePlayed')}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('admin.timePlayedSub')}</p>
            </div>
            <StatCard title={t('admin.thisMonth')} value={stats?.hoursMonth ?? 0} subtitle={t('admin.hours')} variant="leaf" />
          </div>
          <div className="grid gap-3">
            <StatCard title={t('admin.today')} value={stats?.hoursToday ?? 0} subtitle={t('admin.hours')} variant="primary" />
            <StatCard title={t('admin.thisWeek')} value={stats?.hoursWeek ?? 0} subtitle={t('admin.hours')} variant="pencil" />
            <StatCard title={t('admin.thisMonth')} value={stats?.hoursMonth ?? 0} subtitle={t('admin.hours')} variant="leaf" />
          </div>
        </motion.div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-slate-500 dark:text-slate-400">
          {t('admin.loadingStats')}
        </div>
      )}
    </div>
  )
}

function isAdmin(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const stored = window.localStorage.getItem('pc.admin_secret')
    const expected = import.meta.env.VITE_ADMIN_SECRET
    return Boolean(stored && expected && stored === expected)
  } catch {
    return false
  }
}
