import { useState, type ReactNode } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { MoreVertical, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

/* ==========================================================================
 * The ⋮ menu on a row.
 *
 * WHY POPOVER AND NOT A DROPDOWN MENU
 *
 * `@radix-ui/react-dropdown-menu` is the semantically exact primitive — it
 * gives `role="menu"`, roving focus and arrow-key navigation. It is also not
 * installed, and the brief for this work asks for no unnecessary libraries.
 * `@radix-ui/react-popover` already is installed, and it brings the parts that
 * actually matter for a two-item menu: it portals out of the row (so the panel
 * is never clipped by the card's `overflow`), closes on Escape and on an
 * outside click, returns focus to the trigger when it closes, marks the trigger
 * with `aria-expanded`, and handles touch correctly.
 *
 * What it does not bring is arrow-key navigation between items, and with two
 * plain buttons inside, Tab reaches both in order. That is a real if small
 * difference from a true menu, and it is the trade being made rather than an
 * oversight.
 *
 * NO NEW VISUAL LANGUAGE
 *
 * Every token here is one the admin panel already uses: `bg-surface`,
 * `border-line`, `shadow-lift`, `rounded-control`, `text-body-sm`,
 * `hover:bg-surface-2`, and `text-danger`/`hover:bg-danger-soft` for the
 * destructive item — the same pair the delete control on the listings table
 * has used all along.
 * ========================================================================== */

export function RowActions({
  label,
  children,
  disabled = false,
  triggerRef,
}: {
  /** Names the row in the trigger's accessible name: "Actions for Rahman Pharmacy". */
  label: string
  children: (close: () => void) => ReactNode
  disabled?: boolean
  /**
   * Hands the trigger element up to the caller.
   *
   * The submissions queue throws the deleted card at this button, so it needs
   * the node in order to measure it. Exposed as a callback ref rather than by
   * wrapping this component in `forwardRef`, because `Popover.Trigger asChild`
   * already owns the button's ref and composing two of them is more machinery
   * than one optional prop deserves.
   */
  triggerRef?: (node: HTMLButtonElement | null) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-label={`Actions for ${label}`}
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-control text-ink-subtle',
            'transition-colors hover:bg-surface-2 hover:text-ink',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            'disabled:cursor-not-allowed disabled:opacity-50',
            open && 'bg-surface-2 text-ink',
          )}
        >
          <MoreVertical className="size-4" aria-hidden="true" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          // Above the sticky admin header (z-30) and the sidebar (z-50) is not
          // needed — the portal renders at the end of <body> — but the toast
          // region sits at z-60, so this stays under it. A toast reporting the
          // result of an action should never be covered by the menu that
          // started it.
          className={cn(
            'z-50 min-w-[190px] rounded-control border border-line bg-surface p-1 shadow-lift',
            // The panel's own entrance. `fade-in` is an animation this project
            // already defines; the reduced-motion block in index.css damps it
            // with everything else.
            'data-[state=open]:animate-fade-in',
          )}
        >
          <div className="flex flex-col">{children(() => setOpen(false))}</div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

/**
 * One row in the menu.
 *
 * A button rather than a link even when it navigates, because the caller
 * already has the router and the menu has to close as it goes. `destructive`
 * is the only variant: two tones is all a menu of this size can carry without
 * turning into a palette.
 */
export function RowAction({
  icon: Icon,
  children,
  onSelect,
  destructive = false,
  disabled = false,
}: {
  icon: LucideIcon
  children: ReactNode
  onSelect: () => void
  destructive?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-body-sm font-semibold',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        destructive
          ? 'text-danger hover:bg-danger-soft'
          : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {children}
    </button>
  )
}
