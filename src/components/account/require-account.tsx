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
