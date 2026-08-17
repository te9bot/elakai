import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn, Plus, UserPlus } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAccount } from '@/lib/auth'
import { rememberIntent, type ContributeIntent } from '@/lib/contribute-intent'
import {
  categoryLabel,
  sectionForCategory,
  sectionSpec,
  withArticle,
} from '@/lib/submission-fields'
import logo from '../../../assets/elakai-logo.png'

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
 * reading. A visitor who dismisses it is exactly where they were.
 *
 * WHY A DIALOG RATHER THAN A REDIRECT TO /account/signup
 *
 * Because the third option matters as much as the first two. Sending a guest to
 * a signup page makes "no thanks" a back button, and a back button after a
 * redirect is a page load. A dialog makes Continue browsing a first-class
 * choice sitting next to the other two, costing nothing, which is what an open
 * information platform should feel like. Signed-in contributors never see it at
 * all — for them the same call goes straight to the form.
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
   * Start a contribution. Signed in, this navigates; signed out, it opens the
   * dialog and remembers what was being attempted.
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
  const [pending, setPending] = useState<ContributeIntent | null>(null)

  const contribute = useCallback(
    (target?: ContributeTarget) => {
      const intent = toIntent(target)

      if (status === 'contributor' || status === 'admin') {
        const params = new URLSearchParams()
        if (intent.section) params.set('section', intent.section)
        if (intent.category) params.set('category', intent.category)
        const query = params.toString()
        navigate(query ? `${intent.path}?${query}` : intent.path)
        return
      }

      // Written down before the dialog opens rather than when a button in it is
      // pressed, so the intent survives even if they leave via the browser's
      // own controls and come back signed in from somewhere else.
      rememberIntent(intent)
      setPending(intent)
    },
    [status, navigate],
  )

  const value = useMemo<GateValue>(() => ({ contribute }), [contribute])

  return (
    <GateContext.Provider value={value}>
      {children}
      <GateDialog intent={pending} onClose={() => setPending(null)} />
    </GateContext.Provider>
  )
}

export function useContribute(): GateValue {
  const ctx = useContext(GateContext)
  // Returns a no-op rather than throwing, so a component that offers a
  // Contribute button can be rendered outside the provider — in the admin
  // panel, in a lab entry point — without taking the screen down with it.
  return ctx ?? { contribute: () => {} }
}

/* ------------------------------------------------------------------ */
/* The dialog                                                          */
/* ------------------------------------------------------------------ */

function GateDialog({
  intent,
  onClose,
}: {
  intent: ContributeIntent | null
  onClose: () => void
}) {
  const navigate = useNavigate()
  const { schemaReady, status } = useAccount()

  // The category when the caller named one — "Add a pharmacy" is a better
  // title than "Add a healthcare place" — falling back to the section's own
  // written-out phrase. See `addPhrase` in lib/submission-fields.ts for why
  // this is not just the label with an article glued on.
  const what = intent?.category
    ? withArticle(categoryLabel(intent.category).toLowerCase())
    : intent?.section
      ? sectionSpec(intent.section).addPhrase
      : null

  function go(to: 'signup' | 'login') {
    if (!intent) return
    const params = new URLSearchParams({ next: intent.path })
    if (intent.section) params.set('section', intent.section)
    if (intent.category) params.set('category', intent.category)
    onClose()
    navigate(`/account/${to}?${params.toString()}`)
  }

  return (
    <Dialog open={!!intent} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[26rem]">
        <DialogHeader>
          <div className="flex flex-col items-center text-center">
            <img
              src={logo}
              alt=""
              width={512}
              height={471}
              className="h-12 w-auto object-contain"
            />
            <DialogTitle className="mt-4">
              {what ? `Add ${what}` : 'Contribute to ELAKAI'}
            </DialogTitle>
            <DialogDescription className="mt-1.5">
              {schemaReady
                ? 'Create a free account to submit local information. Everything you send is checked by an administrator before it goes live.'
                : 'Contributions are not switched on for this site yet. Everything you can read here stays free to read.'}
            </DialogDescription>
          </div>
        </DialogHeader>

        {schemaReady && status !== 'unconfigured' ? (
          <div className="mt-6 space-y-3">
            <Button size="lg" block onClick={() => go('signup')}>
              <UserPlus aria-hidden="true" />
              Create account
            </Button>
            <Button variant="secondary" size="lg" block onClick={() => go('login')}>
              <LogIn aria-hidden="true" />
              Log in
            </Button>
            {/*
             * Third, and quiet, but present. §4 is explicit that closing this
             * and carrying on has to be an option that is offered rather than
             * one that has to be found.
             */}
            <Button variant="ghost" size="md" block onClick={onClose}>
              Continue browsing
            </Button>

            <p className="pt-1 text-center text-meta text-ink-subtle">
              Approved information earns the contributor 50 points.
            </p>
          </div>
        ) : (
          <div className="mt-6">
            <Button variant="secondary" size="lg" block onClick={onClose}>
              Continue browsing
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
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
