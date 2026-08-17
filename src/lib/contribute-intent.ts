/* ==========================================================================
 * "You were about to add a pharmacy."
 *
 * THE PROBLEM
 *
 * A guest clicks Add Pharmacy, is asked to make an account, makes one — and
 * then has to go and find Add Pharmacy again. §5 of the brief is that this must
 * not happen, and on most sites it is a one-liner: stash the destination, push
 * it back after login.
 *
 * It is not a one-liner here, because this project requires email confirmation
 * (`mailer_autoconfirm` is false on the Supabase project, verified against
 * /auth/v1/settings). So the sequence is not
 *
 *     click -> sign up -> signed in
 *
 * it is
 *
 *     click -> sign up -> "check your email" -> open mail client ->
 *     click link -> possibly a different tab, possibly a different browser,
 *     possibly tomorrow -> signed in
 *
 * In-memory state does not survive that. Neither does a React route. So the
 * intent is written down twice, in two places with different failure modes, and
 * whichever one survives wins:
 *
 *   1. IN THE CONFIRMATION URL. `emailRedirectTo` carries `?next=...`, so the
 *      intent travels inside the email itself. This is the only copy that
 *      survives the link being opened in a different browser, and it is the one
 *      that usually does the work.
 *
 *   2. IN localStorage, with a deadline. Covers the ordinary case where the
 *      link opens in the same browser, and — more usefully — covers plain
 *      sign-IN, where there is no email and no redirect URL to hang anything
 *      off.
 *
 * The deadline matters. An intent with no expiry is a trap: someone signs up on
 * Monday to add a pharmacy, abandons it, signs in on Friday to look at their
 * points, and is dropped into a half-remembered form. A day is long enough to
 * cover "I will finish this after dinner" and short enough that it never
 * surprises anyone.
 * ========================================================================== */

/** What the visitor was trying to do before they were asked to sign in. */
export type ContributeIntent = {
  /** Where to land. Always an in-app path, never an absolute URL — see below. */
  path: string
  /** Pre-selects the section on the submission form. */
  section?: string
  /** Pre-selects the category, so "Add Pharmacy" arrives as a pharmacy form. */
  category?: string
}

const KEY = 'elakai-contribute-intent'
const TTL_MS = 24 * 60 * 60 * 1000

/**
 * Only in-app paths are ever honoured.
 *
 * `next` arrives from a query string, which means it arrives from anywhere —
 * including a link somebody else wrote. Accepting an absolute URL here would
 * turn every "sign in to contribute" link into an open redirect: a phishing
 * page could send someone through ELAKAI's real login and bounce them to a
 * copy of it, with the trust of a genuine sign-in already spent.
 *
 * So a candidate must start with a single `/` and must not start with `//`,
 * which browsers read as a protocol-relative absolute URL. Everything else
 * falls back to the dashboard.
 */
function safePath(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed.startsWith('/')) return null
  if (trimmed.startsWith('//')) return null
  // A backslash is normalised to a forward slash by some browsers, so `/\evil`
  // is another spelling of `//evil`.
  if (/^\/[\\]/.test(trimmed)) return null
  return trimmed
}

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

export function rememberIntent(intent: ContributeIntent): void {
  const path = safePath(intent.path)
  if (!path) return
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ ...intent, path, expires: Date.now() + TTL_MS }),
    )
  } catch {
    // Private browsing, or storage full. The URL copy is still in play, and an
    // intent that cannot be saved is a small loss, not a failed sign-up.
  }
}

/**
 * Reads and clears the stored intent.
 *
 * Clearing on read is deliberate: an intent is consumed once. Leaving it behind
 * would send the person back to the same form the next time they sign in.
 */
export function takeIntent(): ContributeIntent | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    localStorage.removeItem(KEY)

    const parsed = JSON.parse(raw) as ContributeIntent & { expires?: number }
    if (typeof parsed.expires === 'number' && Date.now() > parsed.expires) return null

    const path = safePath(parsed.path)
    if (!path) return null

    return {
      path,
      section: typeof parsed.section === 'string' ? parsed.section : undefined,
      category: typeof parsed.category === 'string' ? parsed.category : undefined,
    }
  } catch {
    return null
  }
}

export function clearIntent(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* nothing to clear */
  }
}

/* ------------------------------------------------------------------ */
/* URLs                                                                */
/* ------------------------------------------------------------------ */

/** The in-app path an intent resolves to, with its pre-selections attached. */
export function intentToPath(intent: ContributeIntent): string {
  const params = new URLSearchParams()
  if (intent.section) params.set('section', intent.section)
  if (intent.category) params.set('category', intent.category)
  const query = params.toString()
  return query ? `${intent.path}?${query}` : intent.path
}

/**
 * Reads an intent back out of a location's query string.
 *
 * `next` is validated by `safePath` before it is trusted, for the reason given
 * there. Returns null when there is nothing usable, which the caller reads as
 * "send them to the dashboard".
 */
export function intentFromSearch(search: string): ContributeIntent | null {
  const params = new URLSearchParams(search)
  const path = safePath(params.get('next'))
  if (!path) return null
  return {
    path,
    section: params.get('section') || undefined,
    category: params.get('category') || undefined,
  }
}

/**
 * The absolute URL Supabase should send someone back to after they click the
 * confirmation link in their email.
 *
 * Absolute because it goes into an email, and inside `/elakai/` because that is
 * where this app is mounted on GitHub Pages — a bare `/account/callback` would
 * land on the Pages 404.
 *
 * NOTE FOR DEPLOYMENT: the origin this produces must be listed under
 * Authentication -> URL Configuration -> Redirect URLs in the Supabase
 * dashboard, or the link in the email silently falls back to the Site URL and
 * the intent is lost. See supabase/CONTRIBUTORS.md.
 */
export function confirmationRedirect(intent: ContributeIntent | null): string {
  /*
   * The base path comes from the build, not from a literal.
   *
   * This read `${origin}/elakai/account/callback` with the segment written out.
   * It was correct, and it was the one place in the app that knew the deploy
   * path by heart — `vite.config.ts` sets `base`, `App.tsx` sets the router
   * `basename`, and `lib/pwa.ts` registers the worker against
   * `import.meta.env.BASE_URL`, so renaming the repository would have moved
   * three of the four and left this one building a URL into a Pages 404.
   *
   * `BASE_URL` is '/elakai/' here and always carries its trailing slash, hence
   * no separator between it and the path below.
   */
  const base = `${window.location.origin}${import.meta.env.BASE_URL}account/callback`
  if (!intent) return base
  const params = new URLSearchParams({ next: intent.path })
  if (intent.section) params.set('section', intent.section)
  if (intent.category) params.set('category', intent.category)
  return `${base}?${params.toString()}`
}
