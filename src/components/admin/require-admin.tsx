import { Navigate, useLocation } from 'react-router-dom'
import { BrandLoader } from '@/components/brand-loader'
import { useAccount } from '@/lib/auth'

/**
 * Route guard for /admin/*.
 *
 * This keeps the wrong screen from rendering; it is not what keeps data safe.
 * Anyone can edit their way past a client-side check, so the guarantee lives in
 * Postgres: the policies in supabase/migrations/0008_contributors.sql refuse
 * every write, and every unpublished read, that does not come from an account
 * whose `profiles.role` is 'admin' — and both moderation RPCs check the same
 * thing again before they touch anything.
 *
 * A signed-in contributor who reaches a /admin URL is a normal event now that
 * ordinary people hold accounts, so they are sent to their own dashboard rather
 * than to the admin login form, which would only invite them to try again with
 * credentials that do not exist.
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { status, profile } = useAccount()
  const location = useLocation()

  if (status === 'loading') return <BrandLoader className="min-h-dvh" />

  /*
   * 'contributor' with no profile yet is not an answer, it is a placeholder.
   *
   * `AccountProvider` settles on 'contributor' as soon as it holds a session,
   * before the profile read that decides the role has come back — that is what
   * stops a slow query stranding someone on the login page. The cost is that
   * this guard can see 'contributor' for an account that is about to resolve as
   * an admin, and redirecting on it would bounce a real admin off /admin a
   * moment before their role arrived.
   *
   * `profile` is null until that read completes and non-null forever after, so
   * it is exactly the "do we actually know yet" signal. Hold the loader until
   * it does.
   */
  if (status === 'contributor' && !profile) return <BrandLoader className="min-h-dvh" />

  if (status === 'contributor') return <Navigate to="/contribute" replace />

  if (status !== 'admin') {
    // `from` survives the round trip so a bookmarked deep link still lands
    // where it was pointed after signing in.
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
