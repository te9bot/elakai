import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { SocialProvider } from './auth-providers'
import { ADMIN_USER_ID } from './config'
import { contributorSchemaReady } from './contrib-schema'
import { HAS_BACKEND, supabase } from './supabase'

/* ==========================================================================
 * Accounts.
 *
 * Supabase Auth owns credentials and sessions. This module answers one further
 * question — what is the person holding this session allowed to be? — and it
 * answers it by reading `public.profiles.role`, which is a column no client can
 * write. See section 6 of supabase/migrations/0008_contributors.sql: the
 * UPDATE grant held by `authenticated` covers `full_name` and nothing else, so
 * `role` and `points` cannot be changed by any request this browser can make,
 * forged or otherwise.
 *
 * WHAT CHANGED, AND WHY
 *
 * This file used to sign out, immediately and unconditionally, any session
 * whose user id was not one hard-coded constant. That was right when /admin was
 * the only reason to hold an account. It is wrong now: a contributor is a
 * legitimate signed-in user with a dashboard of their own, and dropping their
 * session on sight would make the whole contributor system unreachable.
 *
 * So the id check is gone and a role check replaces it. The constant survives
 * in exactly one place — the fallback below, for a project that has not yet
 * applied 0008 — because on that project there is no `profiles` table to ask,
 * and the existing administrator has to keep working on the day the code lands
 * and before the SQL does.
 *
 * THIS IS NOT THE SECURITY BOUNDARY
 *
 * Everything here runs in the browser and can be lied to. Editing `role` in the
 * React DevTools gets someone a rendered admin sidebar whose every query comes
 * back empty or refused, and an Approve button whose RPC answers
 * `insufficient_privilege` because `approve_submission()` checks `is_admin()`
 * inside Postgres before it does anything else. What follows decides which
 * screen renders. RLS decides what happens.
 * ========================================================================== */

export type AccountRole = 'user' | 'admin'

export type AccountProfile = {
  id: string
  email: string
  fullName: string | null
  role: AccountRole
  /** Server-held balance. Derived from the points ledger by trigger. */
  points: number
  createdAt: string | null
}

export type AccountStatus =
  /** Still resolving the stored session. */
  | 'loading'
  /** No Supabase environment configured at all. */
  | 'unconfigured'
  /** No session. The whole public site is available in this state. */
  | 'guest'
  /** Signed in as an ordinary contributor. */
  | 'contributor'
  /** Signed in as an administrator. */
  | 'admin'

export type SignUpResult = {
  /**
   * True when Supabase created the account but issued no session, which is what
   * happens whenever email confirmation is on — as it is on this project.
   * The caller shows "check your inbox" rather than navigating to a dashboard
   * the person is not yet signed in to.
   */
  needsConfirmation: boolean
}

type AccountValue = {
  status: AccountStatus
  user: User | null
  profile: AccountProfile | null
  /** Convenience, and the one thing the admin screens actually ask. */
  isAdmin: boolean
  /**
   * Whether migration 0008 is applied. False means the contributor system is
   * not open yet; the public site and the existing admin panel are unaffected.
   */
  schemaReady: boolean
  signIn: (email: string, password: string) => Promise<void>
  /**
   * Starts a social sign-in. Does not resolve to a session — it navigates the
   * whole page away to the provider, so nothing after the call runs.
   *
   * `redirectTo` is where the browser comes back to, and it carries the
   * contribute intent in its query string exactly as the email confirmation
   * link does. The OAuth round-trip leaves and re-enters the app, so in-memory
   * state does not survive it either.
   */
  signInWithProvider: (provider: SocialProvider, redirectTo?: string) => Promise<void>
  signUp: (input: {
    fullName: string
    email: string
    password: string
    /** Where to land after the confirmation link is clicked. */
    redirectTo?: string
  }) => Promise<SignUpResult>
  signOut: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  /** Re-reads the profile after something server-side changed the points. */
  refresh: () => Promise<void>
}

const AccountContext = createContext<AccountValue | null>(null)

/* ------------------------------------------------------------------ */
/* Profile resolution                                                  */
/* ------------------------------------------------------------------ */

/**
 * The display name a session carries before its profile row has been read.
 *
 * Supabase puts the signup metadata on the user object itself, so this is
 * available on the very first render and saves the dashboard from flashing an
 * empty greeting while the profile query is in flight.
 */
function metadataName(user: User): string | null {
  const meta = user.user_metadata ?? {}
  for (const key of ['full_name', 'display_name', 'name']) {
    const value = meta[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

/**
 * The profile for a session.
 *
 * Returns the row from `public.profiles` when there is one. Two fallbacks, both
 * deliberate:
 *
 *   * No `profiles` table (0008 not applied). Falls back to the legacy id
 *     comparison so the existing administrator is not locked out of a panel
 *     they were using five minutes before the deploy.
 *
 *   * Table present, row absent. This should not happen — the trigger on
 *     `auth.users` creates one — but a user created before the migration ran,
 *     in the window before its backfill, would land here. Treated as an
 *     ordinary contributor with no points, which is the safe reading: it
 *     under-grants rather than over-grants.
 */
async function loadProfile(user: User, schemaReady: boolean): Promise<AccountProfile> {
  const legacy: AccountProfile = {
    id: user.id,
    email: user.email ?? '',
    fullName: metadataName(user),
    role: user.id === ADMIN_USER_ID ? 'admin' : 'user',
    points: 0,
    createdAt: user.created_at ?? null,
  }

  if (!schemaReady || !supabase) return legacy

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, points, created_at')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.warn('[elakai] could not read your profile:', error.message)
    return { ...legacy, role: 'user' }
  }

  if (!data) {
    return { ...legacy, role: 'user' }
  }

  return {
    id: user.id,
    email: (data.email as string) || user.email || '',
    fullName: (data.full_name as string | null) ?? metadataName(user),
    // Anything that is not exactly 'admin' is a contributor. Failing closed, so
    // a typo or an unrecognised future role never grants moderation rights.
    role: data.role === 'admin' ? 'admin' : 'user',
    points: typeof data.points === 'number' ? data.points : 0,
    createdAt: (data.created_at as string | null) ?? user.created_at ?? null,
  }
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

export function AccountProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AccountStatus>(
    HAS_BACKEND ? 'loading' : 'unconfigured',
  )
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [schemaReady, setSchemaReady] = useState(false)

  // Guards the async profile read against a session that changed while it was
  // in flight — sign out during a slow query would otherwise resolve afterwards
  // and reinstate the profile of the account that just left.
  const generation = useRef(0)

  const resolve = useCallback(async (session: Session | null) => {
    const mine = ++generation.current

    if (!session?.user) {
      setUser(null)
      setProfile(null)
      setStatus('guest')
      return
    }

    setUser(session.user)

    const ready = await contributorSchemaReady()
    if (generation.current !== mine) return
    setSchemaReady(ready)

    const resolved = await loadProfile(session.user, ready)
    if (generation.current !== mine) return

    setProfile(resolved)
    setStatus(resolved.role === 'admin' ? 'admin' : 'contributor')
  }, [])

  useEffect(() => {
    if (!supabase) return
    const db = supabase
    let cancelled = false

    // Asked once regardless of whether anyone is signed in, because the
    // Contribute entry point has to know whether to offer an account at all.
    void contributorSchemaReady().then((ready) => {
      if (!cancelled) setSchemaReady(ready)
    })

    // A stored session that has expired and cannot refresh resolves to no
    // session here, which lands on 'guest' — the same place an expired token
    // mid-session ends up via SIGNED_OUT.
    void db.auth.getSession().then(({ data }) => {
      if (!cancelled) void resolve(data.session)
    })

    const { data: sub } = db.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      // TOKEN_REFRESHED fires on a timer and carries the same user. Re-reading
      // the profile on it would issue a query every hour for no new
      // information; the session itself is already updated by the client.
      if (event === 'TOKEN_REFRESHED' && session?.user?.id === user?.id) return
      void resolve(session)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
    // `user?.id` is read inside the TOKEN_REFRESHED guard only; re-subscribing
    // on every user change would tear down and rebuild the listener during
    // sign-in, so it is deliberately not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolve])

  const refresh = useCallback(async () => {
    if (!user) return
    const ready = await contributorSchemaReady()
    const resolved = await loadProfile(user, ready)
    setProfile(resolved)
    setStatus(resolved.role === 'admin' ? 'admin' : 'contributor')
  }, [user])

  const value = useMemo<AccountValue>(
    () => ({
      status,
      user,
      profile,
      isAdmin: profile?.role === 'admin',
      schemaReady,
      refresh,

      async signIn(email, password) {
        if (!supabase) throw new Error('Supabase is not configured.')
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        // Thrown rather than returned so each form's catch block is the single
        // place that decides how a failure is worded.
        if (error) throw new Error(error.message)
        // `onAuthStateChange` takes it from here.
      },

      async signInWithProvider(provider, redirectTo) {
        if (!supabase) throw new Error('Supabase is not configured.')
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
            /*
             * No `scopes` and no `queryParams`.
             *
             * The default scope for both providers is the profile and email
             * this system needs to create an account, and nothing else. Asking
             * for more — a contacts scope, an offline refresh token — would put
             * a longer consent screen in front of somebody who wanted to add a
             * pharmacy, for data this app has no use for and no business
             * holding.
             */
          },
        })
        if (error) {
          // The message worth translating: it is what a misconfigured provider
          // says, and the person reading it can do nothing about it.
          if (/provider is not enabled|unsupported provider/i.test(error.message)) {
            throw new Error('That sign-in method is not available on this site.')
          }
          throw new Error(error.message)
        }
        // On success the browser is already navigating away. Nothing after this
        // line runs, which is why there is no session to return.
      },

      async signUp({ fullName, email, password, redirectTo }) {
        if (!supabase) throw new Error('Supabase is not configured.')
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            // Read by handle_new_user() in migration 0008 to seed the profile's
            // display name. Note what is NOT here: no role, no points. The
            // trigger never reads them and the columns take their defaults, so
            // a crafted signup payload cannot arrive as an administrator.
            data: { full_name: fullName.trim() },
            emailRedirectTo: redirectTo,
          },
        })
        if (error) throw new Error(error.message)

        // Supabase returns a user and no session when confirmation is required,
        // which is this project's configuration. Reported rather than inferred
        // by the caller, so turning autoconfirm on later changes the experience
        // with no code change.
        return { needsConfirmation: !data.session }
      },

      async signOut() {
        if (!supabase) return
        await supabase.auth.signOut()
        setProfile(null)
        setUser(null)
        setStatus('guest')
      },

      async sendPasswordReset(email) {
        if (!supabase) throw new Error('Supabase is not configured.')
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/elakai/account/login`,
        })
        if (error) throw new Error(error.message)
      },
    }),
    [status, user, profile, schemaReady, refresh],
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount(): AccountValue {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useAccount must be used inside <AccountProvider>')
  return ctx
}

/* ------------------------------------------------------------------ */
/* Audit trail                                                         */
/* ------------------------------------------------------------------ */

/**
 * Records who touched what.
 *
 * Only the actions a client is the best witness to are written from here —
 * "this contributor filed this submission". Everything an administrator does
 * is written inside `approve_submission()` and `reject_submission()`, where it
 * cannot be omitted by a client that chose not to call this.
 *
 * Failure never blocks the write it describes: an audit trail that can fail a
 * save is worse than one with a gap in it.
 */
export async function writeAuditLog(entry: {
  actorId: string | null
  actorEmail: string | null
  action: string
  entity: string
  entityId: string
  summary?: string
  changes?: Record<string, unknown>
}): Promise<void> {
  if (!supabase || !entry.actorId) return
  if (!(await contributorSchemaReady())) return

  const { error } = await supabase.from('audit_log').insert({
    actor_id: entry.actorId,
    actor_email: entry.actorEmail,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId,
    summary: entry.summary ?? null,
    changes: entry.changes ?? null,
  })
  if (error) console.warn('[elakai] audit log write failed:', error.message)
}
