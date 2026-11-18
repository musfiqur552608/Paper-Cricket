import { useEffect, useState } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard,
  ShieldAlert,
  FileText,
  Settings,
  LogOut,
  Menu,
  Users as UsersIcon,
  ExternalLink,
  X,
  Sparkles,
} from 'lucide-react'
import { useAdminStore } from '../../store/admin'
import { ColorModeToggle, LanguageToggle } from '../../components/ui/Toggles'

const NAV = [
  { path: '/admin', label: 'admin.dashboard', icon: LayoutDashboard },
  { path: '/admin/rooms', label: 'admin.rooms', icon: UsersIcon },
  { path: '/admin/notices', label: 'admin.notices', icon: ShieldAlert },
  { path: '/admin/seo', label: 'admin.seo', icon: FileText },
  { path: '/admin/settings', label: 'admin.settings', icon: Settings },
]

export function AdminLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const { isAdmin, email, checking, logout } = useAdminStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isLoginRoute = location.pathname === '/admin/login'
  const current = NAV.find((item) => item.path === location.pathname) ?? NAV[0]!

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!sidebarOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [sidebarOpen])

  if (checking) {
    return (
      <div className="grid min-h-dvh place-items-center px-5">
        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            className="grid h-8 w-8 place-items-center rounded-full border border-[var(--card-border)] text-pencil"
          >
            <Sparkles size={15} />
          </motion.span>
          {t('common.loading')}
        </div>
      </div>
    )
  }

  // The login page renders standalone; signed-in admins go to the dashboard.
  if (isLoginRoute) {
    return isAdmin ? <Navigate to="/admin" replace /> : <Outlet />
  }

  // Everything else needs a verified admin session.
  if (!isAdmin) return <Navigate to="/admin/login" replace />

  const sideContent = (
    <>
      <div className="flex h-20 shrink-0 items-center gap-3 border-b border-[var(--card-border)] px-5">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#234e8b] text-[#fbf7ec] shadow-sm dark:bg-[#93c5fd] dark:text-[#10233f]">
          <ShieldAlert size={20} />
        </div>
        <div className="min-w-0">
          <p className="truncate font-hand text-xl font-bold leading-none text-ink-deep">Paper Cricket</p>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
            {t('admin.controlRoom')}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 pt-5">
        <p className="px-3 pb-2 text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
          {t('admin.workspace')}
        </p>
        <nav className="space-y-1">
          {NAV.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive ? 'page' : undefined}
                className={clsx(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all',
                  isActive
                    ? 'bg-[#234e8b] text-[#fbf7ec] shadow-[0_8px_18px_-10px_rgba(35,78,139,0.75)] dark:bg-[#7fa6e0] dark:text-[#0d1b30]'
                    : 'text-slate-600 hover:bg-[var(--ink-ghost-2)] hover:text-ink-deep dark:text-slate-400 dark:hover:text-ink-deep',
                )}
              >
                <span
                  className={clsx(
                    'grid h-7 w-7 place-items-center rounded-lg transition',
                    isActive
                      ? 'bg-white/15 text-[#fbf7ec] dark:bg-black/10 dark:text-[#0d1b30]'
                      : 'bg-[var(--ink-ghost-3)] text-slate-500 group-hover:text-ink-deep dark:text-slate-400',
                  )}
                >
                  <item.icon size={16} />
                </span>
                <span className="truncate">{t(item.label)}</span>
                {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#fbf7ec] dark:bg-[#0d1b30]" />}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="shrink-0 space-y-2 border-t border-[var(--card-border)] p-3">
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--ink-ghost-3)] p-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#c8544a]/15 text-[#c8544a] dark:bg-[#e98a80]/15 dark:text-[#e98a80]">
              <span className="font-hand text-lg font-bold uppercase">
                {(email ?? 'A').charAt(0)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                {t('admin.superAdmin')}
              </p>
              <p className="truncate text-xs font-semibold text-ink-deep" title={email ?? undefined}>
                {email ?? t('admin.notSet')}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <Link
              to="/"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1.5 text-[10px] font-bold text-slate-600 transition hover:border-[#234e8b]/30 hover:text-ink-deep dark:hover:border-[#7fa6e0]/30 dark:text-slate-400"
            >
              {t('admin.viewSite')}
              <ExternalLink size={11} />
            </Link>
            <button
              type="button"
              onClick={() => { void logout() }}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#c8544a]/20 bg-[#c8544a]/10 px-2 py-1.5 text-[10px] font-bold text-[#c8544a] transition hover:bg-[#c8544a]/15 dark:border-[#e98a80]/25 dark:bg-[#e98a80]/10 dark:text-[#e98a80]"
            >
              <LogOut size={11} />
              {t('admin.logout')}
            </button>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <div className="relative min-h-dvh bg-paper-100">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-[var(--card-border)] bg-[var(--card-bg)] backdrop-blur-xl lg:flex">
        {sideContent}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] lg:hidden"
          >
            <button
              type="button"
              className="absolute inset-0 cursor-default bg-[#241f14]/45 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
              aria-label={t('admin.closeMenu')}
              tabIndex={-1}
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="absolute inset-y-0 left-0 flex w-[280px] flex-col border-r border-[var(--card-border)] bg-[var(--card-bg)] shadow-desk"
            >
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="absolute right-3 top-4 z-10 grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-[var(--ink-ghost-2)] hover:text-ink-deep"
                aria-label={t('admin.closeMenu')}
              >
                <X size={17} />
              </button>
              {sideContent}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-30 border-b border-[var(--card-border)] bg-[var(--card-bg)] backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] text-slate-600 transition hover:text-ink-deep lg:hidden"
                aria-label={t('admin.menu')}
              >
                <Menu size={18} />
              </button>
              <div className="hidden items-center gap-2 text-xs sm:flex">
                <ShieldAlert size={14} className="text-pencil" />
                <span className="text-slate-400">{t('admin.title')}</span>
                <span className="text-slate-300 dark:text-slate-600">/</span>
                <span className="font-semibold text-ink-deep">{t(current.label)}</span>
              </div>
              <span className="truncate font-hand text-xl font-bold text-ink-deep sm:hidden">
                {t(current.label)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <LanguageToggle compact />
              <ColorModeToggle />
              <Link
                to="/"
                className="hidden h-9 w-9 place-items-center rounded-full border border-[#d3c2a0] bg-paper-50/80 text-ink shadow-sm transition hover:bg-white dark:border-slate-600/40 dark:bg-white/10 dark:hover:bg-white/15 sm:grid"
                aria-label={t('admin.viewSite')}
                title={t('admin.viewSite')}
              >
                <ExternalLink size={16} />
              </Link>
              <button
                type="button"
                onClick={() => { void logout() }}
                className="grid h-9 w-9 place-items-center rounded-full border border-[#c8544a]/25 bg-[#c8544a]/10 text-[#c8544a] transition hover:bg-[#c8544a]/15 dark:border-[#e98a80]/25 dark:bg-[#e98a80]/10 dark:text-[#e98a80] sm:hidden"
                aria-label={t('admin.logout')}
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
