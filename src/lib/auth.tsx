import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { ADMIN_USER_ID } from './config'
import { HAS_BACKEND, supabase } from './supabase'

/* ==========================================================================
 * Admin authentication.
 *
 * Supabase Auth owns credentials and sessions; this module only answers "is
 * the person holding this session the authorized admin?".
 *
 * Membership is the user id itself, compared against ADMIN_USER_ID. There is no
 * `admin_users` table in this project — `public.listings` is the only table —
 * so the id is the whole of the check, and it is the same id the RLS policies
 * compare `auth.uid()` against.
 *
 * What follows is a convenience layer, not a security boundary. Everything
 * here runs in the browser and can be lied to. The actual enforcement is those
 * RLS policies — a forged `status` in this file gets someone a rendered sidebar
 * and nothing else, because every query it issues still comes back empty or
 * refused.
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
  /** Signed in as the authorized admin. */
  | 'admin'
  /** Signed in, but as somebody else. */
  | 'forbidden'
  /** No Supabase environment configured at all. */
  | 'unconfigured'

type AuthValue = {
  status: AuthStatus
  user: User | null
  profile: AdminProfile | null
  /**
   * A real account signed in, but it was not the admin.
   *
   * Kept separately from `status` because the denial outlives the session that
   * caused it: that session is signed straight back out, which returns
   * `status` to 'anon' within a tick. Without this the login form would flash
   * the explanation and lose it before anyone could read it.
   */
  unauthorized: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(HAS_BACKEND ? 'loading' : 'unconfigured')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [unauthorized, setUnauthorized] = useState(false)

  useEffect(() => {
    if (!supabase) return
    const db = supabase
    let cancelled = false

    function resolve(session: Session | null) {
      if (cancelled) return

      if (!session?.user) {
        setUser(null)
        setProfile(null)
        setStatus('anon')
        return
      }

      setUser(session.user)

      // Being signed in is not the same as being the admin: anyone who can
      // reach the Supabase project can create an auth user. Only one id may
      // pass, and it is the id the RLS policies also insist on.
      if (session.user.id !== ADMIN_USER_ID) {
        setProfile(null)
        setStatus('forbidden')
        setUnauthorized(true)
        // Drop the session rather than leaving it parked in localStorage. It
        // grants this browser nothing in the admin panel, but it is still a
        // live credential against the project, and leaving it behind on a
        // shared machine has no upside. `signOut` re-enters this resolver with
        // a null session, which lands on 'anon' and the login form; the
        // 'forbidden' state above is what the form reads to explain why.
        void db.auth.signOut()
        return
      }

      const meta = session.user.user_metadata ?? {}
      setUnauthorized(false)
      setProfile({
        id: session.user.id,
        email: session.user.email ?? '',
        display_name:
          (typeof meta.display_name === 'string' && meta.display_name) ||
          (typeof meta.full_name === 'string' && meta.full_name) ||
          null,
        role: 'owner',
        active: true,
      })
      setStatus('admin')
    }

    // A stored session that has expired and cannot refresh resolves to no
    // session here, which lands on 'anon' and therefore on the login form —
    // the same place an expired token mid-session ends up via SIGNED_OUT.
    db.auth.getSession().then(({ data }) => resolve(data.session))

    const { data: sub } = db.auth.onAuthStateChange((_event, session) => {
      resolve(session)
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
      unauthorized,
      async signIn(email, password) {
        if (!supabase) throw new Error('Supabase is not configured.')
        // A fresh attempt clears the previous verdict, so the banner reflects
        // this sign-in rather than the last one.
        setUnauthorized(false)
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
        setUnauthorized(false)
        setStatus('anon')
      },
    }),
    [status, user, profile, unauthorized],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAdminAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used inside <AdminAuthProvider>')
  return ctx
}

/**
 * Whether this Supabase project has an `audit_log` table to write to.
 *
 * It does not: `public.listings` is the only table in the schema. Left as a
 * named constant rather than deleting the writer, because the trail is worth
 * having the moment the table is added — flipping this back to `true` is then
 * the whole change. While it is false the writer returns immediately, so an
 * admin save does not fire a doomed insert and log a 404 next to every edit.
 */
const HAS_AUDIT_LOG: boolean = false

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
  if (!HAS_AUDIT_LOG || !supabase) return
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
