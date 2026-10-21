export type ShareProvider = 'whatsapp' | 'messenger' | 'telegram'

export function roomUrl(code: string): string {
  if (typeof window === 'undefined') return `/room/${code}`
  return `${window.location.origin}/room/${code}`
}

export function inviteMessage(code: string, messageTemplate: string): string {
  return messageTemplate.replace('{{code}}', code).replace('{{url}}', roomUrl(code))
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to the old-school method
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    area.setAttribute('readonly', '')
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}

export async function webShare(data: ShareData): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.share) return false
  try {
    await navigator.share(data)
    return true
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return true
    return false
  }
}

export function providerUrl(provider: ShareProvider, url: string, text: string): string {
  const message = url ? `${text}\n${url}` : text
  switch (provider) {
    case 'whatsapp':
      return `https://wa.me/?text=${encodeURIComponent(message)}`
    case 'telegram':
      return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
    case 'messenger':
      return isMobile()
        ? `fb-messenger://share/?link=${encodeURIComponent(url)}`
        : `https://www.messenger.com/new`
  }
}

function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(',')
  const mime = /data:([^;]+)/.exec(meta ?? '')?.[1] ?? 'image/png'
  const binary = atob(base64 ?? '')
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'paper-cricket'
}
