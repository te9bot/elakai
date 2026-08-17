import { Navigate, useLocation } from 'react-router-dom'

import { BrandLoader } from '@/components/brand-loader'
import { useAccount } from '@/lib/auth'
import { rememberIntent } from '@/lib/contribute-intent'

/**
 * Route guard for /contribute/*.
 *
 * Narrow on purpose. This wraps the contributor dashboard and nothing else — no
 * public route is behind it, and adding one would be the login wall §2 of the
 * brief exists to forbid. A guest can read every page on this site; what they
 * cannot do without an account is submit or edit.
 *
 * As with RequireAdmin, this is not the security boundary. It decides which
 * screen renders. `submissions_own_read` and friends in migration 0008 decide
 * what a request can actually see, and they run in Postgres.
 */
export function RequireAccount({ children }: { children: React.ReactNode }) {
  const { status } = useAccount()
  const location = useLocation()

  if (status === 'loading') return <BrandLoader className="min-h-dvh" />

  /*
   * An administrator is not a contributor here.
   *
   * The two dashboards are separate roles rather than separate permissions on
   * one account: /contribute is the contributor's workspace and /admin is the
   * moderation desk, and an admin arriving at the former — by typing the URL,
   * by a stale bookmark, or by pressing Contribute in the header — is sent to
   * their own. The role comes from `profiles.role`, the same column
   * `is_admin()` reads in Postgres; no email is compared anywhere.
   *
   * The cost, stated plainly because it is a real one: an admin account cannot
   * submit a contribution, since the submission form lives under this guard.
   * That is the requested behaviour. Reverting it is deleting this block.
   *
   * Not gated on the profile having loaded, deliberately. `AccountProvider`
   * reports 'contributor' provisionally while the profile read is in flight, so
   * holding here would reintroduce the wait that used to strand people on the
   * login form. An admin who deep-links straight to /contribute may therefore
   * see it for the moment before their role resolves — a flash, on a screen
   * whose data they are allowed to read anyway, rather than a hang for
   * everyone.
   */
  if (status === 'admin') return <Navigate to="/admin" replace />

  if (status === 'guest' || status === 'unconfigured') {
    const next = `${location.pathname}${location.search}`
    const params = new URLSearchParams(location.search)

    /*
     * Stored as well as put in the URL.
     *
     * The URL copy covers the ordinary case: sign in, come straight back. The
     * stored copy is what survives a signup, because that path detours through
     * an email and the browser may not be the same one on the way back. See
     * lib/contribute-intent.ts.
     */
    rememberIntent({
      path: location.pathname,
      section: params.get('section') ?? undefined,
      category: params.get('category') ?? undefined,
    })

    return <Navigate to={`/account/login?next=${encodeURIComponent(next)}`} replace />
  }

  return <>{children}</>
}
