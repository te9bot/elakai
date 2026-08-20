import { useCallback, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, UserPlus } from 'lucide-react'

import {
  AuthShell,
  describedBy,
  Field,
  FormNotice,
} from '@/components/account/auth-shell'
import { OtpVerify } from '@/components/account/otp-verify'
import { PasswordRequirements } from '@/components/account/password-requirements'
import { SignInTransition } from '@/components/account/sign-in-transition'
import { SocialSignIn } from '@/components/account/social-sign-in'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAccount } from '@/lib/auth'
import { evaluatePassword, PASSWORD_HINT, passwordProblem } from '@/lib/password'
import {
  confirmationRedirect,
  intentFromSearch,
  intentToPath,
  rememberIntent,
  takeIntent,
  type ContributeIntent,
} from '@/lib/contribute-intent'
import { categoryLabel, sectionSpec, withArticle } from '@/lib/submission-fields'
import { cn } from '@/lib/utils'

/* ==========================================================================
 * Create an account.
 *
 * Four fields, and no more. A contributor's name is the only thing this system
 * needs that Supabase Auth does not already hold — everything else about them
 * (points, contribution history, role) is produced by using the site, not by
 * filling in a form before using it.
 *
 * Note what is not asked for and cannot be sent: a role. `signUp` passes
 * `{ full_name }` and nothing else as user metadata, and the trigger that
 * creates the profile reads only that. See §7 and §43.
 * ========================================================================== */

/*
 * The password rules moved to src/lib/password.ts.
 *
 * They used to be eight lines here with an argument above them for why eight
 * characters is the only rule and a character-class checklist is a trap. That
 * argument is intact and now lives beside the rules it describes — along with
 * the distinction that resolves it against §40: eight characters is REQUIRED
 * and blocks this form, and the letters/numbers/symbols mix is RECOMMENDED and
 * never blocks anything. The panel under the field shows both, and shows which
 * is which.
 */

/** Deliberately permissive: the code we email is the real check. */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
}

export default function AccountSignupPage() {
  const { status, signUp, schemaReady, verifyEmailOtp, resendSignupOtp } = useAccount()
  const navigate = useNavigate()
  const location = useLocation()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [reveal, setReveal] = useState(false)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [entering, setEntering] = useState(false)

  const [intent] = useState<ContributeIntent | null>(() => intentFromSearch(location.search))

  const destination = useCallback((): string => {
    if (intent) return intentToPath(intent)
    const stored = takeIntent()
    if (stored) return intentToPath(stored)
    return '/contribute'
  }, [intent])

  /**
   * "Create a free account to add a pharmacy" reads as a reason. "Create a free
   * account" reads as a toll. When the visitor arrived from a specific action,
   * the subtitle says which one.
   */
  const subtitle = useMemo(() => {
    if (!intent?.section && !intent?.category) {
      return 'Free, and only needed to contribute. Reading ELAKAI never requires one.'
    }
    // The category is the more specific and more natural phrase when the link
    // carried one — "adding a pharmacy" rather than "adding a healthcare place".
    const what = intent.category
      ? withArticle(categoryLabel(intent.category).toLowerCase())
      : sectionSpec(intent.section!).addPhrase
    return `Free to join. You are one step away from adding ${what}.`
  }, [intent])

  /*
   * Recomputed on every keystroke, which is the point — §41 asks for the panel
   * to update as the person types. It is five regex tests over a string that is
   * almost never longer than thirty characters, so there is nothing here worth
   * debouncing; a debounce would only make the ticks lag behind the typing.
   */
  const evaluation = useMemo(() => evaluatePassword(password), [password])

  const signedIn = status === 'contributor' || status === 'admin'

  if (status === 'unconfigured') {
    return (
      <AuthShell title="Create an account" subtitle="Accounts are not available on this build.">
        <FormNotice tone="warning">
          No backend is configured for this site. Everything you can read without
          an account still works.
        </FormNotice>
      </AuthShell>
    )
  }

  if (entering) {
    return (
      <SignInTransition
        label="Setting up your account"
        onDone={() => navigate(destination(), { replace: true })}
      />
    )
  }

  if (signedIn && !sentTo) return <Navigate to={destination()} replace />

  /*
   * The verification step.
   *
   * WHAT HAS AND HAS NOT HAPPENED BY THE TIME THIS RENDERS
   *
   * Supabase has created an `auth.users` row and the trigger from migration
   * 0008 has created its profile. That is not the same as an account, and this
   * screen is careful not to call it one: there is no session, `signIn` would
   * be refused with "email not confirmed", and migration 0013 makes
   * `is_email_verified()` — which reads `auth.users.email_confirmed_at` — a
   * precondition on every policy that creates content. So the row exists and
   * can do nothing at all until the code below is accepted.
   *
   * That is §23's "OTP sent does NOT mean OTP verified" enforced in Postgres
   * rather than promised in a comment. The registration completes when
   * `verifyEmailOtp` resolves, and at no other moment.
   *
   * The emailed link still works, for anyone who prefers it or who opens the
   * mail on another device — `signUp` still passes `emailRedirectTo` and
   * /account/callback still handles it. This is a second door, not a
   * replacement for the first.
   */
  if (sentTo) {
    return (
      <AuthShell
        title="Confirm your email"
        subtitle="One code, and your account is ready."
        footer={
          <>
            Wrong address?{' '}
            <button
              type="button"
              onClick={() => setSentTo(null)}
              className="font-bold text-primary underline-offset-4 hover:underline"
            >
              Start again
            </button>
          </>
        }
      >
        <OtpVerify
          email={sentTo}
          onVerify={(token) =>
            verifyEmailOtp({ email: sentTo, token, purpose: 'signup' })
          }
          onResend={() => resendSignupOtp(sentTo)}
          successMessage="Your account is ready."
          continueLabel={intent ? 'Continue where you left off' : 'Go to your dashboard'}
          /*
           * The same transition every other way in uses. It is not a delay
           * dressed up as one: `verifyEmailOtp` has already produced a session
           * and `onAuthStateChange` is reading the role behind it, and this is
           * where that read is spent rather than on a blank screen.
           */
          onContinue={() => setEntering(true)}
        />

        <p className="mt-6 text-center text-meta text-ink-subtle">
          Nothing yet? Check the spam folder — the message comes from Supabase
          on behalf of ELAKAI. The link in it works too.
        </p>

        <div className="mt-4">
          <Button variant="ghost" size="sm" block asChild>
            <Link to="/">Continue browsing ELAKAI</Link>
          </Button>
        </div>
      </AuthShell>
    )
  }

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!fullName.trim()) next.name = 'Tell us what to call you.'
    if (!looksLikeEmail(email)) next.email = 'That does not look like an email address.'

    const problem = passwordProblem(password)
    if (problem) next.password = problem
    // Only complain about the confirmation once the password itself is valid,
    // or a short password produces two errors for one mistake.
    else if (password !== confirm) next.confirm = 'The two passwords do not match.'

    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setError(null)
    if (!validate()) return

    setBusy(true)
    try {
      // Written down before the request, not after: the confirmation link may
      // be opened in another browser entirely, and the copy that travels in the
      // URL is the one that survives that. See lib/contribute-intent.ts.
      if (intent) rememberIntent(intent)

      const { needsConfirmation } = await signUp({
        fullName,
        email,
        password,
        redirectTo: confirmationRedirect(intent),
      })

      if (needsConfirmation) setSentTo(email.trim())
      else setEntering(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create the account.'
      /*
       * "Already registered" is one of the few places where saying so is the
       * right call. Supabase itself returns it, the person is standing in front
       * of a signup form they cannot complete, and the alternative — a vague
       * failure — leaves them retrying with the same address forever. The
       * enumeration concern that shapes the login error does not outweigh
       * being unable to sign up.
       */
      if (/already registered|already exists|user already/i.test(message)) {
        setError('An account already uses that email address. Try signing in instead.')
      } else if (/password/i.test(message)) {
        setError(message)
      } else if (/rate limit|too many/i.test(message)) {
        setError('Too many attempts just now. Please wait a minute and try again.')
      } else {
        setError('Could not create the account. Please try again.')
        console.error('[elakai] signup failed:', message)
      }
      setBusy(false)
    }
  }

  const loginHref = intent
    ? `/account/login?${new URLSearchParams({
        next: intent.path,
        ...(intent.section ? { section: intent.section } : {}),
        ...(intent.category ? { category: intent.category } : {}),
      }).toString()}`
    : '/account/login'

  return (
    <AuthShell
      title="Create your account"
      subtitle={subtitle}
      wide
      footer={
        <>
          Already have an account?{' '}
          <Link
            to={loginHref}
            className="font-bold text-primary underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </>
      }
    >
      {!schemaReady && (
        <div className="mb-5">
          <FormNotice tone="warning">
            Contributions are not switched on for this site yet, so a new account
            has nothing to do here. Reading ELAKAI needs no account at all.
          </FormNotice>
        </div>
      )}

      {/*
       * Social sign-up skips the confirmation email entirely — the provider has
       * already verified the address — so on this screen it is not merely
       * shorter, it is a different and much better journey: one tap and
       * straight into the form they were trying to reach, with no detour
       * through a mail client. Renders nothing when neither is configured.
       */}
      <div className="mb-5">
        <SocialSignIn intent={intent} verb="Sign up" disabled={busy} />
      </div>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field id="signup-name" label="Full name" error={fieldErrors.name}>
          <Input
            id="signup-name"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={busy}
            aria-invalid={!!fieldErrors.name}
            aria-describedby={describedBy('signup-name', undefined, fieldErrors.name)}
          />
        </Field>

        <Field id="signup-email" label="Email" error={fieldErrors.email}>
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            aria-invalid={!!fieldErrors.email}
            aria-describedby={describedBy('signup-email', undefined, fieldErrors.email)}
          />
        </Field>

        <Field
          id="signup-password"
          label="Password"
          /*
           * The hint shows until there is something to say about what was
           * actually typed, then the live panel takes over. Both at once is the
           * same advice twice, and the panel is the more useful of the two
           * because it says which half is still missing.
           */
          hint={password ? undefined : PASSWORD_HINT}
          error={fieldErrors.password}
        >
          <div className="relative">
            <Input
              id="signup-password"
              type={reveal ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              aria-invalid={!!fieldErrors.password}
              /*
               * Points at the live panel once it is showing, so a screen reader
               * reading this field also reads which requirements are met —
               * rather than announcing an invalid field with no explanation.
               */
              aria-describedby={
                password
                  ? 'signup-password-rules'
                  : describedBy('signup-password', PASSWORD_HINT, fieldErrors.password)
              }
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

          {/* Only once there is a password to describe. An empty field with
              five grey crosses under it reads as five failures before anybody
              has done anything. */}
          {password && (
            <PasswordRequirements
              id="signup-password-rules"
              evaluation={evaluation}
              className="pt-1"
            />
          )}
        </Field>

        <Field id="signup-confirm" label="Confirm password" error={fieldErrors.confirm}>
          <Input
            id="signup-confirm"
            // Follows the reveal toggle above: hiding one and showing the other
            // makes the "do these match" check impossible to do by eye, which
            // is the only reason this field exists.
            type={reveal ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={busy}
            aria-invalid={!!fieldErrors.confirm}
            aria-describedby={describedBy('signup-confirm', undefined, fieldErrors.confirm)}
          />
        </Field>

        {error && <FormNotice tone="danger">{error}</FormNotice>}

        <Button type="submit" size="lg" block disabled={busy}>
          {busy ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <UserPlus aria-hidden="true" />
          )}
          {busy ? 'Creating your account…' : 'Create account'}
        </Button>

        <p className="text-center text-meta text-ink-subtle">
          Anything you submit is reviewed by an ELAKAI administrator before it
          appears on the site.
        </p>
      </form>
    </AuthShell>
  )
}
