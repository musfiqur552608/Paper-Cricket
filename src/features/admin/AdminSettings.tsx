import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ShieldAlert, Key, Database, Monitor } from 'lucide-react'
import { useAdminStore } from '../../store/admin'

export function AdminSettings() {
  const { t } = useTranslation()
  const { secret } = useAdminStore()
  const configured = Boolean(import.meta.env.VITE_ADMIN_SECRET)

  if (!isAdmin()) return null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-hand text-3xl font-bold leading-tight text-ink-deep">
          {t('admin.settings')}
        </h2>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          {t('admin.settingsSub')}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: t('admin.adminAccess'),
            body: t('admin.adminAccessBody'),
            icon: ShieldAlert,
            status: configured ? t('admin.configured') : t('admin.notConfigured'),
            statusOk: configured,
          },
          {
            title: t('admin.dataSource'),
            body: t('admin.dataSourceBody'),
            icon: Database,
            status: t('admin.supabase'),
            statusOk: true,
          },
          {
            title: t('admin.sessions'),
            body: t('admin.sessionsBody'),
            icon: Monitor,
            status: t('admin.localStorage'),
            statusOk: true,
          },
        ].map((card) => (
          <motion.div
            key={card.title}
            whileHover={{ y: -2 }}
            className="paper-card p-5 sm:p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <card.icon size={20} className="text-ink-deep dark:text-ink-soft" />
              <span className="font-semibold text-ink-deep dark:text-ink-deep">{card.title}</span>
            </div>
            <p className="mb-4 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              {card.body}
            </p>
            <div className={clsx$1(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
              card.statusOk
                ? 'border-leaf/30 bg-leaf/10 text-leaf dark:text-leaf'
                : 'border-pencil/30 bg-pencil/10 text-pencil dark:text-pencil',
            )}>
              {card.status}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="paper-card p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <Key size={20} className="text-pencil" />
          <h3 className="font-semibold text-ink-deep dark:text-ink-deep">{t('admin.rotateSecret')}</h3>
        </div>
        <p className="mb-4 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
          {t('admin.rotateSecretBody')}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <span className="flex-1 font-mono text-xs text-slate-500 dark:text-slate-400 bg-white/30 dark:bg-white/10 rounded-lg px-3 py-2 border border-[var(--card-border)]">
            {import.meta.env.VITE_ADMIN_SECRET ? '•••••••• (set)' : '(not set)'}
          </span>
          <p className="text-[11px] text-slate-400">
            {t('admin.rotateSecretNote')}
          </p>
        </div>
      </div>
    </div>
  )
}

function clsx$1(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
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
