import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import {
  Archive,
  CalendarClock,
  Inbox,
  Megaphone,
  Pencil,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'
import { Dialog } from '../../components/ui/Dialog'
import { PageHeader } from '../../components/admin/PageHeader'
import { Panel } from '../../components/admin/Panel'
import { StatCard } from '../../components/admin/StatCard'
import { Skeleton } from '../../components/admin/Skeleton'
import { relativeTime } from '../../lib/time'
import { notify } from '../../store/toast'
import { getNotices, saveNotice, deleteNotice, type AdminNotice } from '../../lib/adminApi'

type NoticeType = AdminNotice['type']

const TYPE_LABEL: Record<NoticeType, string> = {
  info: 'admin.info',
  success: 'admin.success',
  warning: 'admin.warning',
  error: 'admin.error',
}

const TYPE_STYLES: Record<NoticeType, string> = {
  info: 'border-[#234e8b]/25 bg-[#234e8b]/10 text-[#234e8b] dark:border-[#7fa6e0]/30 dark:bg-[#7fa6e0]/10 dark:text-[#a9c6f0]',
  success:
    'border-[#1f5c3d]/25 bg-[#1f5c3d]/10 text-[#1f5c3d] dark:border-[#93c5a8]/30 dark:bg-[#93c5a8]/10 dark:text-[#93c5a8]',
  warning:
    'border-[#d97706]/25 bg-[#d97706]/10 text-[#a16207] dark:border-[#fcd34d]/30 dark:bg-[#fcd34d]/10 dark:text-[#fcd34d]',
  error:
    'border-[#c8544a]/25 bg-[#c8544a]/10 text-[#c8544a] dark:border-[#e98a80]/30 dark:bg-[#e98a80]/10 dark:text-[#e98a80]',
}

const STATUS_STYLES = {
  active:
    'border-[#1f5c3d]/25 bg-[#1f5c3d]/10 text-[#1f5c3d] dark:border-[#93c5a8]/30 dark:bg-[#93c5a8]/10 dark:text-[#93c5a8]',
  inactive:
    'border-slate-400/30 bg-slate-500/10 text-slate-500 dark:border-slate-400/30 dark:bg-slate-400/10 dark:text-slate-300',
  expired:
    'border-[#c8544a]/25 bg-[#c8544a]/10 text-[#c8544a] dark:border-[#e98a80]/30 dark:bg-[#e98a80]/10 dark:text-[#e98a80]',
} as const

/** Convert an ISO timestamp into the local value a datetime-local input expects. */
function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function AdminNotices() {
  const { t, i18n } = useTranslation()
  const [notices, setNotices] = useState<AdminNotice[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<{ id: string } | null>(null)
  const [form, setForm] = useState<{
    title: string
    body: string
    type: NoticeType
    isActive: boolean
    expiresAt: string
  }>({
    title: '',
    body: '',
    type: 'info',
    isActive: true,
    expiresAt: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    getNotices()
      .then((data) => {
        if (!cancelled) setNotices(data)
      })
      .catch(() => {
        if (cancelled) return
        setNotices([])
        notify.error(t('admin.loadFailed'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const counts = useMemo(() => {
    const now = Date.now()
    let active = 0
    let expiring = 0
    let expired = 0
    for (const notice of notices) {
      const expiry = notice.expiresAt ? new Date(notice.expiresAt).getTime() : null
      const isExpired = expiry != null && expiry <= now
      if (isExpired) {
        expired += 1
        continue
      }
      if (notice.isActive) {
        active += 1
        if (expiry != null && expiry - now < 7 * 86_400_000) expiring += 1
      }
    }
    return { active, expiring, expired }
  }, [notices])

  const openCreate = () => {
    setEditing(null)
    setForm({ title: '', body: '', type: 'info', isActive: true, expiresAt: '' })
    setOpen(true)
  }

  const openEdit = (notice: AdminNotice) => {
    setEditing({ id: notice.id })
    setForm({
      title: notice.title,
      body: notice.body,
      type: notice.type,
      isActive: notice.isActive,
      expiresAt: toLocalInput(notice.expiresAt),
    })
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) return
    setSaving(true)
    try {
      const expiresDate = form.expiresAt ? new Date(form.expiresAt) : null
      const expiresAt =
        expiresDate && !Number.isNaN(expiresDate.getTime()) ? expiresDate.toISOString() : null
      if (editing?.id) {
        await saveNotice({ ...form, id: editing.id, expiresAt })
      } else {
        await saveNotice({ ...form, expiresAt })
      }
      setOpen(false)
      setEditing(null)
      setNotices(await getNotices())
      notify.success(t('admin.noticeSaved'))
    } catch {
      notify.error(t('admin.actionFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('admin.deleteNoticeConfirm'))) return
    try {
      await deleteNotice(id)
      setNotices((current) => current.filter((notice) => notice.id !== id))
      notify.success(t('admin.noticeDeleted'))
    } catch {
      notify.error(t('admin.actionFailed'))
    }
  }

  const noticeStatus = (notice: AdminNotice): keyof typeof STATUS_STYLES => {
    if (notice.expiresAt && new Date(notice.expiresAt).getTime() <= Date.now()) return 'expired'
    return notice.isActive ? 'active' : 'inactive'
  }

  const statusLabel = (status: keyof typeof STATUS_STYLES) => {
    if (status === 'active') return t('admin.active')
    if (status === 'expired') return t('admin.expired')
    return t('admin.inactive')
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t('admin.workspace')}
        title={t('admin.notices')}
        subtitle={t('admin.noticesSub')}
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="btn-primary flex items-center gap-2 whitespace-nowrap text-xs"
          >
            <Plus size={15} />
            {t('admin.addNotice')}
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title={t('admin.activeNotices')}
          value={counts.active}
          hint={t('admin.noticeCount', { count: notices.length })}
          icon={Megaphone}
          tone="leaf"
          loading={loading}
        />
        <StatCard
          title={t('admin.expiringSoon')}
          value={counts.expiring}
          hint={t('admin.expiringSoonHint')}
          icon={CalendarClock}
          tone="amber"
          loading={loading}
        />
        <StatCard
          title={t('admin.expiredNotices')}
          value={counts.expired}
          icon={Archive}
          tone="pencil"
          loading={loading}
        />
      </div>

      <Panel
        title={t('admin.notices')}
        subtitle={t('admin.noticeCount', { count: notices.length })}
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-[var(--card-border)] bg-[var(--ink-ghost-3)] text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                <th className="px-5 py-3">{t('admin.title')}</th>
                <th className="px-3 py-3">{t('admin.type')}</th>
                <th className="px-3 py-3">{t('admin.status')}</th>
                <th className="px-3 py-3">{t('admin.expires')}</th>
                <th className="px-5 py-3 text-right">{t('admin.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10">
                    <div className="space-y-2">
                      {[0, 1, 2, 3].map((item) => (
                        <Skeleton key={item} className="h-12 w-full" />
                      ))}
                    </div>
                  </td>
                </tr>
              ) : notices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-14">
                    <div className="flex flex-col items-center justify-center gap-2 text-center">
                      <Inbox size={26} className="text-slate-300 dark:text-slate-600" />
                      <p className="text-sm font-semibold text-ink-deep">{t('admin.noNotices')}</p>
                      <button
                        type="button"
                        onClick={openCreate}
                        className="text-[11px] font-bold text-pencil transition hover:underline underline-offset-2"
                      >
                        {t('admin.addNotice')}
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                notices.map((notice) => {
                  const status = noticeStatus(notice)
                  return (
                    <tr key={notice.id} className="transition hover:bg-[var(--ink-ghost-3)]">
                      <td className="max-w-[320px] px-5 py-3">
                        <p className="truncate text-xs font-bold text-ink-deep">{notice.title}</p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {notice.body}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={clsx(
                            'inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold',
                            TYPE_STYLES[notice.type],
                          )}
                        >
                          {t(TYPE_LABEL[notice.type])}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={clsx(
                            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold',
                            STATUS_STYLES[status],
                          )}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {statusLabel(status)}
                        </span>
                      </td>
                      <td
                        className="px-3 py-3 text-[11px] text-slate-500 dark:text-slate-400"
                        title={
                          notice.expiresAt
                            ? new Date(notice.expiresAt).toLocaleString(i18n.language)
                            : undefined
                        }
                      >
                        {notice.expiresAt
                          ? relativeTime(notice.expiresAt, i18n.language)
                          : t('admin.never')}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(notice)}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-[var(--ink-ghost-2)] hover:text-ink-deep"
                            aria-label={t('admin.edit')}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(notice.id)}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-[#c8544a]/10 hover:text-[#c8544a] dark:hover:bg-[#e98a80]/10 dark:hover:text-[#e98a80]"
                            aria-label={t('admin.delete')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? t('admin.editNotice') : t('admin.addNotice')}
        size="md"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void handleSave()
          }}
          className="space-y-4"
        >
          <div>
            <label className="label">{t('admin.noticeTitle')}</label>
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className="input"
              placeholder={t('admin.noticeTitlePlaceholder')}
              maxLength={120}
              required
            />
          </div>
          <div>
            <label className="label">{t('admin.body')}</label>
            <textarea
              value={form.body}
              onChange={(event) => setForm({ ...form, body: event.target.value })}
              className="input min-h-[90px]"
              placeholder={t('admin.noticeBodyPlaceholder')}
              maxLength={600}
              required
            />
          </div>
          <div>
            <label className="label">{t('admin.type')}</label>
            <select
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value as NoticeType })}
              className="input"
            >
              <option value="info">{t('admin.info')}</option>
              <option value="success">{t('admin.success')}</option>
              <option value="warning">{t('admin.warning')}</option>
              <option value="error">{t('admin.error')}</option>
            </select>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--ink-ghost-3)] px-3 py-2.5">
            <input
              id="notice-active"
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
              className="rounded border-[var(--field-border)] bg-[var(--field-bg)] text-[var(--field-text)] focus:ring-2 focus:ring-[var(--ink-ghost)]"
            />
            <label htmlFor="notice-active" className="cursor-pointer text-sm text-slate-600 dark:text-slate-400">
              {t('admin.isActive')}
            </label>
          </div>
          <div>
            <label className="label">{t('admin.expiresAt')}</label>
            <input
              type="datetime-local"
              value={form.expiresAt}
              onChange={(event) => setForm({ ...form, expiresAt: event.target.value })}
              className="input"
            />
            <p className="mt-1 text-[11px] text-slate-400">{t('admin.expiresNote')}</p>
          </div>
          <div className="flex justify-end gap-2 border-t border-[var(--card-border)] pt-4">
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-xs">
              {t('admin.cancel')}
            </button>
            <button type="submit" disabled={saving} className="btn-primary text-xs">
              <Save size={15} />
              {saving ? t('admin.saving') : t('admin.save')}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
