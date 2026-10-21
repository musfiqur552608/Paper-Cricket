import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { usePreferences } from '../../store/preferences'

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  eyebrow?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  dismissible?: boolean
  hideClose?: boolean
}

export function Dialog({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  size = 'md',
  dismissible = true,
  hideClose = false,
}: DialogProps) {
  const { t } = useTranslation()
  const reduced = usePreferences((state) => state.reducedMotion)
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<Element | null>(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const timer = window.setTimeout(() => panelRef.current?.focus(), 30)

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && dismissible) {
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = originalOverflow
      if (previousFocus.current instanceof HTMLElement) previousFocus.current.focus()
    }
  }, [open, dismissible])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
          <motion.button
            type="button"
            aria-label={t('common.close')}
            className="absolute inset-0 cursor-default bg-[#2a2418]/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismissible ? onClose : undefined}
            tabIndex={-1}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            className={clsx(
              'paper-card relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-b-none shadow-desk sm:rounded-[26px]',
              size === 'sm' && 'sm:max-w-md',
              size === 'md' && 'sm:max-w-xl',
              size === 'lg' && 'sm:max-w-3xl',
            )}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 36, scale: 0.985, rotate: -0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.99 }}
            transition={{ duration: reduced ? 0.05 : 0.26, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-ink/25 to-transparent" />
            {(title || eyebrow) && (
              <header className="flex items-start justify-between gap-4 px-5 pb-3 pt-5 sm:px-7 sm:pt-6">
                <div>
                  {eyebrow ? (
                    <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.22em] text-pencil">{eyebrow}</p>
                  ) : null}
                  {title ? (
                    <h2 id={titleId} className="font-hand text-[34px] font-bold leading-[1.05] text-ink-deep sm:text-[38px]">
                      {title}
                    </h2>
                  ) : null}
                </div>
                {!hideClose ? (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label={t('common.close')}
                    className="btn-ghost -mr-2 -mt-1 h-9 w-9 shrink-0 rounded-full p-0"
                  >
                    <X size={19} />
                  </button>
                ) : null}
              </header>
            )}
            <div className="no-scrollbar min-h-0 overflow-y-auto px-5 pb-[calc(1rem+var(--safe-bottom))] sm:px-7">
              {children}
            </div>
            {footer ? (
              <footer className="border-t border-[#dfd1b7] bg-paper-100/60 px-5 py-4 pb-[calc(1rem+var(--safe-bottom))] sm:px-7">
                {footer}
              </footer>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
