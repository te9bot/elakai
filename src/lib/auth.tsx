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
import { useQueryClient } from '@tanstack/react-query'
import type { PostgrestError, Session, User } from '@supabase/supabase-js'
import type { SocialProvider } from './auth-providers'
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
 * ONE SOURCE OF ROLE, AND NO GUESSING BEFORE IT ARRIVES
 *
 * This file used to settle on 'contributor' the instant it held a session and
 * refine to 'admin' when the profile query came back. That was an attempt to
 * stop a slow query stranding people on the login form, and it worked, but it
 * made the role a value that is *wrong for a while* rather than one that is
 * *not known yet* — and every screen downstream had to invent its own way of
 * telling those apart. They did not agree. An administrator signing in over a
 * slow link was shown "this account is not an ELAKAI administrator" on the
 * admin form, and a four-second ceiling elsewhere could drop them on the
 * contributor dashboard instead of the panel. Measured against a 700ms link:
 * the warning was on screen for over a second after a correct sign-in.
 *
 * So there is no provisional role any more. `status` stays 'loading' — an
 * explicit third state, not a default — until `profiles.role` has actually been
 * read, and the wait is bounded here (see READ_TIMEOUT_MS) rather than left to
 * each caller to put its own timer around. A read that never lands settles as a
 * contributor with `roleError` set, which under-grants and says so, rather than
 * silently guessing in either direction.
 *
 * The legacy `user.id === ADMIN_USER_ID` fallback is gone with it. It was a
 * second, client-side authority for the one question this module exists to
 * answer, and it disagreed with the database the moment a second administrator
 * was promoted — which is what has happened on this project.
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
  /**
   * A session is being restored, or its role is being read. Nothing about the
   * account is known yet and no routing decision may be made from this state.
   */
  | 'loading'
  /** No Supabase environment configured at all. */
  | 'unconfigured'
  /** No session. The whole public site is available in this state. */
  | 'guest'
  /** Signed in, and `profiles.role` says this is an ordinary contributor. */
  | 'contributor'
  /** Signed in, and `profiles.role` says 'admin'. */
  | 'admin'

export type SignUpResult = {
  /**
   * True when Supabase created the account but issued no session, which is what
   * happens whenever email confirmation is on — as it is on this project.
   * The caller shows the code screen rather than navigating to a dashboard the
   * person is not yet signed in to.
   *
   * WORTH SAYING OUT LOUD, BECAUSE IT IS THE THING §23 WARNS ABOUT: this being
   * true means an email went out. It does not mean anybody read it, and it
   * certainly does not mean the address was verified. Nothing downstream of
   * this value may treat the account as confirmed. The only thing that may is
   * a session returned by `verifyEmailOtp`.
   */
  needsConfirmation: boolean
}

/**
 * Which flow a code belongs to.
 *
 * Supabase needs to be told, because the two are different token types on the
 * server: 'signup' verifies the confirmation token minted by `signUp()`, and
 * 'email' verifies the one minted by `signInWithOtp()`. Sending the wrong one
 * fails a perfectly good code, so the caller states which screen it is on
 * rather than this module guessing from the presence of a session.
 */
export type OtpPurpose = 'signup' | 'login'

type AccountValue = {
  status: AccountStatus
  user: User | null
  profile: AccountProfile | null
  /** Convenience, and the one thing the admin screens actually ask. */
  isAdmin: boolean
  /**
   * Set when the profile could not be read, which means the role behind
   * `status` is a safe default rather than an answer. Screens that gate on
   * being an admin say so instead of silently turning someone away.
   */
  roleError: string | null
  /**
   * Whether migration 0008 is applied. False means the contributor system is
   * not open yet; the public site is unaffected.
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
  /**
   * Sends a one-time code to an address that already has an account.
   *
   * `shouldCreateUser: false` is the security-relevant argument and it is not
   * optional: with the default, typing any address into the sign-in form would
   * create an account for it. That turns a login screen into an unauthenticated
   * account-creation endpoint and, worse, into an oracle — the response differs
   * for an address that exists and one that does not.
   *
   * Rejecting an unknown address is deliberately NOT surfaced as "no account
   * with that email". See the caller: it says a code is on its way either way,
   * for the same enumeration reason the password form gives one message for a
   * wrong password and a missing account.
   */
  sendLoginOtp: (email: string) => Promise<void>
  /**
   * Asks Supabase to send the signup confirmation again.
   *
   * A distinct call from `sendLoginOtp` because the account exists but is not
   * confirmed, which is a state `signInWithOtp` refuses.
   */
  resendSignupOtp: (email: string) => Promise<void>
  /**
   * THE ONLY PLACE A CODE IS JUDGED, AND IT IS NOT JUDGED HERE.
   *
   * The code goes to Supabase and Supabase answers. On success the auth server
   * has written `email_confirmed_at` on the user and issued a session, which is
   * what `public.is_email_verified()` reads in migration 0013 — so a client
   * that skipped this call has nothing to skip it with: its requests are
   * refused by Postgres, not by a check in this file.
   *
   * Throws on failure with Supabase's own error intact, so `classifyOtpError`
   * can tell an expired code from a wrong one. Resolving on success is what
   * moves the caller's state machine to `otp_verified`; there is no other way
   * for it to get there.
   */
  verifyEmailOtp: (input: {
    email: string
    token: string
    purpose: OtpPurpose
  }) => Promise<void>
  signOut: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  /** Re-reads the profile — after a points change, or to retry a failed read. */
  refresh: () => Promise<void>
}

const AccountContext = createContext<AccountValue | null>(null)

/* ------------------------------------------------------------------ */
/* Profile resolution                                                  */
/* ------------------------------------------------------------------ */

/**
 * How long one attempt at reading the profile may take.
 *
 * There has to be a ceiling somewhere or a hung request becomes a hung sign-in,
 * and it belongs here rather than in each screen: the callers cannot tell a
 * slow read from a lost one, and three of them had grown their own timers with
 * three different opinions about what to do next.
 */
const READ_TIMEOUT_MS = 6000

/** One retry, because a single dropped request on a phone is not an answer. */
const READ_ATTEMPTS = 2

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
 * PostgREST reports a table the schema does not have as `PGRST205` (its own
 * schema-cache miss) or as Postgres `42P01` (undefined_table), depending on
 * whether the cache has been reloaded since. Both mean migration 0008 has not
 * been applied. Any other error — network down, key wrong, RLS refusing — is
 * deliberately not read as "missing".
 */
function isMissingTable(error: PostgrestError): boolean {
  if (error.code === 'PGRST205' || error.code === '42P01') return true
  return /could not find the table|relation .* does not exist/i.test(error.message)
}

type ProfileResolution = {
  profile: AccountProfile
  schemaReady: boolean
  /** Null when the role below was read rather than defaulted to. */
  error: string | null
}

/**
 * The profile for a session, in one round trip.
 *
 * It used to be two: `contributorSchemaReady()` first, then the profile read.
 * They ran in sequence, so a sign-in paid two full round trips before it knew
 * who had signed in — the single biggest contributor to the window in which the
 * role was unknown. Both questions have one answer: if `profiles` can be
 * queried the schema is there, and if it cannot the error code says why. The
 * schema check is now a by-product of the read that had to happen anyway.
 *
 * Never guesses upwards. Every failure path returns role 'user' with `error`
 * set, so a lost request can only under-grant, and the caller can tell "this
 * person is a contributor" from "we could not find out".
 */
async function readProfile(user: User): Promise<ProfileResolution> {
  const base: AccountProfile = {
    id: user.id,
    email: user.email ?? '',
    fullName: metadataName(user),
    role: 'user',
    points: 0,
    createdAt: user.created_at ?? null,
  }

  if (!supabase) {
    return { profile: base, schemaReady: false, error: 'Supabase is not configured.' }
  }
  const db = supabase

  let lastMessage = 'The account could not be read.'

  for (let attempt = 1; attempt <= READ_ATTEMPTS; attempt++) {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), READ_TIMEOUT_MS)
    try {
      const { data, error } = await db
        .from('profiles')
        .select('id, email, full_name, role, points, created_at')
        .eq('id', user.id)
        .abortSignal(controller.signal)
        .maybeSingle()

      if (error) {
        if (isMissingTable(error)) {
          // Not a failure to retry: the table is not there. Nothing can grant a
          // role on this project, so everyone signed in is a contributor.
          console.info(
            '[elakai] the contributor schema is not present — accounts stay ' +
              'unprivileged until supabase/migrations/0008_contributors.sql is applied. ' +
              `(${error.message})`,
          )
          return {
            profile: base,
            schemaReady: false,
            error: 'The account system is not set up on this project yet.',
          }
        }
        lastMessage = error.message
        continue
      }

      if (!data) {
        // The trigger on `auth.users` creates one, so this is a user made in
        // the window before 0008's backfill. An ordinary contributor with no
        // points is the safe reading: it under-grants rather than over-grants.
        return { profile: base, schemaReady: true, error: null }
      }

      return {
        schemaReady: true,
        error: null,
        profile: {
          id: user.id,
          email: (data.email as string) || user.email || '',
          fullName: (data.full_name as string | null) ?? metadataName(user),
          // Anything that is not exactly 'admin' is a contributor. Failing
          // closed, so a typo or an unrecognised future role never grants
          // moderation rights.
          role: data.role === 'admin' ? 'admin' : 'user',
          points: typeof data.points === 'number' ? data.points : 0,
          createdAt: (data.created_at as string | null) ?? user.created_at ?? null,
        },
      }
    } catch (thrown) {
      lastMessage = controller.signal.aborted
        ? 'The account took too long to load.'
        : thrown instanceof Error
          ? thrown.message
          : lastMessage
    } finally {
      window.clearTimeout(timer)
    }
  }

  console.warn('[elakai] could not read your profile:', lastMessage)
  // Schema assumed present: the failure was not a missing table, and answering
  // "not set up" for a dropped request would tell a contributor the whole
  // system is off because their connection blinked.
  return { profile: base, schemaReady: true, error: lastMessage }
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

export function AccountProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AccountStatus>(HAS_BACKEND ? 'loading' : 'unconfigured')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  /*
   * Whether the contributor schema exists — assumed present until something
   * proves otherwise, and that direction is a bug fix, not optimism.
   *
   * This started as `false` and was only ever set by the profile read. The
   * profile read only runs when there is a session. So for a signed-out
   * visitor — which is everyone looking at the sign-in page — it stayed false
   * forever, and /account/login and /account/signup told them "Contributions
   * are not switched on for this site yet" on a project where `profiles`,
   * `submissions`, `points_transactions` and `audit_log` all exist and work.
   * Signing in cleared it, because the profile read finally ran, which is why
   * the contributor dashboard behaved while the door to it said it was shut.
   *
   * I introduced that when the standalone `contributorSchemaReady()` probe was
   * folded into the profile read to save a round trip on sign-in. The probe ran
   * unconditionally on mount and covered the signed-out case; the profile read
   * does not.
   *
   * Starting from `true` restores the signed-out behaviour without restoring
   * the extra request. The flag now means "no evidence contributions are off",
   * and the evidence is specific: `readProfile` returns `schemaReady: false`
   * only for PostgREST's `PGRST205` or Postgres's `42P01` — the schema genuinely
   * has no `profiles` table. A network failure does not lower it, because a
   * dropped request is not evidence that a feature does not exist.
   */
  const [schemaReady, setSchemaReady] = useState(HAS_BACKEND)
  const [roleError, setRoleError] = useState<string | null>(null)

  const queryClient = useQueryClient()

  /*
   * Guards every async resolution against the session changing under it.
   *
   * Bumped by `resolve` and — this is the part that was missing — by `signOut`
   * as well. Without it a profile read still in flight when someone signs out
   * lands afterwards and reinstates the account that just left, which is
   * exactly the stale role that could survive an account switch.
   */
  const generation = useRef(0)

  /**
   * The signed-in user's id, readable from inside the auth listener.
   *
   * The listener subscribes once and never re-subscribes, so it cannot see
   * `user` — it would only ever see the first render's `null`. Written here
   * during render rather than in an effect so it is already correct by the time
   * any auth event can fire.
   */
  const userIdRef = useRef<string | undefined>(undefined)
  userIdRef.current = user?.id

  const resolve = useCallback(async (session: Session | null) => {
    const mine = ++generation.current

    if (!session?.user) {
      setUser(null)
      setProfile(null)
      setRoleError(null)
      setStatus('guest')
      return
    }

    /*
     * A DIFFERENT ACCOUNT INVALIDATES EVERYTHING KNOWN ABOUT THE LAST ONE.
     *
     * This is the account-switch bug. `status` used to be left at whatever it
     * was until the new profile landed, on the reasoning that a cold start
     * begins at 'loading' anyway. That reasoning only covers a cold start. When
     * a session *replaces* another one — signing in as somebody else, a
     * SIGNED_IN arriving from another tab, a recovered session for a second
     * account — the previous account's `status` and `profile` stayed on screen
     * for the whole of `readProfile`, which is bounded by READ_TIMEOUT_MS and
     * nothing shorter.
     *
     * Concretely: an administrator signs out, a contributor signs in, and until
     * the contributor's row comes back `status` is still 'admin' and `isAdmin`
     * is still true. RequireAdmin renders the moderation desk for them. It is
     * exactly the "old role written back over the new login" the report
     * describes, and it is worst on a slow link, where the window is longest.
     *
     * Dropping to 'loading' restores the one property this module promises: a
     * role is either read or not known, never left over. Every guard already
     * holds correctly on 'loading', so no screen needs to change.
     */
    const switching = userIdRef.current !== undefined && userIdRef.current !== session.user.id
    if (switching) {
      setProfile(null)
      setRoleError(null)
      /*
       * Synchronously, not via the effect below. That effect runs after a
       * commit, so without this line one render can pair the new user with the
       * previous one's cached submissions and points.
       */
      queryClient.clear()
    }
    if (switching || userIdRef.current === undefined) setStatus('loading')

    setUser(session.user)

    const resolved = await readProfile(session.user)
    if (generation.current !== mine) return

    setSchemaReady(resolved.schemaReady)
    setProfile(resolved.profile)
    setRoleError(resolved.error)
    setStatus(resolved.profile.role === 'admin' ? 'admin' : 'contributor')
  }, [queryClient])

  useEffect(() => {
    if (!supabase) return
    const db = supabase
    let cancelled = false

    // A stored session that has expired and cannot refresh resolves to no
    // session here, which lands on 'guest' — the same place an expired token
    // mid-session ends up via SIGNED_OUT.
    void db.auth.getSession().then(({ data }) => {
      if (!cancelled) void resolve(data.session)
    })

    const { data: sub } = db.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      /*
       * TOKEN_REFRESHED fires on a timer and carries the same user. Re-reading
       * the profile on it would issue a query every hour for no new
       * information; the session itself is already updated by the client.
       *
       * Compared against a ref, not against `user`: this effect subscribes once
       * and never re-subscribes, so the `user` it closed over is the one from
       * the first render.
       */
      if (event === 'TOKEN_REFRESHED' && session?.user?.id === userIdRef.current) return
      void resolve(session)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolve])

  /*
   * Cached data belongs to whoever was signed in when it was fetched.
   *
   * React Query keys the contributor screens by query name, not by account, so
   * without this the submissions and points of the person who just signed out
   * are served to the person who just signed in, for as long as the cache
   * lives. Keyed on the user id, so it fires on sign-in, on sign-out, and on a
   * switch straight from one account to another.
   */
  const previousUserId = useRef<string | null>(null)
  useEffect(() => {
    const id = user?.id ?? null
    if (previousUserId.current !== null && previousUserId.current !== id) {
      queryClient.clear()
    }
    previousUserId.current = id
  }, [user?.id, queryClient])

  const refresh = useCallback(async () => {
    if (!user) return
    const mine = ++generation.current
    const resolved = await readProfile(user)
    if (generation.current !== mine) return
    setSchemaReady(resolved.schemaReady)
    setProfile(resolved.profile)
    setRoleError(resolved.error)
    setStatus(resolved.profile.role === 'admin' ? 'admin' : 'contributor')
  }, [user])

  const value = useMemo<AccountValue>(
    () => ({
      status,
      user,
      profile,
      isAdmin: profile?.role === 'admin',
      roleError,
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

      async sendLoginOtp(email) {
        if (!supabase) throw new Error('Supabase is not configured.')
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            // See the doc comment on the type. Without this, the sign-in form
            // creates accounts.
            shouldCreateUser: false,
          },
        })
        // Rethrown as-is rather than wrapped in a new Error: `classifyOtpError`
        // reads `code` and `status` off the AuthError, and a `new Error(msg)`
        // would throw both away and leave every failure looking generic.
        if (error) throw error
      },

      async resendSignupOtp(email) {
        if (!supabase) throw new Error('Supabase is not configured.')
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: email.trim(),
        })
        if (error) throw error
      },

      async verifyEmailOtp({ email, token, purpose }) {
        if (!supabase) throw new Error('Supabase is not configured.')

        const { data, error } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token,
          type: purpose === 'signup' ? 'signup' : 'email',
        })
        if (error) throw error

        /*
         * A response with no error and no session should not be possible, and
         * that is exactly why it is checked.
         *
         * The failure this guards against is the one the whole brief is about:
         * a success animation playing over a verification that did not produce
         * a session. If Supabase ever answers ambiguously, this turns it into a
         * failure rather than into a green tick, because under-granting is
         * recoverable and over-granting is not.
         */
        if (!data.session) {
          throw new Error('The code was accepted but no session was issued. Try signing in.')
        }

        /*
         * `onAuthStateChange` has already fired for this session and `resolve`
         * is reading the profile. Nothing is returned and nothing is awaited
         * here on purpose: the caller's next step is to show the success state,
         * and the role behind it arrives through the same path every other
         * sign-in uses.
         */
      },

      async signOut() {
        // Ahead of the network call, not after it: from this moment any profile
        // read still in flight belongs to a session that is over, and the
        // generation bump is what stops it landing.
        generation.current++
        setProfile(null)
        setUser(null)
        setRoleError(null)
        setStatus(HAS_BACKEND ? 'guest' : 'unconfigured')
        queryClient.clear()
        if (!supabase) return
        await supabase.auth.signOut()
      },

      async sendPasswordReset(email) {
        if (!supabase) throw new Error('Supabase is not configured.')
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          // From the build's base, not a literal — same reason as
          // `confirmationRedirect` in lib/contribute-intent.ts. BASE_URL is
          // '/elakai/' here and keeps its trailing slash.
          redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}account/login`,
        })
        if (error) throw new Error(error.message)
      },
    }),
    [status, user, profile, roleError, schemaReady, refresh, queryClient],
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
