import { createContext, useCallback, useContext, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAccount } from '@/lib/auth'
import { rememberIntent, type ContributeIntent } from '@/lib/contribute-intent'
import { sectionForCategory } from '@/lib/submission-fields'

/* ==========================================================================
 * "Contribute information".
 *
 * The one place a visitor is ever asked to make an account, and the shape of
 * that ask is the whole of §2 and §4.
 *
 * WHAT IT IS NOT
 *
 * Not a wall. It is triggered by an action — pressing Add a pharmacy — and
 * never by arriving somewhere. There is no route it guards except /contribute,
 * no interstitial on first visit, and no redirect out of a page someone is
 * reading.
 *
 * IT USED TO OPEN A DIALOG. IT NOW NAVIGATES.
 *
 * The previous version put a small glass modal over whatever you were reading,
 * offering Create account / Log in / Continue browsing. The argument for it was
 * that third button: a dialog makes "no thanks" cost nothing, where a redirect
 * makes it a back button and a page load.
 *
 * That argument was right about the cost and wrong about the subject. The
 * modal made the contributor side of ELAKAI feel like an interruption to the
 * site instead of a part of it, and the brand had nowhere to live in a 26rem
 * box. So Contribute now goes to the full contributor entrance at
 * /account/login, and the cost the dialog was protecting is paid back by
 * "Continue browsing" sitting first in that page's tab order.
 *
 * Signed-in contributors never see any of it — for them the same call goes
 * straight to the submission form.
 * ========================================================================== */

/** Where an action sends someone, once they are signed in. */
export type ContributeTarget = {
  /** Pre-selects the section, e.g. 'healthcare'. */
  section?: string
  /** Pre-selects the category, e.g. 'pharmacy'. A section is inferred from it. */
  category?: string
  /** Overrides the destination. Defaults to the submission form. */
  path?: string
}

type GateValue = {
  /**
   * Start a contribution. Signed in, this goes to the form; signed out, it
   * goes to the contributor entrance and remembers what was being attempted.
   */
  contribute: (target?: ContributeTarget) => void
}

const GateContext = createContext<GateValue | null>(null)

function toIntent(target: ContributeTarget | undefined): ContributeIntent {
  // A category implies its section, so a caller only has to name the specific
  // thing. `sectionForCategory` reads the site's own catalogue, which means the
  // two can never be passed out of step with each other.
  const section =
    target?.section ?? (target?.category ? sectionForCategory(target.category) : null) ?? undefined
  return {
    path: target?.path ?? '/contribute/submit',
    section,
    category: target?.category,
  }
}

export function ContributeGateProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAccount()
  const navigate = useNavigate()

  const contribute = useCallback(
    (target?: ContributeTarget) => {
      const intent = toIntent(target)

      /*
       * An admin pressing Contribute goes to their own dashboard.
       *
       * Not to the submission form: /contribute is the contributor workspace
       * and RequireAccount now turns admins away from it, so sending them there
       * would only bounce them to /admin a frame later. Going straight there is
       * the same destination without the flicker.
       */
      if (status === 'admin') {
        navigate('/admin')
        return
      }

      if (status === 'contributor') {
        const params = new URLSearchParams()
        if (intent.section) params.set('section', intent.section)
        if (intent.category) params.set('category', intent.category)
        const query = params.toString()
        navigate(query ? `${intent.path}?${query}` : intent.path)
        return
      }

      /*
       * Stored as well as put in the query string.
       *
       * The URL carries it through the sign-in itself, and the stored copy is
       * the backstop for the OAuth round-trip, which navigates to another
       * origin and back and drops anything held in memory. Written before
       * leaving rather than when a button is pressed, so it survives someone
       * who wanders off and returns signed in from somewhere else entirely.
       */
      rememberIntent(intent)

      const params = new URLSearchParams({ next: intent.path })
      if (intent.section) params.set('section', intent.section)
      if (intent.category) params.set('category', intent.category)

      /*
       * Sign in rather than sign up, even though most people arriving here do
       * not have an account yet. The login screen carries a "Create an account"
       * link and the signup screen carries the reverse, so either lands
       * everybody one click from the right one — but only login is also correct
       * for the returning contributor, who is the person that would be actively
       * annoyed by being shown the wrong form.
       *
       * Both screens handle an unconfigured or un-migrated backend themselves,
       * which is what the dialog's second state used to do.
       */
      navigate(`/account/login?${params.toString()}`)
    },
    [status, navigate],
  )

  const value = useMemo<GateValue>(() => ({ contribute }), [contribute])

  return <GateContext.Provider value={value}>{children}</GateContext.Provider>
}

export function useContribute(): GateValue {
  const ctx = useContext(GateContext)
  // Returns a no-op rather than throwing, so a component that offers a
  // Contribute button can be rendered outside the provider — in the admin
  // panel, in a lab entry point — without taking the screen down with it.
  return ctx ?? { contribute: () => {} }
}

/* ------------------------------------------------------------------ */
/* The button                                                          */
/* ------------------------------------------------------------------ */

/**
 * The call to action itself.
 *
 * A component rather than a snippet at each call site, because the wording and
 * the behaviour have to stay identical everywhere the offer appears — the nav,
 * an empty search result, the bottom of a category page. One of those getting
 * out of step is how a site ends up with two different words for the same door.
 */
export function ContributeButton({
  target,
  label = 'Contribute information',
  variant = 'primary',
  size = 'md',
  className,
  block,
}: {
  target?: ContributeTarget
  label?: string
  variant?: 'primary' | 'secondary' | 'soft' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  block?: boolean
}) {
  const { contribute } = useContribute()
  return (
    <Button
      variant={variant}
      size={size}
      block={block}
      className={className}
      onClick={() => contribute(target)}
    >
      <Plus aria-hidden="true" />
      {label}
    </Button>
  )
}
