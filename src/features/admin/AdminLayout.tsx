import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  ShieldAlert,
  FileText,
  Globe,
  Settings,
  LogOut,
  Menu,
  X,
  Users as UsersIcon,
} from 'lucide-react'
import { useAdminStore } from '../../store/admin'

const NAV = [
  { path: '/admin', label: 'admin.dashboard', icon: LayoutDashboard },
  { path: '/admin/rooms', label: 'admin.rooms', icon: UsersIcon },
  { path: '/admin/notices', label: 'admin.notices', icon: ShieldAlert },
  { path: '/admin/seo', label: 'admin.seo', icon: FileText },
  { path: '/admin/settings', label: 'admin.settings', icon: Settings },
]

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { isAdmin, logout } = useAdminStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!isAdmin) return null

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <header className="sticky top-0 z-40 border-b border-[var(--card-border)] bg-[var(--card-bg)]/90 backdrop-blur-[10px]">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 6 }}
              className="w-8 h-8 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] flex items-center justify-center shadow-sm"
            >
              <ShieldAlert size={18} className="text-pencil" />
            </motion.div>
            <span className="font-hand text-xl font-bold tracking-tight text-ink-deep">
              {t('admin.title')}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            {NAV.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    'flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-semibold transition',
                    isActive
                      ? 'bg-ink-deep/8 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-white/30 dark:hover:bg-white/10',
                  )}
                >
                  <item.icon size={16} />
                  {t(item.label)}
                </Link>
              )
            })}
            <button
              type="button"
              onClick={() => logout()}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-semibold text-pencil transition hover:bg-pencil/10"
            >
              <LogOut size={16} />
              {t('admin.logout')}
            </button>
          </div>

          <button
            type="button"
            className="sm:hidden rounded-xl p-2 text-slate-600 dark:text-slate-400 hover:bg-white/30 dark:hover:bg-white/10"
            onClick={() => setSidebarOpen(true)}
            aria-label={t('admin.menu')}
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {sidebarOpen && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="fixed inset-0 z-[55] flex"
        >
          <motion.button
            type="button"
            className="absolute inset-0 z-10 cursor-default bg-[#2a2418]/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            tabIndex={-1}
          />
          <motion.div
            initial={{ x: -240 }}
            animate={{ x: 0 }}
            className="fixed left-0 top-0 z-[60] h-full w-[240px] border-r border-[var(--card-border)] bg-[var(--card-bg)] flex flex-col shadow-desk"
          >
            <div className="p-5 border-b border-[var(--card-border)]">
              <span className="font-hand text-lg font-bold tracking-tight text-ink-deep">{t('admin.title')}</span>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {NAV.map((item) => {
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={clsx(
                      'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition',
                      isActive
                        ? 'bg-ink-deep/10 text-ink-deep border border-ink-deep/30'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-white/30 dark:hover:bg-white/10',
                    )}
                  >
                    <item.icon size={18} />
                    {t(item.label)}
                  </Link>
                )
              })}
              <div className="pt-4 border-t border-[var(--card-border)] mt-3">
                <button
                  type="button"
                  onClick={() => { logout(); setSidebarOpen(false) }}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-pencil transition hover:bg-pencil/10 w-full"
                >
                  <LogOut size={18} />
                  {t('admin.logout')}
                </button>
              </div>
            </nav>
          </motion.div>
        </motion.div>
      )}

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 pb-12 pt-1">
        {children}
      </main>
    </div>
  )
}
