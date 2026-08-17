import { useCallback, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, MailCheck, UserPlus } from 'lucide-react'

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

/**
 * Eight characters, and that is the whole rule.
 *
 * Deliberately not a character-class checklist. Requiring an uppercase, a digit
 * and a symbol reliably produces `Password1!` — it moves people toward short
 * passwords that satisfy a regex and away from long ones that do not, which is
 * backwards. Length is the property that actually costs an attacker anything.
 *
 * Supabase's own floor is six. Eight is this form's, checked here so the person
 * is told before the request rather than by a server error afterwards.
 */
const MIN_PASSWORD = 8

function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD) {
    return `Use at least ${MIN_PASSWORD} characters.`
  }
  return null
}

/** Deliberately permissive: the confirmation email is the real check. */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
}

export default function AccountSignupPage() {
  const { status, signUp, schemaReady } = useAccount()
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
   * The confirmation wall.
   *
   * This project requires email confirmation, so a successful signup produces
   * an account and no session. Saying "you're in!" here and navigating to a
   * dashboard would be a lie that resolves into a redirect back to the login
   * form, which is a worse experience than being told the truth.
   */
  if (sentTo) {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`We sent a confirmation link to ${sentTo}.`}
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
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-primary-soft text-primary-ink">
            <MailCheck className="size-6" aria-hidden="true" />
          </span>
          <p className="text-body-sm text-ink-muted">
            Open the link to finish setting up your account. It takes you
            {intent ? ' straight back to what you were adding' : ' straight to your dashboard'}.
          </p>
          <p className="text-meta text-ink-subtle">
            Nothing yet? Check the spam folder — the message comes from Supabase
            on behalf of ELAKAI.
          </p>
          <Button variant="secondary" size="md" block asChild>
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
          hint={`At least ${MIN_PASSWORD} characters. A short phrase works well.`}
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
              aria-describedby={describedBy(
                'signup-password',
                `At least ${MIN_PASSWORD} characters.`,
                fieldErrors.password,
              )}
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
