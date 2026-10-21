import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { BookOpen, CircleDot, PenLine, Sparkles, ArrowRight, EyeOff } from 'lucide-react'
import { Dialog } from '../../components/ui/Dialog'
import { MotionToggle } from '../../components/ui/Toggles'
import { Board } from '../../components/board/Board'
import { BOARD_SEGMENTS } from '../../config/gameConfig'
import { usePreferences } from '../../store/preferences'

export function HowToPlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('how.title')}
      eyebrow={t('how.eyebrow')}
      size="lg"
      footer={
        <button type="button" className="btn-primary w-full btn-lg" onClick={onClose}>
          <PenLine size={18} />
          {t('how.close')}
        </button>
      }
    >
      <p className="text-[14.5px] leading-relaxed text-slate-600">{t('how.intro')}</p>

      <div className="mt-4">
        <MotionToggle />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          { n: 1, title: t('how.step1Title'), body: t('how.step1Body'), Icon: CircleDot },
          { n: 2, title: t('how.step2Title'), body: t('how.step2Body'), Icon: EyeOff },
          { n: 3, title: t('how.step3Title'), body: t('how.step3Body'), Icon: PenLine },
          { n: 4, title: t('how.step4Title'), body: t('how.step4Body'), Icon: BookOpen },
        ].map(({ n, title, body, Icon }) => (
          <div key={n} className="rounded-2xl border border-[#e1d3b8] bg-white/55 p-3.5">
            <div className="mb-2 flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-ink/10 text-ink">
                <Icon size={15} />
              </span>
              <span className="font-hand text-[22px] font-bold leading-none text-ink-deep">{n}. {title}</span>
            </div>
            <p className="text-[13px] leading-relaxed text-slate-600">{body}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-ink/20 bg-[#edf3fd] p-4">
        <h3 className="flex items-center gap-2 font-hand text-[25px] font-bold text-ink-deep">
          <Sparkles size={18} className="text-marigold" />
          {t('how.fairnessTitle')}
        </h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{t('how.fairnessBody')}</p>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <h3 className="font-hand text-[26px] font-bold text-ink-deep">{t('how.glossary')}</h3>
        <ArrowRight size={18} className="text-ink/40" />
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {[
          { title: t('how.runsTitle'), body: t('how.runsBody'), code: '1 · 2 · 3 · 4 · 6' },
          { title: t('how.wideTitle'), body: t('how.wideBody'), code: 'W' },
          { title: t('how.noBallTitle'), body: t('how.noBallBody'), code: 'N' },
          { title: t('how.wicketsTitle'), body: t('how.wicketsBody'), code: 'CO · Lbw · RO · BO' },
          { title: t('how.freeHitTitle'), body: t('how.freeHitBody'), code: 'FH' },
        ].map((item) => (
          <div key={item.code} className="flex gap-3 rounded-xl border border-[#e5d8c0] bg-paper-50/70 px-3 py-2.5">
            <span className="grid min-w-12 place-items-center rounded-lg border border-ink/20 bg-white px-2 font-hand text-lg font-bold text-ink">
              {item.code}
            </span>
            <div>
              <p className="text-[13px] font-bold text-ink-deep">{item.title}</p>
              <p className="text-[12px] leading-snug text-slate-500">{item.body}</p>
            </div>
          </div>
        ))}
      </div>
    </Dialog>
  )
}

/** A tiny decorative board used on the landing page; it can be spun for fun. */
export function DoodleBoard() {
  const { t } = useTranslation()
  const reduced = usePreferences((state) => state.reducedMotion)
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  function spin() {
    if (spinning) return
    setSpinning(true)
    setRotation((value) => value + 720 + Math.round(Math.random() * 360))
    timer.current = window.setTimeout(() => setSpinning(false), 2500)
  }

  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, rotate: -3, y: 24 }}
        animate={{ opacity: 1, rotate: -1.4, y: 0 }}
        transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        <Board
          rotation={rotation}
          transitionMs={spinning && !reduced ? 2400 : 0}
          className="drop-shadow-[0_28px_38px_rgba(69,54,24,.2)]"
        />
        <button
          type="button"
          onClick={spin}
          className="absolute bottom-[7%] left-1/2 -translate-x-1/2 rounded-full border border-ink/25 bg-paper-50/95 px-4 py-2 font-hand text-lg font-bold text-ink shadow-paper transition hover:-rotate-1 hover:bg-white"
          aria-label={t('how.spinLabel')}
        >
          <span className="flex items-center gap-1.5">
            <Sparkles size={14} className={spinning ? 'animate-spin' : ''} />
            {t('how.spinCta')}
          </span>
        </button>
      </motion.div>

      <div className="pointer-events-none absolute -right-3 -top-5 hidden rotate-6 rounded-sm border border-[#d8c7a2] bg-[#f7ed9d]/90 px-2.5 py-1 font-hand text-sm text-[#6b5a2c] shadow-sm sm:block">
        {t('how.actualBoard')}
      </div>
      <svg className="pointer-events-none absolute -left-8 top-[18%] hidden h-24 w-24 text-pencil/60 md:block" viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <path d="M8 52 C24 28 48 20 75 32" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="3 4" />
        <path d="M64 22 L78 33 L63 42" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <text x="2" y="70" fill="currentColor" fontFamily="Caveat, cursive" fontSize="16" transform="rotate(-4 2 70)">
          {t('how.wedges', { count: BOARD_SEGMENTS.length })}
        </text>
      </svg>
      <div className="pointer-events-none absolute -bottom-3 -left-2 rotate-[-4deg] rounded-sm border border-[#d8c7a2] bg-[#f5efdc] px-2.5 py-1 font-hand text-sm text-slate-500 shadow-sm">
        {t('common.appName')} · no. 04
      </div>
    </div>
  )
}
