import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/* ==========================================================================
 * Supabase client.
 *
 * The public site is a static SPA, so this key ships in the bundle — that is
 * what the anon key is for. It carries no authority of its own: every table is
 * under Row Level Security (supabase/migrations/0002_rls.sql), and the anon
 * role can read published rows and nothing else.
 *
 * The service_role key bypasses RLS entirely and must never appear in this
 * file, in `.env`, or anywhere else Vite can inline it. It belongs only in the
 * Supabase dashboard.
 * ========================================================================== */

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Whether a backend is configured at all.
 *
 * This is checked rather than assumed so a fresh clone — or a preview build
 * with no secrets — degrades to the bundled demo data instead of throwing on
 * first paint. See src/lib/api.ts.
 */
export const HAS_BACKEND = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = HAS_BACKEND
  ? createClient(url!, anonKey!, {
      auth: {
        // The admin panel is a route in this same SPA, so the session has to
        // survive a reload and a redirect back from the magic-link flow.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'elakai-auth',
      },
      global: {
        headers: { 'x-application-name': 'elakai-web' },
      },
    })
  : null

/** Narrowing helper for the many call sites that require a live client. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    )
  }
  return supabase
}
