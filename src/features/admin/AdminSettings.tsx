import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import {
  Database,
  Info,
  KeyRound,
  LogOut,
  MailCheck,
  Monitor,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { IS_SUPABASE_CONFIGURED } from '../../config/gameConfig'
import { useAdminStore } from '../../store/admin'
import { PageHeader } from '../../components/admin/PageHeader'
import { Panel } from '../../components/admin/Panel'

const STATUS_OK =
  'border-[#1f5c3d]/25 bg-[#1f5c3d]/10 text-[#1f5c3d] dark:border-[#93c5a8]/30 dark:bg-[#93c5a8]/10 dark:text-[#93c5a8]'
const STATUS_BAD =
  'border-[#c8544a]/25 bg-[#c8544a]/10 text-[#c8544a] dark:border-[#e98a80]/30 dark:bg-[#e98a80]/10 dark:text-[#e98a80]'

const TONES = {
  ink: {
    wrap: 'bg-[#234e8b]/10 dark:bg-[#7fa6e0]/15',
    icon: 'text-[#234e8b] dark:text-[#a9c6f0]',
  },
  leaf: {
    wrap: 'bg-[#1f5c3d]/10 dark:bg-[#93c5a8]/15',
    icon: 'text-[#1f5c3d] dark:text-[#93c5a8]',
  },
  amber: {
    wrap: 'bg-[#e9a23b]/20 dark:bg-[#e9a23b]/20',
    icon: 'text-[#a16207] dark:text-[#fcd34d]',
  },
} as const

export function AdminSettings() {
  const { t } = useTranslation()
  const { email, logout } = useAdminStore()
  const configured = IS_SUPABASE_CONFIGURED

  const systemCards = [
    {
      title: t('admin.adminAccess'),
      body: t('admin.adminAccessBody'),
      icon: ShieldAlert,
      status: configured ? t('admin.configured') : t('admin.notConfigured'),
      ok: configured,
      tone: 'ink' as const,
    },
    {
      title: t('admin.dataSource'),
      body: t('admin.dataSourceBody'),
      icon: Database,
      status: configured ? t('admin.supabase') : t('admin.notConfigured'),
      ok: configured,
      tone: 'leaf' as const,
    },
    {
      title: t('admin.authProvider'),
      body: t('admin.authProviderBody'),
      icon: Monitor,
      status: configured ? t('admin.sessionProvider') : t('admin.notConfigured'),
      ok: configured,
      tone: 'amber' as const,
    },
  ]

  const checks = [
    {
      title: t('admin.serverVerified'),
      body: t('admin.authNote'),
      icon: ShieldCheck,
      ok: configured,
    },
    {
      title: t('admin.isolatedSession'),
      body: t('admin.isolatedSessionBody'),
      icon: KeyRound,
      ok: configured,
    },
    {
      title: t('admin.emailAllowlist'),
      body: t('admin.signedInAsNote'),
      icon: MailCheck,
      ok: Boolean(email),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t('admin.workspace')}
        title={t('admin.settings')}
        subtitle={t('admin.settingsSub')}
      />

      <div className="paper-card overflow-hidden">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#c8544a]/10 font-hand text-3xl font-bold text-[#c8544a] dark:bg-[#e98a80]/15 dark:text-[#e98a80]">
              {(email ?? 'A').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                {t('admin.administrator')}
              </p>
              <p className="truncate text-sm font-semibold text-ink-deep" title={email ?? undefined}>
                {email ?? t('admin.notSet')}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--card-border)] bg-[var(--ink-ghost-3)] px-2 py-0.5 text-[9px] font-bold text-slate-500 dark:text-slate-400">
                  <ShieldCheck size={10} />
                  {t('admin.supabase')}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--card-border)] bg-[var(--ink-ghost-3)] px-2 py-0.5 text-[9px] font-bold text-slate-500 dark:text-slate-400">
                  <MailCheck size={10} />
                  {t('admin.emailAllowlist')}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { void logout() }}
            className="btn-ghost flex w-fit items-center gap-2 text-xs font-semibold text-pencil hover:bg-[#c8544a]/10 hover:text-pencil dark:hover:bg-[#e98a80]/10 dark:hover:text-[#e98a80]"
          >
            <LogOut size={14} />
            {t('admin.logout')}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {systemCards.map((card) => (
          <div key={card.title} className="paper-card p-4">
            <div className="flex items-start justify-between gap-2">
              <span
                className={clsx(
                  'grid h-9 w-9 place-items-center rounded-xl',
                  TONES[card.tone].wrap,
                )}
              >
                <card.icon size={17} className={TONES[card.tone].icon} />
              </span>
              <span
                className={clsx(
                  'rounded-full border px-2 py-1 text-[9px] font-bold',
                  card.ok ? STATUS_OK : STATUS_BAD,
                )}
              >
                {card.status}
              </span>
            </div>
            <p className="mt-3 text-xs font-bold text-ink-deep">{card.title}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              {card.body}
            </p>
          </div>
        ))}
      </div>

      <Panel title={t('admin.securityChecks')}>
        <ul className="grid gap-3 sm:grid-cols-3">
          {checks.map((check) => (
            <li
              key={check.title}
              className="rounded-xl border border-[var(--card-border)] bg-[var(--ink-ghost-3)] p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={clsx(
                    'grid h-8 w-8 place-items-center rounded-lg',
                    check.ok
                      ? 'bg-[#1f5c3d]/10 text-[#1f5c3d] dark:bg-[#93c5a8]/15 dark:text-[#93c5a8]'
                      : 'bg-[#c8544a]/10 text-[#c8544a] dark:bg-[#e98a80]/15 dark:text-[#e98a80]',
                  )}
                >
                  <check.icon size={15} />
                </span>
                <span
                  className={clsx(
                    'rounded-full border px-2 py-0.5 text-[9px] font-bold',
                    check.ok ? STATUS_OK : STATUS_BAD,
                  )}
                >
                  {check.ok ? t('admin.configured') : t('admin.notConfigured')}
                </span>
              </div>
              <p className="mt-3 text-xs font-bold text-ink-deep">{check.title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                {check.body}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex items-start gap-2 text-[10px] leading-relaxed text-slate-400">
          <Info size={13} className="mt-0.5 shrink-0" />
          {t('admin.logoutNote')}
        </p>
      </Panel>
    </div>
  )
}
