import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { Globe2, Image as ImageIcon, Inbox, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { Dialog } from '../../components/ui/Dialog'
import { PageHeader } from '../../components/admin/PageHeader'
import { Panel } from '../../components/admin/Panel'
import { Skeleton } from '../../components/admin/Skeleton'
import { relativeTime } from '../../lib/time'
import { notify } from '../../store/toast'
import {
  deleteSeoSetting,
  getSeoSettings,
  saveSeoSetting,
  type AdminSeoSetting,
} from '../../lib/adminApi'

export function AdminSeo() {
  const { t, i18n } = useTranslation()
  const [settings, setSettings] = useState<AdminSeoSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState({
    pagePath: '',
    title: '',
    description: '',
    ogImage: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    getSeoSettings()
      .then((data) => {
        if (!cancelled) setSettings(data)
      })
      .catch(() => {
        if (cancelled) return
        setSettings([])
        notify.error(t('admin.loadFailed'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ pagePath: '', title: '', description: '', ogImage: '' })
    setOpen(true)
  }

  const openEdit = (item: AdminSeoSetting) => {
    setEditing(item.pagePath)
    setForm({
      pagePath: item.pagePath,
      title: item.title ?? '',
      description: item.description ?? '',
      ogImage: item.ogImage ?? '',
    })
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.pagePath.trim()) return
    setSaving(true)
    try {
      await saveSeoSetting({
        pagePath: form.pagePath.trim(),
        title: form.title || null,
        description: form.description || null,
        ogImage: form.ogImage || null,
      })
      setOpen(false)
      setEditing(null)
      setSettings(await getSeoSettings())
      notify.success(t('admin.seoSaved'))
    } catch {
      notify.error(t('admin.actionFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (pagePath: string) => {
    if (!window.confirm(t('admin.deleteSeoConfirm'))) return
    try {
      await deleteSeoSetting(pagePath)
      setSettings((current) => current.filter((item) => item.pagePath !== pagePath))
      notify.success(t('admin.seoDeleted'))
    } catch {
      notify.error(t('admin.actionFailed'))
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t('admin.workspace')}
        title={t('admin.seo')}
        subtitle={t('admin.seoSub')}
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="btn-primary flex items-center gap-2 whitespace-nowrap text-xs"
          >
            <Plus size={15} />
            {t('admin.addSeo')}
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--ink-ghost-3)] px-4 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#234e8b]/10 text-[#234e8b] dark:bg-[#7fa6e0]/15 dark:text-[#a9c6f0]">
          <Globe2 size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-ink-deep">{t('admin.seoPages')}</p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            {t('admin.seoPagesSub')}
          </p>
        </div>
        <span className="rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-1 text-[10px] font-bold text-slate-500 tabular-nums">
          {settings.length}
        </span>
      </div>

      <Panel
        title={t('admin.seoPages')}
        subtitle={t('admin.seoSub')}
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left">
            <thead>
              <tr className="border-b border-[var(--card-border)] bg-[var(--ink-ghost-3)] text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                <th className="px-5 py-3">{t('admin.pagePath')}</th>
                <th className="px-3 py-3">{t('admin.title')}</th>
                <th className="px-3 py-3">{t('admin.description')}</th>
                <th className="px-3 py-3">{t('admin.ogImage')}</th>
                <th className="px-3 py-3">{t('admin.updated')}</th>
                <th className="px-5 py-3 text-right">{t('admin.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10">
                    <div className="space-y-2">
                      {[0, 1, 2, 3].map((item) => (
                        <Skeleton key={item} className="h-12 w-full" />
                      ))}
                    </div>
                  </td>
                </tr>
              ) : settings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14">
                    <div className="flex flex-col items-center justify-center gap-2 text-center">
                      <Inbox size={26} className="text-slate-300 dark:text-slate-600" />
                      <p className="text-sm font-semibold text-ink-deep">{t('admin.noSeo')}</p>
                      <button
                        type="button"
                        onClick={openCreate}
                        className="text-[11px] font-bold text-pencil transition hover:underline underline-offset-2"
                      >
                        {t('admin.addSeo')}
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                settings.map((item) => (
                  <tr key={item.pagePath} className="transition hover:bg-[var(--ink-ghost-3)]">
                    <td className="px-5 py-3">
                      <span className="inline-flex rounded-md bg-[var(--ink-ghost-3)] px-2 py-1 font-mono text-[11px] font-semibold text-ink-deep">
                        {item.pagePath}
                      </span>
                    </td>
                    <td className="max-w-[240px] px-3 py-3">
                      {item.title ? (
                        <p className="truncate text-xs font-semibold text-ink-deep">{item.title}</p>
                      ) : (
                        <span className="text-[11px] text-slate-400">{t('admin.notSet')}</span>
                      )}
                    </td>
                    <td className="max-w-[260px] px-3 py-3">
                      {item.description ? (
                        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {item.description}
                        </p>
                      ) : (
                        <span className="text-[11px] text-slate-400">{t('admin.notSet')}</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {item.ogImage ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#1f5c3d]/25 bg-[#1f5c3d]/10 px-2 py-1 text-[10px] font-bold text-[#1f5c3d] dark:border-[#93c5a8]/30 dark:bg-[#93c5a8]/10 dark:text-[#93c5a8]">
                          <ImageIcon size={10} />
                          {t('admin.configured')}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">{t('admin.notSet')}</span>
                      )}
                    </td>
                    <td
                      className="px-3 py-3 text-[11px] text-slate-400"
                      title={new Date(item.updatedAt).toLocaleString(i18n.language)}
                    >
                      {relativeTime(item.updatedAt, i18n.language)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-[var(--ink-ghost-2)] hover:text-ink-deep"
                          aria-label={t('admin.edit')}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(item.pagePath)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-[#c8544a]/10 hover:text-[#c8544a] dark:hover:bg-[#e98a80]/10 dark:hover:text-[#e98a80]"
                          aria-label={t('admin.delete')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? t('admin.editSeo') : t('admin.addSeo')}
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
            <label className="label">{t('admin.pagePath')}</label>
            <input
              type="text"
              value={form.pagePath}
              onChange={(event) => setForm({ ...form, pagePath: event.target.value })}
              className={clsx('input', editing && 'opacity-60')}
              placeholder="/"
              required
              disabled={Boolean(editing)}
            />
            <p className="mt-1 text-[11px] text-slate-400">{t('admin.pagePathNote')}</p>
          </div>
          <div>
            <label className="label">{t('admin.title')}</label>
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className="input"
              placeholder={t('admin.seoTitlePlaceholder')}
              maxLength={160}
            />
            <p className="mt-1 text-right text-[10px] tabular-nums text-slate-400">
              {form.title.length}/160
            </p>
          </div>
          <div>
            <label className="label">{t('admin.description')}</label>
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className="input min-h-[90px]"
              placeholder={t('admin.seoDescPlaceholder')}
              maxLength={300}
            />
            <p className="mt-1 text-right text-[10px] tabular-nums text-slate-400">
              {form.description.length}/300
            </p>
          </div>
          <div>
            <label className="label">{t('admin.ogImage')}</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={form.ogImage}
                onChange={(event) => setForm({ ...form, ogImage: event.target.value })}
                className="input flex-1"
                placeholder={t('admin.seoImagePlaceholder')}
              />
              <ImageIcon size={16} className="shrink-0 text-slate-400" />
            </div>
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
