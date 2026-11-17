import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AdminSession = {
  isAdmin: boolean
  secret: string | null
  setAdmin: (secret: string | null) => void
  login: (secret: string) => boolean
  logout: () => void
}

const ADMIN_SECRET_KEY = 'pc.admin_secret'

export const useAdminStore = create<AdminSession>()(
  persist(
    (set) => ({
      isAdmin: false,
      secret: null,
      setAdmin: (secret) => set({ isAdmin: !!secret, secret }),
      login: (secret) => {
        const expected = import.meta.env.VITE_ADMIN_SECRET
        if (expected && secret === expected) {
          set({ isAdmin: true, secret })
          try {
            window.localStorage.setItem(ADMIN_SECRET_KEY, secret)
          } catch {
            // storage blocked; session lasts until refresh
          }
          return true
        }
        return false
      },
      logout: () => {
        set({ isAdmin: false, secret: null })
        try {
          window.localStorage.removeItem(ADMIN_SECRET_KEY)
        } catch {
          // ignore
        }
      },
    }),
    {
      name: ADMIN_SECRET_KEY,
      partialize: (state) => ({ secret: state.secret }),
    },
  ),
)

/**
 * Restore admin state from localStorage on module load. The secret is only
 * validated client-side against VITE_ADMIN_SECRET; every admin RPC also
 validates the secret server-side.
 */
export function restoreAdminSession(): void {
  if (typeof window === 'undefined') return
  try {
    const stored = window.localStorage.getItem(ADMIN_SECRET_KEY)
    const expected = import.meta.env.VITE_ADMIN_SECRET
    if (stored && expected && stored === expected) {
      useAdminStore.setState({ isAdmin: true, secret: stored })
    }
  } catch {
    // ignore storage errors
  }
}
