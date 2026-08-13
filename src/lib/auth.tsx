import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { HAS_BACKEND, supabase } from './supabase'

/* ==========================================================================
 * Admin authentication.
 *
 * Supabase Auth owns credentials and sessions; this module only answers "is
 * the person holding this session an active admin?".
 *
 * What follows is a convenience layer, not a security boundary. Everything
 * here runs in the browser and can be lied to. The actual enforcement is
 * `is_active_admin()` in Postgres and the RLS policies that call it — a forged
 * `status` in this file gets someone a rendered sidebar and nothing else,
 * because every query it issues still comes back empty or refused.
 * ========================================================================== */

export type AdminRole = 'owner' | 'editor' | 'viewer'

export type AdminProfile = {
  id: string
  email: string
  display_name: string | null
  role: AdminRole
  active: boolean
}

export type AuthStatus =
  /** Still resolving the stored session. */
  | 'loading'
  /** No session — show the login form. */
  | 'anon'
  /** Signed in, and there is an active admin_users row. */
  | 'admin'
  /** Signed in, but not an admin (or deactivated). */
  | 'forbidden'
  /** No Supabase environment configured at all. */
  | 'unconfigured'

type AuthValue = {
  status: AuthStatus
  user: User | null
  profile: AdminProfile | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(HAS_BACKEND ? 'loading' : 'unconfigured')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AdminProfile | null>(null)

  useEffect(() => {
    if (!supabase) return
    const db = supabase
    let cancelled = false

    async function resolve(session: Session | null) {
      if (cancelled) return

      if (!session?.user) {
        setUser(null)
        setProfile(null)
        setStatus('anon')
        return
      }

      setUser(session.user)

      // Being signed in is not the same as being an admin: anyone who can reach
      // the Supabase project can create an auth user. Membership is the
      // admin_users row, and RLS lets a signed-in user read only their own.
      const { data, error } = await db
        .from('admin_users')
        .select('id, email, display_name, role, active')
        .eq('id', session.user.id)
        .maybeSingle()

      if (cancelled) return

      if (error || !data || !data.active) {
        setProfile(null)
        setStatus('forbidden')
        return
      }

      setProfile(data as AdminProfile)
      setStatus('admin')
    }

    db.auth.getSession().then(({ data }) => resolve(data.session))

    const { data: sub } = db.auth.onAuthStateChange((_event, session) => {
      void resolve(session)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthValue>(
    () => ({
      status,
      user,
      profile,
      async signIn(email, password) {
        if (!supabase) throw new Error('Supabase is not configured.')
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        // Thrown rather than returned so the form's catch block is the single
        // place that decides how a failure is worded.
        if (error) throw new Error(error.message)
        // `onAuthStateChange` takes it from here.
      },
      async signOut() {
        if (!supabase) return
        await supabase.auth.signOut()
        setProfile(null)
        setUser(null)
        setStatus('anon')
      },
    }),
    [status, user, profile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAdminAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used inside <AdminAuthProvider>')
  return ctx
}

/** Records who touched what. Failure here must never block the write itself. */
export async function writeAuditLog(entry: {
  actorId: string | null
  actorEmail: string | null
  action: string
  entity: string
  entityId: string
  summary?: string
  changes?: Record<string, unknown>
}): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('audit_log').insert({
    actor_id: entry.actorId,
    actor_email: entry.actorEmail,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId,
    summary: entry.summary ?? null,
    changes: entry.changes ?? null,
  })
  // An audit trail that can fail a save is worse than one with a gap in it.
  if (error) console.warn('[elakai] audit log write failed:', error.message)
}
