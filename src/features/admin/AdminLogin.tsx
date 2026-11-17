import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldAlert, LogIn, ArrowRight } from 'lucide-react'
import { useAdminStore } from '../../store/admin'
import { AppHeader } from '../../components/ui/AppHeader'

export function AdminLogin() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login, isAdmin } = useAdminStore()
  const [secret, setSecret] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (isAdmin) {
    navigate('/admin', { replace: true })
    return null
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const ok = login(secret.trim())
    setSubmitting(false)
    if (ok) {
      navigate('/admin', { replace: true })
    } else {
      setError(t('admin.loginFailed'))
    }
  }

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-6 md:py-20 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="paper-card rounded-[30px] p-6 sm:p-10 md:p-14 shadow-desk"
        >
          <div className="flex items-center gap-3 mb-6">
            <ShieldAlert size={24} className="text-pencil" />
            <h1 className="font-hand text-3xl font-bold leading-tight text-ink-deep">
              {t('admin.loginTitle')}
            </h1>
          </div>
          <p className="mb-8 text-slate-600 dark:text-slate-400 leading-relaxed">
            {t('admin.loginSub')}
          </p>

          {error && (
            <div className="mb-6 rounded-xl border border-amber-300/70 bg-amber-50/90 p-4 text-amber-800 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">{t('admin.secretLabel')}</label>
              <input
                type="password"
                autoComplete="current-password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="input"
                placeholder="••••••••"
                disabled={submitting}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full btn-primary min-h-[52px] flex items-center justify-center gap-2 disabled:opacity-70"
              >
                <LogIn size={18} />
                {submitting ? t('admin.signingIn') : t('admin.signIn')}
              </button>
            </div>
          </form>

          <p className="mt-8 text-[12px] text-center text-slate-500 dark:text-slate-400">
            {t('admin.secretNote')} <code className="font-mono text-pencil">VITE_ADMIN_SECRET</code>.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 text-sm"
        >
          <ArrowRight size={14} />
          <Link to="/" className="text-ink hover:text-pencil underline-offset-2 hover:underline">
            {t('admin.backToHome')}
          </Link>
        </motion.div>
      </main>
    </div>
  )
}
