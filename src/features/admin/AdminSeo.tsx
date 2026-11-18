import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Save, Image as ImageIcon, Edit3 } from 'lucide-react'
import { Dialog } from '../../components/ui/Dialog'
import { getSeoSettings, saveSeoSetting, type AdminSeoSetting } from '../../lib/adminApi'

export function AdminSeo() {
  const { t } = useTranslation()
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
    setLoading(true)
    getSeoSettings()
      .then((data) => setSettings(data))
      .catch(() => setSettings([]))
      .finally(() => setLoading(false))
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ pagePath: '', title: '', description: '', ogImage: '' })
    setOpen(true)
  }

  const openEdit = (item: typeof settings[number]) => {
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
        pagePath: form.pagePath,
        title: form.title || null,
        description: form.description || null,
        ogImage: form.ogImage || null,
      })
      setOpen(false)
      setEditing(null)
      const refreshed = await getSeoSettings()
      setSettings(refreshed)
    } catch {
      // handled by toast
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (pagePath: string) => {
    if (!window.confirm(t('admin.deleteSeoConfirm'))) return
    // SEO settings are upsert-only via RPC; clear by saving empty values
    await saveSeoSetting({ pagePath, title: '', description: '', ogImage: '' })
    setSettings(settings.filter((s) => s.pagePath !== pagePath))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 md:items-end">
        <div>
          <h2 className="font-hand text-3xl font-bold leading-tight text-ink-deep">
            {t('admin.seo')}
          </h2>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            {t('admin.seoSub')}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="btn-primary flex items-center gap-2 whitespace-nowrap"
        >
          <Edit3 size={16} />
          {t('admin.addSeo')}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--card-border)]">
              <th className="pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {t('admin.pagePath')}
              </th>
              <th className="pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {t('admin.title')}
              </th>
              <th className="pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {t('admin.description')}
              </th>
              <th className="pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {t('admin.ogImage')}
              </th>
              <th className="pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {t('admin.action')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--card-border)]">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500 dark:text-slate-400">
                  {t('admin.loadingSeo')}
                </td>
              </tr>
            ) : settings.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500 dark:text-slate-400">
                  {t('admin.noSeo')}
                </td>
              </tr>
            ) : (
              settings.map((item) => (
                <motion.tr
                  key={item.pagePath}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="hover:bg-white/30 dark:hover:bg-white/5 transition"
                >
                  <td className="py-3">
                    <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{item.pagePath}</span>
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-400 text-xs">
                    {item.title ?? t('admin.notSet')}
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-400 text-xs max-w-[200px] truncate">
                    {item.description ?? t('admin.notSet')}
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-400 text-xs max-w-[200px] truncate">
                    {item.ogImage ?? t('admin.notSet')}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-ink-deep dark:hover:text-ink-soft rounded"
                        aria-label={t('admin.edit')}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.pagePath)}
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-pencil rounded"
                        aria-label={t('admin.clear')}
                      >
                        <ImageIcon size={16} className="opacity-50" />
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
        title={editing ? t('admin.editSeo') : t('admin.addSeo')}
        size="md"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSave() }} className="space-y-4">
          <div>
            <label className="label">{t('admin.pagePath')}</label>
            <input
              type="text"
              value={form.pagePath}
              onChange={(e) => setForm({ ...form, pagePath: e.target.value })}
              className="input"
              placeholder="/"
              required
            />
            <p className="mt-1 text-[11px] text-slate-400">
              {t('admin.pagePathNote')}
            </p>
          </div>
          <div>
            <label className="label">{t('admin.title')}</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input"
              placeholder={t('admin.seoTitlePlaceholder')}
              maxLength={160}
            />
          </div>
          <div>
            <label className="label">{t('admin.description')}</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input min-h-[90px]"
              placeholder={t('admin.seoDescPlaceholder')}
              maxLength={300}
            />
          </div>
          <div>
            <label className="label">{t('admin.ogImage')}</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={form.ogImage}
                onChange={(e) => setForm({ ...form, ogImage: e.target.value })}
                className="input flex-1"
                placeholder={t('admin.seoImagePlaceholder')}
              />
              <ImageIcon size={16} className="text-slate-400 shrink-0" />
            </div>
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
