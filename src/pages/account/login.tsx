import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react'

import {
  AuthShell,
  describedBy,
  Field,
  FormNotice,
} from '@/components/account/auth-shell'
import { SignInTransition } from '@/components/account/sign-in-transition'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAccount } from '@/lib/auth'
import {
  intentFromSearch,
  intentToPath,
  takeIntent,
  type ContributeIntent,
} from '@/lib/contribute-intent'
import { cn } from '@/lib/utils'

/**
 * Contributor sign-in.
 *
 * The public front door. /admin/login is the staff entrance and stays as it is
 * — plain, no signup path, no transition. Both produce the same Supabase
 * session; `profiles.role` is what separates what happens next.
 */
export default function AccountLoginPage() {
  const { status, signIn, sendPasswordReset, schemaReady } = useAccount()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [reveal, setReveal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [resetSent, setResetSent] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  /**
   * Held rather than acted on immediately.
   *
   * Supabase reports the session before the profile has been read, so
   * navigating the instant `signIn` resolves would land on the dashboard while
   * the role is still unknown. Instead the transition plays, and it is the
   * transition finishing that navigates — which is also the moment the profile
   * query has had a second to complete.
   */
  const [entering, setEntering] = useState(false)

  /*
   * Where to go afterwards, in priority order:
   *
   *   1. `?next=` on this URL — a direct "sign in and then do X" link.
   *   2. The stored intent — what they clicked before being asked to sign in.
   *   3. The dashboard.
   */
  const [intent] = useState<ContributeIntent | null>(() => intentFromSearch(location.search))

  const destination = useCallback((): string => {
    if (intent) return intentToPath(intent)
    const stored = takeIntent()
    if (stored) return intentToPath(stored)
    return '/contribute'
  }, [intent])

  // Somebody who is already signed in and lands here — a bookmark, a back
  // button — is sent on rather than shown a form they do not need.
  const signedIn = status === 'contributor' || status === 'admin'

  useEffect(() => {
    if (signedIn && !entering && !busy) {
      // Nothing to animate: they did not just sign in, they already were.
      navigate(destination(), { replace: true })
    }
  }, [signedIn, entering, busy, navigate, destination])

  if (status === 'unconfigured') {
    return (
      <AuthShell title="Sign in" subtitle="Accounts are not available on this build.">
        <FormNotice tone="warning">
          No backend is configured for this site, so there is nothing to sign in
          to. Everything you can read without an account still works.
        </FormNotice>
      </AuthShell>
    )
  }

  if (entering) {
    return <SignInTransition onDone={() => navigate(destination(), { replace: true })} />
  }

  if (signedIn) return <Navigate to={destination()} replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await signIn(email, password)
      setEntering(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed'
      /*
       * "Those details did not match" covers both a wrong password and an
       * account that does not exist, deliberately. Distinguishing them is an
       * account-enumeration oracle — it tells anyone with a list of email
       * addresses which of them are registered here — and the person actually
       * typing cannot do anything different with the distinction anyway.
       *
       * Unconfirmed email is different: it is actionable, and saying so is not
       * a leak, because the person already knows they signed up.
       */
      if (/email not confirmed|not confirmed/i.test(message)) {
        setError(
          'This account still needs to be confirmed. Check your inbox for the link we sent.',
        )
      } else if (/invalid|credentials|password/i.test(message)) {
        setError('Those details did not match an account.')
      } else {
        setError(message)
      }
      setBusy(false)
    }
  }

  async function forgot() {
    setResetError(null)
    if (!email.trim()) {
      setResetError('Enter your email address first, then choose this again.')
      return
    }
    try {
      await sendPasswordReset(email)
      setResetSent(true)
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Could not send the reset email.')
    }
  }

  const signupHref = intent
    ? `/account/signup?${new URLSearchParams({
        next: intent.path,
        ...(intent.section ? { section: intent.section } : {}),
        ...(intent.category ? { category: intent.category } : {}),
      }).toString()}`
    : '/account/signup'

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to submit information and track your contributions."
      footer={
        <>
          New to ELAKAI?{' '}
          <Link
            to={signupHref}
            className="font-bold text-primary underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      {!schemaReady && (
        <div className="mb-5">
          <FormNotice tone="warning">
            Contributions are not switched on for this site yet. You can still
            sign in, but there is nowhere to submit information to.
          </FormNotice>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field id="login-email" label="Email">
          <Input
            id="login-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
          />
        </Field>

        <Field id="login-password" label="Password">
          <div className="relative">
            <Input
              id="login-password"
              type={reveal ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              aria-describedby={describedBy('login-password')}
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              aria-label={reveal ? 'Hide password' : 'Show password'}
              aria-pressed={reveal}
              className={cn(
                'absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-control',
                'text-ink-subtle transition-colors hover:text-ink',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              )}
            >
              {reveal ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
            </button>
          </div>
        </Field>

        {error && <FormNotice tone="danger">{error}</FormNotice>}

        {resetSent ? (
          <FormNotice tone="success">
            If that address has an account, a reset link is on its way to it.
          </FormNotice>
        ) : (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void forgot()}
              className="rounded-control px-1 py-0.5 text-meta font-semibold text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Forgot your password?
            </button>
          </div>
        )}

        {resetError && <FormNotice tone="danger">{resetError}</FormNotice>}

        {/* Disabled while busy, which is also what stops a double submit
            producing two sign-in requests. §60. */}
        <Button type="submit" size="lg" block disabled={busy}>
          {busy ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <LogIn aria-hidden="true" />
          )}
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthShell>
  )
}
