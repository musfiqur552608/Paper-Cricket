import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Search, Clock, Link as LinkIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAdminStore } from '../../store/admin'
import { getAllRooms } from '../../lib/adminApi'

const STATUS_COLOR: Record<string, string> = {
  lobby: '#234e8b',
  live: '#1f5c3d',
  finished: '#6b7280',
  abandoned: '#dc2626',
}

export function AdminRooms() {
  const { t } = useTranslation()
  const { secret } = useAdminStore()
  const [rooms, setRooms] = useState<Array<{
    id: string
    code: string
    status: string
    phase: string
    overs: number
    wickets: number
    playerCount: number
    lastActiveAt: string
    createdAt: string
    startedAt: string | null
    finishedAt: string | null
  }>>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!secret) return
    setLoading(true)
    getAllRooms(secret)
      .then((data) => setRooms(data))
      .catch(() => setRooms([]))
      .finally(() => setLoading(false))
  }, [secret, refreshKey])

  const handleRefresh = () => setRefreshKey((k) => k + 1)

  const filtered = rooms.filter(
    (r) =>
      r.code.toLowerCase().includes(query.toLowerCase()) ||
      r.status.toLowerCase().includes(query.toLowerCase()),
  )

  const statusLabel = (status: string) => {
    switch (status) {
      case 'live': return t('admin.live')
      case 'lobby': return t('admin.lobby')
      case 'finished': return t('admin.finished')
      case 'abandoned': return t('admin.abandoned')
      default: return status
    }
  }

  if (!isAdmin()) return null

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 md:items-end">
        <div>
          <h2 className="font-hand text-3xl font-bold leading-tight text-ink-deep">
            {t('admin.rooms')}
          </h2>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            {t('admin.roomsSub')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="btn-ghost flex items-center gap-2 text-[13px] font-semibold"
          >
            <Clock size={16} />
            {t('admin.refresh')}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 min-w-[0]">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('admin.searchRooms')}
              className="input pl-9"
            />
          </div>
        </div>
        <Link
          to="/"
          className="btn-paper whitespace-nowrap"
        >
          <LinkIcon size={16} />
          {t('admin.viewSite')}
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--card-border)]">
              <th className="pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {t('admin.roomCode')}
              </th>
              <th className="pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {t('admin.status')}
              </th>
              <th className="pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {t('admin.phase')}
              </th>
              <th className="pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {t('admin.players')}
              </th>
              <th className="pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {t('admin.rules')}
              </th>
              <th className="pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {t('admin.lastActive')}
              </th>
              <th className="pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {t('admin.action')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--card-border)]">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-slate-400">
                  {t('admin.loadingRooms')}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-slate-400">
                  {t('admin.noRooms')}
                </td>
              </tr>
            ) : (
              filtered.map((room) => (
                <motion.tr
                  key={room.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: rooms.indexOf(room) * 0.03 }}
                  className="hover:bg-white/30 dark:hover:bg-white/5 transition"
                >
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-ink-deep dark:text-ink-deep">
                        {room.code}
                      </span>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      STATUS_COLOR[room.status]
                        ? `border-[${STATUS_COLOR[room.status]}]/40 bg-[${STATUS_COLOR[room.status]}]/10 text-[${STATUS_COLOR[room.status]}]`
                        : 'border-slate-400/30 bg-slate-500/10 text-slate-600 dark:text-slate-400'
                    }`}>
                      {statusLabel(room.status)}
                    </span>
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-400 text-xs">
                    {room.phase}
                  </td>
                  <td className="py-3 text-xs">
                    <span className="font-semibold text-ink-deep dark:text-ink-deep">{room.playerCount}</span>{' '}
                    {t('admin.playersShort')}
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-400 text-xs">
                    {room.overs} {t('admin.oversShort')} · {room.wickets} {t('admin.wicketsShort')}
                  </td>
                  <td className="py-3 text-slate-500 dark:text-slate-400 text-xs">
                    {new Date(room.lastActiveAt).toLocaleString()}
                  </td>
                  <td className="py-3">
                    <Link
                      to={`/room/${room.code}`}
                      className="text-xs font-semibold text-pencil hover:underline underline-offset-2"
                    >
                      {t('admin.openRoom')}
                    </Link>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        {t('admin.roomCount', { count: rooms.length })}
      </p>
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
