import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Plus, Trash2, Save, Edit3 } from 'lucide-react'
import { Dialog } from '../../components/ui/Dialog'
import { useAdminStore } from '../../store/admin'
import { getNotices, saveNotice, deleteNotice } from '../../lib/adminApi'

const TYPE_LABEL: Record<"info" | "success" | "warning" | "error", string> = {
  info: 'admin.info',
  success: 'admin.success',
  warning: 'admin.warning',
  error: 'admin.error',
}

export function AdminNotices() {
  const { t } = useTranslation()
  const { secret } = useAdminStore()
  const [notices, setNotices] = useState<Array<{
    id: string
    title: string
    body: string
    type: string
    isActive: boolean
    expiresAt: string | null
    createdAt: string
  }>>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<{ id: string } | null>(null)
  const [form, setForm] = useState({
    title: '',
    body: '',
    type: 'info' as const,
    isActive: true,
    expiresAt: '' as string,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!secret) return
    setLoading(true)
    getNotices(secret)
      .then((data) => setNotices(data))
      .catch(() => setNotices([]))
      .finally(() => setLoading(false))
  }, [secret])

  const openCreate = () => {
    setEditing(null)
    setForm({ title: '', body: '', type: 'info', isActive: true, expiresAt: '' })
    setOpen(true)
  }

  const openEdit = (notice: typeof notices[number]) => {
    setEditing({ id: notice.id })
    setForm({
      title: notice.title,
      body: notice.body,
      type: notice.type as 'info' | 'success' | 'warning' | 'error',
      isActive: notice.isActive,
      expiresAt: notice.expiresAt ?? '',
    })
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) return
    setSaving(true)
    try {
      const expiresAt = form.expiresAt ? form.expiresAt : null
      if (editing?.id) {
        await saveNotice(secret, { ...form, id: editing.id, expiresAt })
      } else {
        await saveNotice(secret, { ...form, expiresAt })
      }
      setOpen(false)
      setEditing(null)
      const refreshed = await getNotices(secret)
      setNotices(refreshed)
    } catch {
      // error surfaced by toast elsewhere
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('admin.deleteNoticeConfirm'))) return
    await deleteNotice(secret, id)
    setNotices(notices.filter((n) => n.id !== id))
  }

  if (!isAdmin()) return null

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 md:items-end">
        <div>
          <h2 className="font-hand text-3xl font-bold leading-tight text-ink-deep">
            {t('admin.notices')}
          </h2>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            {t('admin.noticesSub')}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="btn-primary flex items-center gap-2 whitespace-nowrap"
        >
          <Plus size={16} />
          {t('admin.addNotice')}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--card-border)]">
              <th className="pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {t('admin.title')}
              </th>
              <th className="pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {t('admin.body')}
              </th>
              <th className="pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {t('admin.type')}
              </th>
              <th className="pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {t('admin.active')}
              </th>
              <th className="pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {t('admin.expires')}
              </th>
              <th className="pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {t('admin.action')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--card-border)]">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400">
                  {t('admin.loadingNotices')}
                </td>
              </tr>
            ) : notices.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400">
                  {t('admin.noNotices')}
                </td>
              </tr>
            ) : (
              notices.map((notice) => (
                <motion.tr
                  key={notice.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="hover:bg-white/30 dark:hover:bg-white/5 transition"
                >
                  <td className="py-3">
                    <div className="font-semibold text-ink-deep dark:text-ink-deep">{notice.title}</div>
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-400 text-xs max-w-[200px] truncate">
                    {notice.body}
                  </td>
                  <td className="py-3 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                      notice.type === 'info' ? 'border-ink-ghost bg-ink-ghost text-ink-deep' :
                      notice.type === 'success' ? 'border-leaf/30 bg-leaf/10 text-leaf' :
                      notice.type === 'warning' ? 'border-amber-300/70 bg-amber-50/90 text-amber-800' :
                      'border-pencil/30 bg-pencil/10 text-pencil'
                    }">
                      {t(TYPE_LABEL[notice.type] || 'admin.info')}
                    </span>
                  </td>
                  <td className="py-3 text-xs">
                    <span className={`font-semibold ${notice.isActive ? 'text-leaf dark:text-leaf' : 'text-slate-500 dark:text-slate-400'}`}>
                      {notice.isActive ? t('admin.yes') : t('admin.no')}
                    </span>
                  </td>
                  <td className="py-3 text-slate-500 dark:text-slate-400 text-xs">
                    {notice.expiresAt ? new Date(notice.expiresAt).toLocaleDateString() : t('admin.never')}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(notice)}
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-ink-deep dark:hover:text-ink-soft rounded"
                        aria-label={t('admin.edit')}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(notice.id)}
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-pencil rounded"
                        aria-label={t('admin.delete')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? t('admin.editNotice') : t('admin.addNotice')}
        size="md"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSave() }} className="space-y-4">
          <div>
            <label className="label">{t('admin.title')}</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
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
              onChange={(e) => setForm({ ...form, body: e.target.value })}
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
              onChange={(e) => setForm({ ...form, type: e.target.value as any })}
              className="input"
            >
              <option value="info">{t('admin.info')}</option>
              <option value="success">{t('admin.success')}</option>
              <option value="warning">{t('admin.warning')}</option>
              <option value="error">{t('admin.error')}</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="rounded border-[var(--field-border)] bg-[var(--field-bg)] text-[var(--field-text)] focus:ring-2 focus:ring-[var(--ink-ghost)]"
            />
            <label className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
              {t('admin.isActive')}
            </label>
          </div>
          <div>
            <label className="label">{t('admin.expiresAt')}</label>
            <input
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              className="input"
            />
            <p className="mt-1 text-[11px] text-slate-400">{t('admin.expiresNote')}</p>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-ghost text-xs"
            >
              {t('admin.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary text-xs"
            >
              <Save size={16} />
              {saving ? t('admin.saving') : t('admin.save')}
            </button>
          </div>
        </form>
      </Dialog>
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
