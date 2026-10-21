import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  CircleDot,
  EyeOff,
  LogIn,
  PenLine,
  Plus,
  Send,
  Sparkles,
  Users,
} from 'lucide-react'
import { AppHeader, Footer } from '../../components/ui/AppHeader'
import { HowToPlay, DoodleBoard } from '../howto/HowToPlay'
import { CreateRoomDialog } from './CreateRoomDialog'
import { JoinRoomDialog } from './JoinRoomDialog'
import { usePreferences } from '../../store/preferences'
import { IS_SUPABASE_CONFIGURED } from '../../config/gameConfig'

export function LandingPage() {
  const { t } = useTranslation()
  const reducedMotion = usePreferences((state) => state.reducedMotion)
  const [howOpen, setHowOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)

  const fadeUp = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 22 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-60px' },
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
      }

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <AppHeader onHowToPlay={() => setHowOpen(true)} />

      <main>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative mx-auto grid w-full max-w-6xl gap-6 px-4 pb-14 pt-4 sm:px-6 md:grid-cols-[1.03fr_.97fr] md:items-center md:gap-10 md:pb-20 md:pt-8 lg:pt-12">
          <div className="relative z-10 text-center md:text-left">
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d8c7a2] bg-paper-50/75 px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-500 shadow-sm"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-leaf" />
              {t('landing.badge')}
            </motion.div>

            <p className="mb-2 font-hand text-[24px] font-semibold text-pencil sm:text-[28px]">
              {t('landing.kicker')}
            </p>

            <motion.h1
              initial={reducedMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="text-balance font-hand text-[64px] font-bold leading-[0.86] tracking-[-0.01em] text-ink-deep sm:text-[82px] lg:text-[96px]"
            >
              {t('landing.title')}
              <span className="relative mt-1 block text-pencil">
                {t('landing.titleAccent')}
                <svg
                  className="absolute -bottom-4 left-0 h-5 w-[82%] text-pencil/55"
                  viewBox="0 0 300 20"
                  fill="none"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path d="M4 13 C74 5 174 17 296 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  <path d="M21 18 C112 12 205 20 275 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity=".6" />
                </svg>
              </span>
            </motion.h1>

            <motion.p
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mx-auto mt-8 max-w-md text-[15px] leading-relaxed text-slate-600 md:mx-0 md:text-[16px]"
            >
              {t('landing.subtitle')}
            </motion.p>
            <p className="mt-2.5 font-hand text-[20px] text-ink/55">{t('landing.bengaliLine')}</p>

            <div className="mt-7 flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center md:justify-start">
              <button type="button" onClick={() => setCreateOpen(true)} className="btn-primary btn-lg group min-w-[190px]">
                <Plus size={19} className="transition group-hover:rotate-90" />
                {t('landing.createCta')}
                <ArrowRight size={17} className="ml-auto opacity-50 sm:ml-1" />
              </button>
              <button type="button" onClick={() => setJoinOpen(true)} className="btn-paper btn-lg min-w-[180px]">
                <LogIn size={18} className="text-ink/75" />
                {t('landing.joinCta')}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] font-medium text-slate-400 md:justify-start">
              <span className="inline-flex items-center gap-1"><Users size={12} /> 2 {t('common.player').toLowerCase()}</span>
              <span className="text-slate-300">·</span>
              <span>{t('landing.roomCodeHint')}</span>
              <span className="text-slate-300">·</span>
              <span>{t('landing.noSignup')}</span>
            </div>

            {!IS_SUPABASE_CONFIGURED ? (
              <p className="mt-4 inline-block rounded-lg bg-amber-100/70 px-2.5 py-1 text-[10.5px] font-medium text-amber-800">
                {t('landing.previewBuild')}
              </p>
            ) : null}
          </div>

          <div className="relative mx-auto w-full max-w-[470px] px-2 md:max-w-none md:px-5">
            <div className="absolute inset-[8%] -z-10 rotate-3 rounded-[40%] bg-[#eadcc0]/50 blur-2xl" />
            <DoodleBoard />
          </div>
        </section>

        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-6 pb-8">
          <div className="h-px flex-1 bg-ink/10" />
          <a href="#story" className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-slate-400 transition hover:text-ink">
            {t('landing.scroll')}
            <ArrowDown size={13} />
          </a>
          <div className="h-px flex-1 bg-ink/10" />
        </div>

        {/* ── Story ────────────────────────────────────────────────────── */}
        <section id="story" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 pb-16 sm:px-6 md:pb-24">
          <motion.div {...fadeUp} className="paper-card relative overflow-hidden rounded-[28px] p-6 sm:p-9 md:p-12">
            <div className="absolute right-0 top-0 h-28 w-28 translate-x-8 -translate-y-8 rotate-12 rounded-full border border-ink/10" />
            <div className="absolute bottom-5 right-8 hidden rotate-[-7deg] font-hand text-[15px] text-ink/30 sm:block">
              {t('landing.backPage')}
            </div>

            <div className="grid gap-8 md:grid-cols-[.9fr_1.1fr] md:gap-12">
              <div>
                <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.24em] text-pencil">{t('landing.chapter')}</p>
                <h2 className="text-balance font-hand text-[42px] font-bold leading-[0.98] text-ink-deep sm:text-[52px]">
                  {t('landing.storyTitle')}
                </h2>
                <div className="mt-6 flex items-center gap-3">
                  <span className="h-10 w-px bg-ink/15" />
                  <p className="font-hand text-[19px] leading-tight text-slate-500">
                    {t('landing.twoFriends')}
                  </p>
                </div>
                <svg viewBox="0 0 250 130" fill="none" className="mt-4 w-full max-w-[260px]" aria-hidden="true">
                  <path d="M30 100 C74 84 136 106 218 82" stroke="#234e8b" strokeWidth="1.8" strokeLinecap="round" opacity=".22" />
                  <circle cx="74" cy="52" r="30" stroke="#234e8b" strokeWidth="2" />
                  <path d="M74 52 L74 23 M74 52 L96 36 M74 52 L96 68 M74 52 L74 81 M74 52 L52 68 M74 52 L52 36" stroke="#234e8b" strokeWidth="1.2" strokeLinecap="round" opacity=".55" />
                  <text x="70" y="55" fontSize="12" fontFamily="Caveat" fill="#234e8b">6</text>
                  <path d="M136 88 C138 64 142 48 157 30" stroke="#c8544a" strokeWidth="2.4" strokeLinecap="round" />
                  <path d="M147 34 L158 28 L158 41" stroke="#c8544a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  <text x="154" y="112" fontSize="16" fontFamily="Caveat" fill="#234e8b" opacity=".65">{t('landing.nib')}</text>
                  <path d="M112 52 q18 -14 34 -6" stroke="#c8544a" strokeWidth="1.2" strokeDasharray="2 4" />
                </svg>
              </div>

              <div className="relative">
                <span className="absolute -left-7 -top-6 font-hand text-[78px] leading-none text-pencil/15 sm:-left-9 sm:text-[100px]">“</span>
                <p className="relative text-[15px] leading-[1.85] text-slate-600 sm:text-[16px]">{t('landing.story')}</p>
                <div className="mt-5 flex items-center gap-3 border-t border-dashed border-ink/15 pt-4">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-pencil/10 text-pencil">
                    <BookOpen size={17} />
                  </span>
                  <p className="text-[12px] italic leading-snug text-slate-500">
                    {t('landing.quote')}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── How a ball works ───────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 md:pb-24">
          <motion.div {...fadeUp} className="mb-8 text-center">
            <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.24em] text-pencil">{t('landing.ritual')}</p>
            <h2 className="font-hand text-[42px] font-bold leading-none text-ink-deep sm:text-[52px]">{t('landing.howTitle')}</h2>
          </motion.div>
          <div className="grid gap-4 md:grid-cols-3 md:gap-6">
            {[
              { Icon: CircleDot, title: t('landing.step1Title'), body: t('landing.step1Body'), n: '01', color: 'text-ink' },
              { Icon: EyeOff, title: t('landing.step2Title'), body: t('landing.step2Body'), n: '02', color: 'text-pencil' },
              { Icon: Sparkles, title: t('landing.step3Title'), body: t('landing.step3Body'), n: '03', color: 'text-marigold' },
            ].map(({ Icon, title, body, n, color }, index) => (
              <motion.div
                key={n}
                {...fadeUp}
                transition={{ ...(fadeUp.transition ?? {}), delay: index * 0.07 }}
                className="paper-card group relative overflow-hidden rounded-2xl p-5 transition-transform hover:-translate-y-1"
              >
                <span className="absolute right-3 top-1 font-hand text-[44px] font-bold text-ink/10">{n}</span>
                <span className={`mb-4 grid h-11 w-11 place-items-center rounded-full border border-current/20 bg-white/60 ${color}`}>
                  <Icon size={21} />
                </span>
                <h3 className="font-hand text-[28px] font-bold leading-none text-ink-deep">{title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-500">{body}</p>
                {index < 2 ? (
                  <span className="absolute -right-2 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-ink/20 md:block">
                    <ArrowRight size={20} />
                  </span>
                ) : null}
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Details ────────────────────────────────────────────────── */}
        <section className="relative mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 md:pb-24">
          <div className="absolute inset-x-8 top-10 -z-10 h-[80%] rounded-[40%] bg-[#e6d6b8]/45 blur-3xl" />
          <motion.div {...fadeUp} className="grid gap-4 md:grid-cols-3">
            {[
              { Icon: Users, title: t('landing.detail1'), body: t('landing.detail1Body') },
              { Icon: PenLine, title: t('landing.detail2'), body: t('landing.detail2Body') },
              { Icon: BookOpen, title: t('landing.detail3'), body: t('landing.detail3Body') },
            ].map(({ Icon, title, body }, index) => (
              <div key={title} className="relative rounded-2xl border border-[#d8c7a2]/80 bg-paper-50/70 p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <Icon size={20} className="text-ink" />
                  <span className="font-hand text-xl text-ink/20">0{index + 1}</span>
                </div>
                <h3 className="text-[15px] font-bold text-ink-deep">{title}</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">{body}</p>
              </div>
            ))}
          </motion.div>
        </section>

        {/* ── Invite band ────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
          <motion.div {...fadeUp} className="relative overflow-hidden rounded-[26px] bg-ink px-6 py-9 text-paper-50 shadow-[0_25px_50px_-24px_rgba(23,55,99,.6)] sm:px-10 sm:py-11">
            <div className="absolute inset-0 opacity-[0.13]" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 31px, #fff 31px, #fff 32px)' }} />
            <svg viewBox="0 0 350 350" className="pointer-events-none absolute -right-16 -top-20 h-[340px] w-[340px] text-white/10" fill="none" aria-hidden="true">
              <circle cx="175" cy="175" r="140" stroke="currentColor" strokeWidth="2" />
              <circle cx="175" cy="175" r="110" stroke="currentColor" strokeWidth="1" strokeDasharray="3 6" />
              <path d="M175 175 L175 50 M175 175 L282 113 M175 175 L282 237 M175 175 L175 300 M175 175 L68 237 M175 175 L68 113" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="175" cy="175" r="13" stroke="currentColor" strokeWidth="2" />
            </svg>
            <div className="relative z-10 max-w-2xl">
              <p className="mb-2 flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.22em] text-paper-300/80">
                <Send size={13} /> {t('landing.inviteTitle')}
              </p>
              <h2 className="text-balance font-hand text-[38px] font-bold leading-[1.02] text-white sm:text-[48px]">
                {t('landing.inviteHeading')}
              </h2>
              <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-paper-200/75">{t('landing.inviteBody')}</p>
              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
                <button type="button" onClick={() => setCreateOpen(true)} className="btn bg-paper-50 text-ink-deep hover:bg-white">
                  <Plus size={17} /> {t('landing.createCta')}
                </button>
                <button type="button" onClick={() => setHowOpen(true)} className="btn border border-white/25 bg-white/10 text-white hover:bg-white/15">
                  <BookOpen size={16} /> {t('common.howToPlay')}
                </button>
              </div>
            </div>
            <div className="relative z-10 mt-7 flex items-center gap-3 sm:absolute sm:bottom-8 sm:right-10 sm:mt-0">
              <span className="text-[10px] uppercase tracking-[0.2em] text-paper-300/60">{t('lobby.roomReady')}</span>
              <span className="rounded-lg border border-white/25 bg-white/10 px-3 py-2 font-mono text-xl font-bold tracking-[0.22em]">A7K9Q2</span>
            </div>
          </motion.div>
        </section>
      </main>

      <Footer />

      <HowToPlay open={howOpen} onClose={() => setHowOpen(false)} />
      <CreateRoomDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <JoinRoomDialog open={joinOpen} onClose={() => setJoinOpen(false)} />
    </div>
  )
}
