import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { ExternalLink, Inbox, RefreshCw, Search } from 'lucide-react'
import { getAllRooms, type AdminRoom } from '../../lib/adminApi'
import { relativeTime } from '../../lib/time'
import { notify } from '../../store/toast'
import { PageHeader } from '../../components/admin/PageHeader'
import { Panel } from '../../components/admin/Panel'
import { StatusBadge } from '../../components/admin/StatusBadge'
import { Skeleton } from '../../components/admin/Skeleton'

type RoomStatus = AdminRoom['status']
type StatusFilter = 'all' | RoomStatus

const FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'all', label: 'admin.all' },
  { key: 'live', label: 'admin.live' },
  { key: 'lobby', label: 'admin.lobby' },
  { key: 'finished', label: 'admin.finished' },
  { key: 'abandoned', label: 'admin.abandoned' },
]

export function AdminRooms() {
  const { t, i18n } = useTranslation()
  const [rooms, setRooms] = useState<AdminRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    getAllRooms()
      .then((data) => {
        if (!cancelled) setRooms(data)
      })
      .catch(() => {
        if (cancelled) return
        setRooms([])
        notify.error(t('admin.loadFailed'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const counts = useMemo(
    () => ({
      all: rooms.length,
      live: rooms.filter((room) => room.status === 'live').length,
      lobby: rooms.filter((room) => room.status === 'lobby').length,
      finished: rooms.filter((room) => room.status === 'finished').length,
      abandoned: rooms.filter((room) => room.status === 'abandoned').length,
    }),
    [rooms],
  )

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase()
    return rooms.filter((room) => {
      if (statusFilter !== 'all' && room.status !== statusFilter) return false
      if (!search) return true
      return (
        room.code.toLowerCase().includes(search) ||
        room.status.toLowerCase().includes(search) ||
        room.phase.toLowerCase().includes(search)
      )
    })
  }, [rooms, query, statusFilter])

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

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t('admin.workspace')}
        title={t('admin.rooms')}
        subtitle={t('admin.roomsSub')}
        actions={
          <button
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            disabled={loading}
            className="btn-ghost flex items-center gap-2 text-xs font-semibold disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : undefined} />
            {t('admin.refresh')}
          </button>
        }
      />

      <Panel
        title={t('admin.rooms')}
        subtitle={t('admin.roomCount', { count: filtered.length })}
        bodyClassName="p-0"
      >
        <div className="flex flex-col gap-3 border-b border-[var(--card-border)] px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-xs">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('admin.searchRooms')}
              className="input py-2 pl-9 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((filter) => {
              const active = statusFilter === filter.key
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setStatusFilter(filter.key)}
                  aria-pressed={active}
                  className={clsx(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-bold transition',
                    active
                      ? 'border-transparent bg-[#234e8b] text-[#fbf7ec] shadow-sm dark:bg-[#7fa6e0] dark:text-[#0d1b30]'
                      : 'border-[var(--card-border)] bg-[var(--card-bg)] text-slate-500 hover:border-[#234e8b]/25 hover:text-ink-deep dark:hover:border-[#7fa6e0]/25 dark:text-slate-400',
                  )}
                >
                  {t(filter.label)}
                  <span
                    className={clsx(
                      'rounded-full px-1.5 py-0.5 text-[9px] tabular-nums',
                      active ? 'bg-black/10' : 'bg-[var(--ink-ghost-2)]',
                    )}
                  >
                    {counts[filter.key]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left">
            <thead>
              <tr className="border-b border-[var(--card-border)] bg-[var(--ink-ghost-3)] text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                <th className="px-5 py-3">{t('admin.roomCode')}</th>
                <th className="px-3 py-3">{t('admin.status')}</th>
                <th className="px-3 py-3">{t('admin.phase')}</th>
                <th className="px-3 py-3">{t('admin.players')}</th>
                <th className="px-3 py-3">{t('admin.rules')}</th>
                <th className="px-3 py-3">{t('admin.lastActive')}</th>
                <th className="px-5 py-3 text-right">{t('admin.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10">
                    <div className="space-y-2">
                      {[0, 1, 2, 3, 4].map((item) => (
                        <Skeleton key={item} className="h-10 w-full" />
                      ))}
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14">
                    <div className="flex flex-col items-center justify-center gap-2 text-center">
                      <Inbox size={26} className="text-slate-300 dark:text-slate-600" />
                      <p className="text-sm font-semibold text-ink-deep">{t('admin.noRoomsMatch')}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setQuery('')
                          setStatusFilter('all')
                        }}
                        className="text-[11px] font-bold text-pencil transition hover:underline underline-offset-2"
                      >
                        {t('admin.clearFilters')}
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((room) => (
                  <tr key={room.id} className="transition hover:bg-[var(--ink-ghost-3)]">
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs font-bold text-ink-deep">{room.code}</span>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {new Date(room.createdAt).toLocaleDateString(i18n.language, {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={room.status} label={statusLabel(room.status)} />
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex rounded-md bg-[var(--ink-ghost-3)] px-2 py-1 text-[10px] font-semibold capitalize text-slate-500 dark:text-slate-400">
                        {room.phase.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-hand text-lg font-bold leading-none text-ink-deep tabular-nums">
                        {room.playerCount}
                      </span>
                      <span className="ml-1 text-[10px] text-slate-400">
                        {t('admin.playersShort')}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[11px] text-slate-500 dark:text-slate-400">
                      {room.overs} {t('admin.oversShort')} · {room.wickets}{' '}
                      {t('admin.wicketsShort')}
                    </td>
                    <td
                      className="px-3 py-3 text-[11px] text-slate-400"
                      title={new Date(room.lastActiveAt).toLocaleString(i18n.language)}
                    >
                      {relativeTime(room.lastActiveAt, i18n.language)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        to={`/room/${room.code}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--card-border)] px-2.5 py-1.5 text-[10px] font-bold text-slate-500 transition hover:border-[#c8544a]/30 hover:text-pencil dark:hover:border-[#e98a80]/30 dark:text-slate-400"
                      >
                        {t('admin.openRoom')}
                        <ExternalLink size={11} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
