import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { useAccount } from '@/lib/auth'
import { authProviders, type AuthProviders, type SocialProvider } from '@/lib/auth-providers'
import { confirmationRedirect, rememberIntent, type ContributeIntent } from '@/lib/contribute-intent'
import { cn } from '@/lib/utils'

/* ==========================================================================
 * Continue with Google / Continue with Facebook.
 *
 * WHAT RENDERS HERE DEPENDS ON THE DASHBOARD, NOT ON THIS FILE
 *
 * The buttons come from `authProviders()`, which asks the project which
 * providers are actually configured. Neither is enabled on this project today,
 * so today this component renders nothing at all and the email form is the
 * whole screen. Enable Google in the Supabase dashboard and the button appears
 * on the next page load — no redeploy, no code change, and no possibility of a
 * button that leads to `provider is not enabled`.
 *
 * ON THE LOGOS
 *
 * Google's and Facebook's marks are drawn inline as SVG in their own official
 * colours, because both companies' brand guidelines require their own mark on
 * their own button and forbid recolouring it. That is the one place on these
 * screens where a colour outside the ELAKAI palette is correct: the button is
 * ELAKAI's — its shape, height, radius, border and type are the site's own
 * secondary button — and only the 18px mark inside it belongs to them.
 *
 * They are inlined rather than fetched because the whole site is a static
 * bundle served from GitHub Pages, and two network requests to a CDN on the
 * sign-in screen would be two more things to be slow or blocked.
 * ========================================================================== */

export function SocialSignIn({
  intent,
  /** Wording differs between the two screens: "Sign in with" vs "Sign up with". */
  verb = 'Continue',
  disabled = false,
}: {
  intent: ContributeIntent | null
  verb?: string
  disabled?: boolean
}) {
  const { signInWithProvider } = useAccount()
  const [providers, setProviders] = useState<AuthProviders | null>(null)
  const [busy, setBusy] = useState<SocialProvider | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void authProviders().then((p) => {
      if (!cancelled) setProviders(p)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const available = (['google', 'facebook'] as const).filter((p) => providers?.[p])

  // Nothing to show: either the answer has not arrived, or neither provider is
  // configured. Rendering a skeleton for something that is usually absent would
  // put a flicker on every sign-in screen for no gain.
  if (!providers?.resolved || available.length === 0) return null

  async function start(provider: SocialProvider) {
    if (busy) return
    setBusy(provider)
    setError(null)
    try {
      /*
       * Written down before leaving, for the same reason signup does it: the
       * OAuth round-trip navigates the whole page away to another origin and
       * back, so nothing held in memory survives. The copy in `redirectTo`
       * usually does the work; the stored copy is the backstop for a provider
       * that drops the query string.
       */
      if (intent) rememberIntent(intent)
      await signInWithProvider(provider, confirmationRedirect(intent))
      // Not reached in the success case — the browser is already navigating.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That sign-in could not be started.')
      setBusy(null)
    }
  }

  return (
    <div className="space-y-3">
      {available.map((provider) => (
        <button
          key={provider}
          type="button"
          disabled={disabled || busy !== null}
          onClick={() => void start(provider)}
          className={cn(
            'flex h-12 w-full items-center justify-center gap-3 rounded-control',
            'border border-line bg-surface text-body-sm font-semibold text-ink shadow-card',
            'transition-colors hover:bg-surface-2',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            'focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
            'disabled:pointer-events-none disabled:opacity-50',
          )}
        >
          {busy === provider ? (
            <Loader2 className="size-[18px] animate-spin" aria-hidden="true" />
          ) : provider === 'google' ? (
            <GoogleMark />
          ) : (
            <FacebookMark />
          )}
          {busy === provider
            ? 'Redirecting…'
            : `${verb} with ${provider === 'google' ? 'Google' : 'Facebook'}`}
        </button>
      ))}

      {error && (
        <p role="alert" className="text-meta font-semibold text-danger">
          {error}
        </p>
      )}

      <Divider />
    </div>
  )
}

/**
 * "or" between the social buttons and the email form.
 *
 * A hairline with a word in it rather than a gap, because a gap does not say
 * that the two halves are alternatives — it reads as two unrelated sections and
 * people fill in the form underneath a button they have already pressed.
 */
function Divider() {
  return (
    <div className="flex items-center gap-3 pt-1" aria-hidden="true">
      <span className="h-px flex-1 bg-line" />
      <span className="text-micro font-bold uppercase tracking-wide text-ink-subtle">or</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Marks                                                               */
/* ------------------------------------------------------------------ */

/**
 * Both are `aria-hidden`: the button's own text already names the provider, so
 * announcing the mark as well would read "Google Continue with Google".
 */
function GoogleMark() {
  return (
    <svg
      className="size-[18px] shrink-0"
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

function FacebookMark() {
  return (
    <svg
      className="size-[18px] shrink-0"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#1877F2"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"
      />
    </svg>
  )
}
