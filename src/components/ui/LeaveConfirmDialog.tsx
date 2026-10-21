import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Download, LogOut } from 'lucide-react'
import { Dialog } from '../ui/Dialog'

export function LeaveConfirmDialog({
  open,
  onClose,
  onLeave,
  title,
  body,
  downloadLabel,
  onDownload,
  leavingLabel,
}: {
  open: boolean
  onClose: () => void
  onLeave: () => Promise<void> | void
  title: string
  body: string
  downloadLabel?: string
  onDownload?: () => Promise<void> | void
  leavingLabel?: string
}) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (open) {
      setBusy(false)
      setDownloading(false)
    }
  }, [open])

  async function leave() {
    if (busy) return
    setBusy(true)
    try {
      await onLeave()
    } finally {
      setBusy(false)
    }
  }

  async function download() {
    if (!onDownload || downloading) return
    setDownloading(true)
    try {
      await onDownload()
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={title} eyebrow={t('common.paperRemembers')} size="sm">
      <div className="flex gap-3 rounded-xl border border-amber-300/70 bg-amber-50/80 p-3.5">
        <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
        <p className="text-[13px] leading-relaxed text-amber-950">{body}</p>
      </div>
      <div className="mt-4 space-y-2">
        {onDownload && downloadLabel ? (
          <button type="button" className="btn-primary w-full" onClick={() => void download()} disabled={downloading}>
            {downloading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <Download size={17} />
            )}
            {downloadLabel}
          </button>
        ) : null}
        <button type="button" className="btn-paper w-full text-pencil" onClick={() => void leave()} disabled={busy}>
          {busy ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-pencil/30 border-t-pencil" />
          ) : (
            <LogOut size={16} />
          )}
          {leavingLabel ?? t('common.leaveRoom')}
        </button>
        <button type="button" className="btn-ghost w-full text-slate-500" onClick={onClose} disabled={busy}>
          {t('common.cancel')}
        </button>
      </div>
    </Dialog>
  )
}
