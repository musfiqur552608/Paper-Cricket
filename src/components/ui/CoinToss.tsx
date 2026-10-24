import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Coins } from 'lucide-react'

export interface TossWinner {
  side: 'host' | 'guest'
  name: string
  team: string
}

export function CoinToss({
  open,
  winner,
  phase,
}: {
  open: boolean
  winner: TossWinner | null
  phase: 'flipping' | 'result'
}) {
  const { t } = useTranslation()

  return (
    <AnimatePresence>
      {open && winner ? (
        <motion.div
          className="fixed inset-0 z-[70] grid place-items-center bg-ink/45 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="paper-card w-full max-w-sm rounded-[28px] p-6 text-center shadow-2xl"
            initial={{ scale: 0.92, y: 18 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          >
            <p className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-pencil">
              <Coins size={13} /> {t('toss.title')}
            </p>

            <div className="relative mx-auto mt-5 h-28 w-28" style={{ perspective: 900 }}>
              <motion.div
                className="absolute inset-0"
                initial={{ rotateY: 0, scale: 0.72, y: 0 }}
                animate={{
                  rotateY: 1440 + (winner.side === 'guest' ? 180 : 0),
                  scale: 1,
                  y: [0, -18, 0],
                }}
                transition={{ duration: 1.55, ease: [0.2, 0.8, 0.3, 1] }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                <CoinFace label="H" />
                <CoinFace label="G" back />
              </motion.div>
              <div className="absolute -inset-4 -z-10 rounded-full bg-[#e9c873]/25 blur-2xl" />
            </div>

            <p className="mt-5 font-hand text-3xl font-bold leading-none text-ink-deep">
              {phase === 'result'
                ? winner.side === 'host'
                  ? t('toss.hostWins')
                  : t('toss.guestWins')
                : t('toss.flipping')}
            </p>

            {phase === 'result' ? (
              <>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {t('toss.batFirst', { team: winner.team })}
                </p>
                <p className="mt-4 animate-pulse text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  {t('toss.starting')}
                </p>
              </>
            ) : (
              <p className="mt-2 text-[11.5px] text-slate-500">{t('toss.handsOff')}</p>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function CoinFace({ label, back = false }: { label: string; back?: boolean }) {
  return (
    <div
      className="absolute inset-0 grid place-items-center rounded-full border-[3px] border-[#b8892f] bg-[radial-gradient(circle_at_30%_24%,#fff6c8,#e8c163_45%,#a87527_100%)] shadow-[0_14px_28px_-14px_rgba(90,60,10,.65)]"
      style={{
        backfaceVisibility: 'hidden',
        transform: back ? 'rotateY(180deg)' : undefined,
      }}
    >
      <div className="grid h-[82%] w-[82%] place-items-center rounded-full border border-[#8f651f]/45 bg-[radial-gradient(circle_at_40%_30%,rgba(255,255,255,.45),transparent_60%)]">
        <span className="font-hand text-4xl font-bold text-[#6b4812] drop-shadow-[0_1px_0_rgba(255,255,255,.5)]">
          {label}
        </span>
      </div>
    </div>
  )
}
