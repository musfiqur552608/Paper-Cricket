import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { X, Megaphone } from 'lucide-react'
import { fetchPublicNotices } from '../../lib/adminApi'

const TYPE_COLOR: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  info: { bg: 'bg-blue-50/90 dark:bg-blue-900/20', text: 'text-blue-800 dark:text-blue-300', border: 'border-blue-200/60 dark:border-blue-500/30', icon: 'text-blue-600 dark:text-blue-400' },
  success: { bg: 'bg-green-50/90 dark:bg-green-900/20', text: 'text-green-800 dark:text-green-300', border: 'border-green-200/60 dark:border-green-500/30', icon: 'text-green-600 dark:text-green-400' },
  warning: { bg: 'bg-amber-50/90 dark:bg-amber-900/20', text: 'text-amber-800 dark:text-amber-300', border: 'border-amber-200/60 dark:border-amber-500/30', icon: 'text-amber-600 dark:text-amber-400' },
  error: { bg: 'bg-red-50/90 dark:bg-red-900/20', text: 'text-red-800 dark:text-red-300', border: 'border-red-200/60 dark:border-red-500/30', icon: 'text-red-600 dark:text-red-400' },
}

export function NoticeBanner() {
  const { t } = useTranslation()
  const [notices, setNotices] = useState<Array<{
    id: string
    title: string
    body: string
    type: string
  }>>([])
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const raw = window.localStorage.getItem('pc.dismissed_notices')
      return raw ? new Set(JSON.parse(raw)) : new Set()
    } catch {
      return new Set()
    }
  })

  useEffect(() => {
    let mounted = true
    fetchPublicNotices().then((data) => {
      if (mounted) setNotices(data.filter((n) => !dismissed.has(n.id)))
    })
    return () => { mounted = false }
  }, [])

  const active = notices.filter((n) => !dismissed.has(n.id))
  if (active.length === 0) return null

  const dismiss = (id: string) => {
    dismissed.add(id)
    setDismissed(new Set(dismissed))
    try {
      window.localStorage.setItem('pc.dismissed_notices', JSON.stringify([...dismissed]))
    } catch {
      // ignore
    }
    setNotices((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="sticky top-0 z-[85] w-full border-b border-[var(--card-border)] bg-[var(--card-bg)] backdrop-blur-[10px]"
    >
      {active.map((notice) => {
        const style = (TYPE_COLOR[notice.type as keyof typeof TYPE_COLOR] ?? TYPE_COLOR.info)!
        return (
          <motion.div
            key={notice.id}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="flex items-start gap-3 px-4 py-3 sm:px-6 sm:py-4"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-full shrink-0">
              <Megaphone size={16} className={style.icon} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold leading-relaxed ${style.text}`}>
                {notice.title}
              </p>
              {notice.body && (
                <p className={`mt-[2px] text-xs leading-relaxed ${style.text}/90`}>
                  {notice.body}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(notice.id)}
              className="shrink-0 p-1 text-slate-400 hover:text-pencil rounded"
              aria-label={t('common.close')}
            >
              <X size={16} />
            </button>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
