import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react'

import {
  AuthShell,
  describedBy,
  Field,
  FormNotice,
} from '@/components/account/auth-shell'
import { SignInTransition } from '@/components/account/sign-in-transition'
import { SocialSignIn } from '@/components/account/social-sign-in'
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
import { useI18n } from '@/lib/i18n'

/**
 * Contributor sign-in.
 *
 * The public front door. /admin/login is the staff entrance and stays as it is
 * — plain, no signup path, no transition. Both produce the same Supabase
 * session; `profiles.role` is what separates what happens next.
 */
export default function AccountLoginPage() {
  const { status, signIn, sendPasswordReset, schemaReady } = useAccount()
  const { t } = useI18n()
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
   * query has usually completed.
   */
  const [entering, setEntering] = useState(false)

  /** The transition has played out and we are only waiting on the role now. */
  const [transitionDone, setTransitionDone] = useState(false)

  /*
   * Where to go afterwards, in priority order:
   *
   *   1. `?next=` on this URL — a direct "sign in and then do X" link.
   *   2. The stored intent — what they clicked before being asked to sign in.
   *   3. The dashboard.
   */
  const [intent] = useState<ContributeIntent | null>(() => intentFromSearch(location.search))

  /*
   * The stored intent, taken at most once.
   *
   * `takeIntent()` is a *consuming* read — it removes what it returns. This
   * function is called from two effects and, at the bottom of this component,
   * during render. So the first call took the intent and every later call saw
   * an empty store and fell through to the role default below. Which of those
   * two answers won was a matter of which call happened to run first, and under
   * StrictMode the render path runs twice on its own.
   *
   * That is one of the ways somebody lands on the wrong dashboard: the intent
   * is consumed by a render that never navigates, and the navigation that
   * follows routes by role instead of by what the person actually clicked.
   *
   * Memoised in a ref rather than resolved at mount, because taking it at mount
   * would throw the intent away for anyone who opens the sign-in page and
   * leaves without signing in.
   */
  const stored = useRef<string | null | undefined>(undefined)

  const destination = useCallback((): string => {
    if (intent) return intentToPath(intent)
    if (stored.current === undefined) {
      const taken = takeIntent()
      stored.current = taken ? intentToPath(taken) : null
    }
    if (stored.current) return stored.current
    /*
     * The default lands on the dashboard the account actually has.
     *
     * This returned '/contribute' for everybody, so an administrator signing in
     * at the public front door was always dropped on the contributor dashboard
     * — the admin panel was only reachable by typing /admin. An explicit intent
     * still wins: an admin who pressed "Add a pharmacy" wanted the submission
     * form, not the moderation queue.
     */
    return status === 'admin' ? '/admin' : '/contribute'
  }, [intent, status])

  /*
   * Signed in — and, because 'contributor' and 'admin' are only ever set after
   * `profiles.role` has been read, signed in *as a known role*.
   *
   * This used to need a second signal (`profile !== null`) and a four-second
   * ceiling on top of it, because the provider reported a provisional role
   * while the read was in flight and the ceiling was what stopped a slow query
   * stranding anyone on this form. Both are gone: the wait now lives in
   * lib/auth.tsx, is bounded there, and always settles — so this screen can
   * simply act on the status it is given.
   */
  const signedIn = status === 'contributor' || status === 'admin'

  useEffect(() => {
    if (signedIn && !entering && !busy) {
      // Nothing to animate: they did not just sign in, they already were.
      navigate(destination(), { replace: true })
    }
  }, [signedIn, entering, busy, navigate, destination])

  // The transition finished before the role arrived. Leave the moment it does.
  useEffect(() => {
    if (transitionDone && signedIn) navigate(destination(), { replace: true })
  }, [transitionDone, signedIn, navigate, destination])

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

  /*
   * The transition finishing is not the same as being ready to leave.
   *
   * It runs ~700ms; the profile read usually lands well inside that, in which
   * case nothing waits. When it does not, holding on the final frame of an
   * animation that is already playing is the right place to spend the time —
   * the alternative is navigating on a role nobody has read yet and putting an
   * admin on the contributor dashboard, which is what used to happen.
   */
  if (entering) {
    return (
      <SignInTransition
        onDone={() => {
          if (signedIn) {
            navigate(destination(), { replace: true })
            return
          }
          setTransitionDone(true)
        }}
      />
    )
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
      title={t('auth.welcome')}
      subtitle={t('auth.welcomeSub')}
      footer={
        <>
          {t('auth.newHere')}{' '}
          <Link
            to={signupHref}
            className="font-bold text-primary underline-offset-4 hover:underline"
          >
            {t('auth.createAccount')}
          </Link>
        </>
      }
    >
      {!schemaReady && (
        <div className="mb-5">
          <FormNotice tone="warning">{t('auth.notOpen')}</FormNotice>
        </div>
      )}

      {/* Above the form, not below it: a social button is one tap and the form
          is four fields, so offering the short path second means most people
          have already started typing before they see it. Renders nothing at all
          when neither provider is configured. */}
      <div className="mb-5">
        <SocialSignIn intent={intent} verb={t('auth.signIn')} disabled={busy} />
      </div>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field id="login-email" label={t('auth.email')}>
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

        <Field id="login-password" label={t('auth.password')}>
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
              aria-label={reveal ? t('auth.hidePassword') : t('auth.showPassword')}
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
          <FormNotice tone="success">{t('auth.resetSent')}</FormNotice>
        ) : (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void forgot()}
              /*
               * `-my-1.5 py-2` rather than `py-0.5`: the tap area grows to
               * about 35px while the negative margin gives the extra height
               * back to the layout, so this row is the same size it was and the
               * thumb has something to hit. At 23px it was under the 24px
               * minimum in WCAG 2.5.8, and unlike "Create an account" below —
               * which sits inside a sentence and is therefore exempt as an
               * inline target — this is a standalone control with no exception
               * to lean on.
               */
              className="-my-1.5 rounded-control px-1 py-2 text-meta font-semibold text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t('auth.forgot')}
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
          {busy ? t('auth.signingIn') : t('auth.signIn')}
        </Button>
      </form>
    </AuthShell>
  )
}
