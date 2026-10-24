import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { BookOpen, Target } from 'lucide-react'

export function InningsBreak({
  open,
  teamName,
  runs,
  wickets,
  overs,
  target,
  onDone,
}: {
  open: boolean
  teamName: string
  runs: number
  wickets: number
  overs: string
  target: number | null
  onDone: () => void
}) {
  const { t } = useTranslation()
  const [remaining, setRemaining] = useState(3)

  useEffect(() => {
    if (!open) return
    setRemaining(3)
    const tick = window.setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1))
    }, 1000)
    const timer = window.setTimeout(() => {
      onDone()
    }, 3000)
    return () => {
      window.clearInterval(tick)
      window.clearTimeout(timer)
    }
  }, [onDone, open])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[65] grid place-items-center bg-ink/40 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-[#d8c7a2] bg-[#fffdf6] p-6 text-center shadow-2xl"
            initial={{ scale: 0.92, rotateY: 8, y: 18 }}
            animate={{ scale: 1, rotateY: 0, y: 0 }}
            exit={{ scale: 0.96, rotateY: -8, y: 10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 230, damping: 22 }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* paper gloss that sweeps across like a turning page */}
            <motion.div
              className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/4 rotate-12 bg-gradient-to-r from-transparent via-white/35 to-transparent blur-md"
              animate={{ x: ['0%', '680%'] }}
              transition={{ duration: 1.7, repeat: Infinity, ease: 'linear' }}
            />
            <div className="relative">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-ink/15 bg-ink/[0.045] text-ink/70">
                <BookOpen size={24} />
              </div>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.22em] text-pencil">
                {t('inningsBreak.title')}
              </p>

              <p className="mt-2 font-hand text-[34px] font-bold leading-none text-ink-deep">{teamName}</p>
              <p className="mt-2 font-mono text-2xl font-bold text-ink">
                {runs}/{wickets}
                <span className="ml-2 text-sm font-semibold text-slate-400">({overs} ov)</span>
              </p>

              {target != null ? (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-marigold/30 bg-marigold/10 px-3 py-1 text-[11px] font-bold text-[#966313]">
                  <Target size={12} /> {t('inningsBreak.target', { target })}
                </p>
              ) : null}

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-ink/10">
                <motion.div
                  className="h-full rounded-full bg-pencil"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 3, ease: 'linear' }}
                />
              </div>
              <p className="mt-2 text-[11px] font-semibold text-slate-500">
                {remaining > 0 ? t('inningsBreak.next', { count: remaining }) : t('inningsBreak.starting')}
              </p>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
