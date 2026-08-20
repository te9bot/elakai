import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, KeyRound, Loader2, LogIn } from 'lucide-react'

import {
  AuthShell,
  describedBy,
  Field,
  FormNotice,
} from '@/components/account/auth-shell'
import { OtpVerify } from '@/components/account/otp-verify'
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
import { classifySendError } from '@/lib/otp'
import { cn } from '@/lib/utils'

/**
 * Contributor sign-in.
 *
 * The public front door. /admin/login is the staff entrance and stays as it is
 * — plain, no signup path, no transition. Both produce the same Supabase
 * session; `profiles.role` is what separates what happens next.
 */
export default function AccountLoginPage() {
  const {
    status,
    signIn,
    sendPasswordReset,
    schemaReady,
    sendLoginOtp,
    verifyEmailOtp,
  } = useAccount()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [reveal, setReveal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * The address a code has actually been sent to, or null for the password form.
   *
   * Held as the address rather than as a boolean so the OTP screen verifies
   * against exactly the string that was sent to, not against whatever the email
   * field contains by then — Supabase matches the code to an address, and a
   * half-corrected typo in the field would fail a perfectly good code.
   */
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null)

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
    /*
     * `!codeSentTo` is what keeps the code screen on screen after it succeeds.
     *
     * A verified OTP produces a session, which flips `signedIn`, which would
     * otherwise navigate away mid-checkmark — the person would see a green tick
     * for one frame and never reach the Continue button §35 asks for. The
     * screen owns the exit while it is up, and hands it back by clearing this.
     */
    if (signedIn && !entering && !busy && !codeSentTo) {
      // Nothing to animate: they did not just sign in, they already were.
      navigate(destination(), { replace: true })
    }
  }, [signedIn, entering, busy, codeSentTo, navigate, destination])

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

  /*
   * §25 — sign in with a code instead of a password.
   *
   * Same shell, same component, same rules as the signup screen: the code goes
   * to Supabase, Supabase answers, and a session is the only thing that opens
   * the door. The frontend never decides whether the code was right.
   */
  if (codeSentTo) {
    return (
      <AuthShell
        title="Check your email"
        subtitle="We sent you a sign-in code."
        footer={
          <>
            Rather use your password?{' '}
            <button
              type="button"
              onClick={() => {
                setCodeSentTo(null)
                setError(null)
              }}
              className="font-bold text-primary underline-offset-4 hover:underline"
            >
              Go back
            </button>
          </>
        }
      >
        <OtpVerify
          email={codeSentTo}
          onVerify={(token) => verifyEmailOtp({ email: codeSentTo, token, purpose: 'login' })}
          onResend={() => sendLoginOtp(codeSentTo)}
          successMessage="Signed in."
          continueLabel="Continue"
          onContinue={() => {
            // Cleared first so the effect above is free to route once the
            // transition finishes, exactly as it does after a password sign-in.
            setCodeSentTo(null)
            setEntering(true)
          }}
        />
      </AuthShell>
    )
  }

  if (signedIn) return <Navigate to={destination()} replace />

  /**
   * Sends a sign-in code.
   *
   * `sendLoginOtp` passes `shouldCreateUser: false`, so an address with no
   * account is refused by Supabase — and this deliberately does not say so. The
   * screen reports the same thing either way, for the same reason the password
   * failure below is deliberately vague: a login form that distinguishes
   * "wrong password" from "no such account" is a list of which addresses are
   * registered here, free to anybody with a script.
   *
   * The cost is real and is accepted: somebody who mistypes their address waits
   * for an email that never comes. The resend line on the next screen and the
   * "Go back" link in its footer are what that person needs, and both are
   * there.
   */
  async function emailCode() {
    const address = email.trim()
    if (busy) return
    setError(null)
    if (!address) {
      setError('Enter your email address first.')
      return
    }

    setBusy(true)
    try {
      await sendLoginOtp(address)
      setCodeSentTo(address)
    } catch (err) {
      const { failure } = classifySendError(err)

      /*
       * An unknown address advances to the code screen anyway.
       *
       * Supabase refuses `shouldCreateUser: false` for an address it has never
       * seen, and it refuses it distinctively — `otp_disabled`, "Signups not
       * allowed for otp". Reporting that faithfully would be the enumeration
       * oracle this whole screen is written to avoid, and reporting it as "not
       * switched on for this site" would be both an oracle and untrue.
       *
       * So the screen behaves identically either way: a code was requested,
       * here is where to type it. The address that has an account gets an
       * email. The one that does not gets nothing, and the person finds their
       * way out through "Go back" in the footer — which is the same bargain the
       * password reset above already makes with "If that address has an
       * account…".
       *
       * `send_failed` is the classifier's default, so this branch also absorbs
       * anything unrecognised. That is deliberate: an unrecognised auth error
       * is exactly the kind whose text should not be shown on a login form.
       */
      if (failure === 'send_failed') {
        setCodeSentTo(address)
      } else {
        /*
         * Rate limiting and network failures are said out loud. Neither reveals
         * anything about the address — one is about this browser's recent
         * behaviour and the other is about the connection — and staying silent
         * about either leaves somebody pressing a button that has quietly
         * stopped working.
         */
        setError(classifySendError(err).message)
      }
    } finally {
      setBusy(false)
    }
  }

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

      {/* Above the form, not below it: a social button is one tap and the form
          is four fields, so offering the short path second means most people
          have already started typing before they see it. Renders nothing at all
          when neither provider is configured. */}
      <div className="mb-5">
        <SocialSignIn intent={intent} verb="Sign in" disabled={busy} />
      </div>

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

        {/*
         * §25, offered below the password rather than beside it.
         *
         * A code is the better path for somebody who cannot remember a password
         * on a phone, and the worse path for somebody who has one saved — which
         * is most people arriving here. So it is present, plainly labelled, and
         * second. `type="button"` matters: inside a form, a bare button submits
         * it, and this one must not.
         *
         * No new furniture — the existing `secondary` variant, the existing
         * icon set, the existing block layout.
         */}
        <Button
          type="button"
          variant="secondary"
          size="lg"
          block
          disabled={busy}
          onClick={() => void emailCode()}
        >
          <KeyRound aria-hidden="true" />
          Email me a sign-in code
        </Button>
      </form>
    </AuthShell>
  )
}
