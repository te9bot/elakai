import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'

import { AuthShell, FormNotice } from '@/components/account/auth-shell'
import { SignInTransition } from '@/components/account/sign-in-transition'
import { Button } from '@/components/ui/button'
import { BrandLoader } from '@/components/brand-loader'
import { useAccount } from '@/lib/auth'
import {
  intentFromSearch,
  intentToPath,
  takeIntent,
} from '@/lib/contribute-intent'

/* ==========================================================================
 * Where the confirmation link lands.
 *
 * The Supabase client is configured with `detectSessionInUrl: true` (see
 * lib/supabase.ts), so by the time this component has anything to do the token
 * in the URL fragment has already been exchanged for a session and the fragment
 * stripped. There is nothing for this page to parse.
 *
 * What it is actually for is the other half of §5: finishing the thing the
 * visitor started before they were asked to make an account. The intent arrives
 * two ways and either will do —
 *
 *   * in this page's own query string, put there by `confirmationRedirect` when
 *     the account was created. This is the copy that survives the email being
 *     opened in a different browser.
 *   * in localStorage, from `rememberIntent`. This is the copy that covers a
 *     plain sign-in, where there is no email and no redirect URL.
 *
 * If neither is there, the dashboard is the right answer: they confirmed an
 * account, so that is where an account lives.
 * ========================================================================== */

/**
 * How long to wait for a session before calling the link dead.
 *
 * Generous, because this is running on the far side of an email client on a
 * phone that may be on a slow connection, and the failure mode of being too
 * impatient — telling someone their valid link expired — is much worse than
 * three extra seconds of a spinner.
 */
const GIVE_UP_MS = 8000

export default function AccountCallbackPage() {
  const { status } = useAccount()
  const navigate = useNavigate()
  const location = useLocation()

  const [timedOut, setTimedOut] = useState(false)
  const [entering, setEntering] = useState(false)

  /*
   * Supabase reports a failed link — expired, already used, tampered with — in
   * the URL fragment rather than as a thrown error, and the client strips the
   * fragment as it processes it. So it is read once, synchronously, on the
   * first render, before anything has had a chance to clear it.
   */
  const [linkError] = useState<string | null>(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const query = new URLSearchParams(window.location.search)
    const code = hash.get('error_code') ?? query.get('error_code')
    const description = hash.get('error_description') ?? query.get('error_description')
    if (!code && !description) return null
    if (/expired/i.test(`${code} ${description}`)) {
      return 'That confirmation link has expired. Sign in to have a new one sent.'
    }
    return 'That confirmation link could not be used. It may already have been opened.'
  })

  useEffect(() => {
    if (linkError) return
    const timer = window.setTimeout(() => setTimedOut(true), GIVE_UP_MS)
    return () => window.clearTimeout(timer)
  }, [linkError])

  const signedIn = status === 'contributor' || status === 'admin'

  useEffect(() => {
    if (signedIn) setEntering(true)
  }, [signedIn])

  if (linkError) {
    return (
      <AuthShell title="That link did not work" backLabel="Back to ELAKAI">
        <div className="space-y-4">
          <FormNotice tone="danger">
            <span className="flex items-start gap-2.5">
              <AlertTriangle className="mt-px size-4 shrink-0" aria-hidden="true" />
              <span>{linkError}</span>
            </span>
          </FormNotice>
          <Button size="lg" block asChild>
            <Link to="/account/login">Go to sign in</Link>
          </Button>
        </div>
      </AuthShell>
    )
  }

  if (entering) {
    return (
      <SignInTransition
        label="Finishing up"
        onDone={() => {
          const fromUrl = intentFromSearch(location.search)
          const stored = takeIntent()
          const intent = fromUrl ?? stored
          navigate(intent ? intentToPath(intent) : '/contribute', { replace: true })
        }}
      />
    )
  }

  if (timedOut) {
    return (
      <AuthShell
        title="Still not signed in"
        subtitle="The link may have already been used, or the session did not come through."
        backLabel="Back to ELAKAI"
      >
        <Button size="lg" block asChild>
          <Link to="/account/login">Go to sign in</Link>
        </Button>
      </AuthShell>
    )
  }

  return <BrandLoader className="min-h-dvh" />
}
