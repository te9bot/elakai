import type { ReactNode } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

import { Dialog, DialogOverlay, DialogPortal } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

/* ==========================================================================
 * The admin panel's modal shell.
 *
 * WHY THIS EXISTS RATHER THAN USING DialogContent DIRECTLY
 *
 * The shared `DialogContent` centres itself with `left-1/2 top-1/2` plus a
 * `-translate-x-1/2 -translate-y-1/2`. That technique centres against the
 * element's containing block, and for a fixed-position element the containing
 * block stops being the viewport the moment any ancestor has a `transform`,
 * `filter`, `perspective`, `will-change` or `contain` — every one of those
 * promotes that ancestor into the containing block for its fixed descendants.
 * The admin panel is full of exactly those properties (the sidebar animates on
 * `transform`, the header uses `backdrop-blur`), so a modal centred that way is
 * one stacking context away from being measured against a container inset by
 * the sidebar instead of against the window. That is the rightward drift.
 *
 * The same technique also has no way to stay inside the viewport: translating
 * by half its own height pushes a tall modal off the top, and a wide one off
 * both edges, because nothing is constraining it to the window at all.
 *
 * So centring here is done by a layout that cannot drift: a fixed, viewport-
 * sized flex box that centres its child, with the gutter expressed as padding
 * on that box. `max-h-full` then resolves against the padded box, which is what
 * keeps the modal inside the window at every size without a single `calc()`
 * that has to be kept in sync with the padding.
 *
 * Everything renders through Radix's portal, so the markup lands on
 * `document.body` regardless of which page opened it — no parent stacking
 * context, no sidebar offset, no inherited width constraint.
 * ========================================================================== */

export function AdminModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  /** Blocks backdrop / Escape / close-button dismissal while a save is in flight. */
  locked = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  locked?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !locked && onOpenChange(next)}>
      <DialogPortal>
        {/* Backdrop. Fixed to the viewport and never a scroll container, so it
            cannot contribute horizontal overflow of its own. */}
        <DialogOverlay className="z-[100]" />

        {/* The centring layer.
            `pointer-events-none` lets clicks fall through to the overlay
            beneath, which is what Radix listens to for dismissal; the modal
            itself takes its events back. Padding here is the viewport gutter,
            and it shrinks on small screens so a 320px phone still gets a
            usable form rather than a sliver. */}
        <div
          className={cn(
            'fixed inset-0 z-[100] flex items-center justify-center',
            'pointer-events-none',
            'p-3 md:p-6 max-[480px]:p-2',
          )}
        >
          <DialogPrimitive.Content
            onOpenAutoFocus={(e) => {
              // Focusing the first field would scroll a long form to it on
              // open; the dialog itself takes focus instead.
              e.preventDefault()
              ;(e.currentTarget as HTMLElement).focus()
            }}
            className={cn(
              'pointer-events-auto flex w-full max-w-[760px] flex-col overflow-hidden',
              // Resolves against the padded centring box above, so the modal is
              // always the viewport minus its gutter and never taller.
              'max-h-full',
              'rounded-sheet border border-line bg-surface shadow-lift outline-none',
              'max-sm:rounded-card',
              'data-[state=open]:animate-fade-up',
            )}
          >
            {/* ---- Header: fixed ---- */}
            <div className="relative flex shrink-0 flex-col gap-1.5 border-b border-line px-4 py-4 pr-14 sm:px-6 sm:py-5">
              <DialogPrimitive.Title className="text-title">{title}</DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="text-body-sm leading-relaxed text-pretty text-ink-muted">
                  {description}
                </DialogPrimitive.Description>
              )}

              <DialogPrimitive.Close
                disabled={locked}
                className={cn(
                  'absolute right-3 top-3 grid size-10 place-items-center rounded-full sm:right-4 sm:top-4',
                  'text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  'disabled:pointer-events-none disabled:opacity-40',
                )}
              >
                <X className="size-5" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>

            {/* ---- Body: the only scrolling region ----
                `min-h-0` is what actually allows it to shrink; a flex child
                defaults to its content height and would otherwise push the
                footer out of the modal instead of scrolling inside it.
                `overscroll-contain` stops a flick at the end of the list from
                chaining into the page behind. */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
              {children}
            </div>

            {/* ---- Footer: fixed, so Save is always reachable ---- */}
            {footer && (
              <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-line px-4 py-3.5 sm:flex-row sm:justify-end sm:px-6 sm:py-4">
                {footer}
              </div>
            )}
          </DialogPrimitive.Content>
        </div>
      </DialogPortal>
    </Dialog>
  )
}

/**
 * The responsive field grid used inside a modal body.
 *
 * `minmax(0, 1fr)` rather than `1fr`: a bare `1fr` track has an automatic
 * minimum of its content's min-content width, so one long unbroken value in an
 * input is enough to push the track — and the whole modal — wider than the
 * viewport. Clamping the minimum to zero is what makes the columns actually
 * shrink, and it is the difference between a form that reflows and one that
 * grows a horizontal scrollbar.
 */
export function ModalFields({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-[repeat(2,minmax(0,1fr))]',
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * One labelled group of fields inside a modal body.
 *
 * A long form is easier to fill in when it reads as a handful of named groups
 * than as thirteen equally-weighted rows, and easier to scan back through when
 * looking for the one field that needs changing. The rule separating groups is
 * the same hairline the rest of the panel uses, and the eyebrow is the existing
 * `micro` type token — this adds hierarchy to the form without introducing a
 * heavier treatment than the surface it sits on. Nested cards were the
 * alternative and they read as boxes inside a box.
 *
 * The leading rule is suppressed on the first group, so the body does not open
 * with a line immediately under the modal header's own.
 */
export function ModalSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="border-t border-line pt-6 first:border-t-0 first:pt-0">
      <h3 className="text-micro uppercase text-ink-subtle">{title}</h3>
      {description && (
        <p className="mt-1.5 text-meta leading-relaxed text-pretty text-ink-muted">
          {description}
        </p>
      )}
      <ModalFields className="mt-4">{children}</ModalFields>
    </section>
  )
}

/** Stacks the groups above with consistent rhythm between them. */
export function ModalSections({ children }: { children: ReactNode }) {
  return <div className="space-y-6">{children}</div>
}
