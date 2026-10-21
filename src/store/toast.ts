import { create } from 'zustand'

export type ToastTone = 'info' | 'success' | 'error' | 'pencil'

export interface Toast {
  id: string
  message: string
  tone: ToastTone
}

interface ToastState {
  toasts: Toast[]
  push: (message: string, tone?: ToastTone) => void
  dismiss: (id: string) => void
}

let toastCounter = 0

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  push: (message, tone = 'info') => {
    const id = `toast-${Date.now()}-${toastCounter++}`
    set((state) => ({ toasts: [...state.toasts.slice(-3), { id, message, tone }] }))
    window.setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
    }, 4200)
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}))

export const notify = {
  info: (message: string) => useToast.getState().push(message, 'info'),
  success: (message: string) => useToast.getState().push(message, 'success'),
  error: (message: string) => useToast.getState().push(message, 'error'),
  pencil: (message: string) => useToast.getState().push(message, 'pencil'),
}
