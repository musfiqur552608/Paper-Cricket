import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { IS_SUPABASE_CONFIGURED, SUPABASE_ANON_KEY, SUPABASE_URL } from '../../config/gameConfig'
import { AppError } from '../errors'

export const supabase: SupabaseClient | null = IS_SUPABASE_CONFIGURED
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'paper-cricket-auth',
      },
      realtime: {
        params: { eventsPerSecond: 12 },
      },
    })
  : null

let sessionPromise: Promise<string> | null = null

/**
 * Silently opens a Supabase anonymous session. There is no login UI anywhere:
 * the anonymous id only proves "same browser, same seat" for room security.
 */
export async function ensureAnonSession(): Promise<string> {
  if (!supabase) throw new AppError('NOT_CONFIGURED')

  const { data: existing, error: existingError } = await supabase.auth.getSession()
  if (existingError) throw new AppError('AUTH_REQUIRED', existingError.message)
  if (existing.session?.user?.id) return existing.session.user.id

  if (!sessionPromise) {
    sessionPromise = (async () => {
      if (!supabase) throw new AppError('NOT_CONFIGURED')
      const { data, error } = await supabase.auth.signInAnonymously({
        options: { data: { app: 'paper-cricket' } },
      })
      if (error) {
        if (/anonymous/i.test(error.message)) {
          throw new AppError(
            'AUTH_REQUIRED',
            'Anonymous sign-ins are disabled in Supabase. Enable them in Authentication → Providers.',
          )
        }
        throw new AppError('AUTH_REQUIRED', error.message)
      }
      if (!data.user) throw new AppError('AUTH_REQUIRED')
      return data.user.id
    })().finally(() => {
      sessionPromise = null
    })
  }

  return sessionPromise
}

export async function getCurrentUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}
