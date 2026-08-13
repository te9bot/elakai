import { Navigate, useLocation } from 'react-router-dom'
import { BrandLoader } from '@/components/brand-loader'
import { useAdminAuth } from '@/lib/auth'

/**
 * Route guard for /admin/*.
 *
 * This keeps the wrong screen from rendering; it is not what keeps data safe.
 * Anyone can edit their way past a client-side check, so the guarantee lives in
 * Postgres: the RLS policies in supabase/migrations/0002_rls.sql refuse every
 * write, and every draft read, that does not come from an active admin.
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { status } = useAdminAuth()
  const location = useLocation()

  if (status === 'loading') return <BrandLoader className="min-h-dvh" />

  if (status !== 'admin') {
    // `from` survives the round trip so a bookmarked deep link still lands
    // where it was pointed after signing in.
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
