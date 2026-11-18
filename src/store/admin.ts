import { create } from 'zustand'
import { adminMe, adminSignOut, type AdminIdentity } from '../lib/adminApi'
import { adminSupabase } from '../lib/supabase/adminClient'

export type AdminSession = {
  /** True only when Supabase has a session AND the server allowlist accepts it. */
  isAdmin: boolean
  /** Email of the signed-in admin account. */
  email: string | null
  /** True while the initial session check is still running. */
  checking: boolean
  /** Re-check the current Supabase session against the server allowlist. */
  refresh: () => Promise<AdminIdentity>
  /** Sign out of the admin client only (the player session is untouched). */
  logout: () => Promise<void>
}

export const useAdminStore = create<AdminSession>()((set) => ({
  isAdmin: false,
  email: null,
  checking: true,

  refresh: async () => {
    const identity = await adminMe()
    set({ isAdmin: identity.isAdmin, email: identity.email, checking: false })
    return identity
  },

  logout: async () => {
    await adminSignOut()
    set({ isAdmin: false, email: null, checking: false })
  },
}))

/**
 * Called once on app start. Restores the admin session from the dedicated
 * Supabase admin client and verifies it against the server allowlist.
 */
export function restoreAdminSession(): void {
  void useAdminStore.getState().refresh()

  // Keep other tabs in sync: if the admin session ends anywhere, drop access.
  adminSupabase?.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      useAdminStore.setState({ isAdmin: false, email: null, checking: false })
    }
  })
}
