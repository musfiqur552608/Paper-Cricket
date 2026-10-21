import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Info, Pencil } from 'lucide-react'
import { useToast } from '../../store/toast'
import clsx from 'clsx'

const icons = {
  info: Info,
  success: CheckCircle2,
  error: AlertCircle,
  pencil: Pencil,
}

export function ToastViewport() {
  const toasts = useToast((state) => state.toasts)
  const dismiss = useToast((state) => state.dismiss)

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[calc(0.75rem+env(safe-area-inset-top,0px))] z-[120] flex flex-col items-center gap-2 px-4"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = icons[toast.tone]
          return (
            <motion.button
              key={toast.id}
              type="button"
              onClick={() => dismiss(toast.id)}
              initial={{ opacity: 0, y: -14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              className={clsx(
                'pointer-events-auto flex max-w-md items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-[13px] font-medium shadow-paper backdrop-blur-sm',
                toast.tone === 'error' && 'border-red-300/70 bg-red-50/95 text-red-800',
                toast.tone === 'success' && 'border-emerald-300/70 bg-emerald-50/95 text-emerald-800',
                toast.tone === 'pencil' && 'border-[#e8bcb6] bg-[#fff4f1]/95 text-[#8c3d35]',
                toast.tone === 'info' && 'border-[#d3c2a0] bg-paper-50/95 text-slate-700',
              )}
            >
              <Icon size={16} className="mt-0.5 shrink-0" />
              <span>{toast.message}</span>
            </motion.button>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
