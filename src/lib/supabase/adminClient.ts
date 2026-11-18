import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { IS_SUPABASE_CONFIGURED, SUPABASE_ANON_KEY, SUPABASE_URL } from '../../config/gameConfig'

/**
 * Dedicated Supabase client for the admin panel.
 *
 * Admin auth uses Supabase email + password, while players use an anonymous
 * session on the main client. A separate client with its own storage key keeps
 * the two sessions independent: signing into the admin panel never replaces the
 * player session, and logging out of admin never ends a match.
 */
export const adminSupabase: SupabaseClient | null = IS_SUPABASE_CONFIGURED
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'paper-cricket-admin-auth',
      },
    })
  : null
