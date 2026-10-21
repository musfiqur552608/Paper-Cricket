import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy, Link2, MessageCircle, Send, Share2, Smartphone } from 'lucide-react'
import { Dialog } from '../../components/ui/Dialog'
import { copyText, inviteMessage, providerUrl, roomUrl, webShare } from '../../lib/share'
import { notify } from '../../store/toast'

export function InviteDialog({
  open,
  onClose,
  code,
}: {
  open: boolean
  onClose: () => void
  code: string
}) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)
  const message = inviteMessage(code, t('lobby.inviteMessageNoUrl'))
  const url = roomUrl(code)

  async function copy(kind: 'code' | 'link') {
    const ok = await copyText(kind === 'code' ? code : url)
    if (!ok) {
      notify.error(t('lobby.copyFailed'))
      return
    }
    setCopied(kind)
    notify.success(kind === 'code' ? t('lobby.codeCopied') : t('lobby.linkCopied'))
    window.setTimeout(() => setCopied(null), 1800)
  }

  async function share() {
    const shared = await webShare({
      title: t('common.appName'),
      text: inviteMessage(code, t('lobby.inviteMessageNoUrl')),
      url,
    })
    if (!shared) {
      const ok = await copyText(`${message}\n${url}`)
      notify[ok ? 'success' : 'error'](ok ? t('lobby.linkCopied') : t('lobby.copyFailed'))
    }
  }

  function openProvider(provider: 'whatsapp' | 'messenger' | 'telegram') {
    void copyText(message)
    const target = providerUrl(provider, url, message)
    window.open(target, '_blank', 'noopener,noreferrer')
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('lobby.inviteTitle')} eyebrow={t('lobby.inviteEyebrow')} size="sm">
      <div className="mb-5 flex items-center gap-2 rounded-xl border border-ink/15 bg-[#eef4fe] px-3 py-2.5">
        <Smartphone size={17} className="text-ink" />
        <p className="text-[12px] leading-snug text-slate-600">
          {t('lobby.inviteInstructions')}
        </p>
      </div>

      <div className="rounded-2xl border border-[#ddcfb4] bg-paper-50/80 p-4 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{t('common.roomCode')}</p>
        <p className="mt-1 font-mono text-4xl font-bold tracking-[0.24em] text-ink-deep">{code}</p>
        <p className="mt-1 truncate text-[11px] text-slate-500">{url}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" className="btn-paper btn-sm" onClick={() => copy('code')}>
            {copied === 'code' ? <Check size={14} className="text-leaf" /> : <Copy size={14} />}
            {t('lobby.copyCode')}
          </button>
          <button type="button" className="btn-paper btn-sm" onClick={() => copy('link')}>
            {copied === 'link' ? <Check size={14} className="text-leaf" /> : <Link2 size={14} />}
            {t('lobby.copyLink')}
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => openProvider('whatsapp')}
          className="flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-xl border border-[#cbe7d2] bg-[#eaf7ed] px-2 text-[11px] font-semibold text-[#216c43] transition hover:bg-[#ddf2e3]"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#25D366] text-white">
            <MessageCircle size={17} />
          </span>
          WhatsApp
        </button>
        <button
          type="button"
          onClick={() => openProvider('telegram')}
          className="flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-xl border border-[#c7e6f5] bg-[#e9f6fc] px-2 text-[11px] font-semibold text-[#11658f] transition hover:bg-[#d9f0fa]"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#229ED9] text-white">
            <Send size={16} />
          </span>
          Telegram
        </button>
        <button
          type="button"
          onClick={() => openProvider('messenger')}
          className="flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-xl border border-[#d6d9f5] bg-[#eff0fd] px-2 text-[11px] font-semibold text-[#41428f] transition hover:bg-[#e3e5fb]"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#5b64e8] text-white">
            <MessageCircle size={17} />
          </span>
          Messenger
        </button>
      </div>

      {'share' in navigator ? (
        <button type="button" className="btn-primary mt-3 w-full" onClick={() => void share()}>
          <Share2 size={15} />
          {t('common.share')}
        </button>
      ) : (
        <p className="mt-3 text-center text-[10.5px] text-slate-400">{t('lobby.shareUnsupported')}</p>
      )}
    </Dialog>
  )
}
