import { Navigate, useLocation } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'

import { BrandLoader } from '@/components/brand-loader'
import { Button } from '@/components/ui/button'
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
 * Three outcomes, and the middle one is the point:
 *
 *   loading            the role is not known yet. Hold. This used to require a
 *                      second condition — 'contributor' with no profile —
 *                      because the provider reported a provisional role before
 *                      it had read one. It does not any more, so "not known
 *                      yet" is one state with one name.
 *   admin              render.
 *   anything else      turn away — to the contributor dashboard for a signed-in
 *                      contributor, since a real one arriving at /admin is now
 *                      an ordinary event and offering them a login form would
 *                      only invite credentials that do not exist.
 *
 * The fourth case is a signed-in account whose role could not be read at all.
 * That is not "you are not an admin" and it is not silently treated as one: it
 * says so and offers a retry, because turning an administrator away over a
 * dropped request, with no explanation, is the failure this guard was reported
 * for.
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { status, roleError, refresh } = useAccount()
  const location = useLocation()

  if (status === 'loading') return <BrandLoader className="min-h-dvh" />

  if (status === 'admin') return <>{children}</>

  // Signed in, but the role never arrived. Under-granted on purpose — never
  // assume admin on a failure — and reported rather than hidden.
  if (roleError && status === 'contributor') {
    return (
      <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-10">
        <div className="w-full max-w-sm text-center">
          <AlertTriangle className="mx-auto size-8 text-warning" aria-hidden="true" />
          <h1 className="mt-4 text-title">Could not confirm your account</h1>
          <p className="mt-2 text-body-sm text-ink-muted">{roleError}</p>
          <p className="mt-1 text-meta text-ink-subtle">
            Administrator access needs your profile, and it did not load. Nothing
            has changed about your account.
          </p>
          <Button className="mt-5" size="lg" block onClick={() => void refresh()}>
            Try again
          </Button>
        </div>
      </main>
    )
  }

  if (status === 'contributor') return <Navigate to="/contribute" replace />

  // `from` survives the round trip so a bookmarked deep link still lands where
  // it was pointed after signing in.
  return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
}
