import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/*
 * THE CARD SYSTEM IS AN EMPHASIS SCALE, NOT A CONTAINER.
 *
 * Every card on this site used to be the same object: a hairline border, an
 * opaque surface and a drop shadow. Counted across the components directory,
 * `border border-line` and `shadow-card` each appeared 31 times — and of the 42
 * `<Card>` call sites, only four ever asked for a different elevation. So a
 * screen with eight cards on it made eight equally loud claims, and the reader
 * had nothing to sort them by. That is the "everything floats" look the brief
 * is asking to leave behind.
 *
 * `emphasis` replaces `elevation` as the axis that matters. The default is now
 * `secondary` — surface and hairline, no shadow — so a card has to *ask* for
 * the shadow that marks it as the one to reach for first. Most do not need it,
 * and a page where two cards are raised reads as a page with two priorities
 * rather than as a pile.
 *
 * `bare` is the important one and the one to reach for most. It keeps the
 * padding and the semantics and draws no box at all, for the very common case
 * where the information was never a card — it was a heading, some text and a
 * gap, wearing a container because a container was the only thing available.
 *
 * `elevation` is kept and still works. Four call sites pass `lifted` and they
 * mean it: a sheet or a dialog genuinely does sit above the page.
 */
const cardVariants = cva(
  'rounded-card border text-ink transition-[box-shadow,border-color,background-color] duration-200 ease-out',
  {
    variants: {
      emphasis: {
        /** The one card on a screen that has to be reached first. */
        primary: 'border-line bg-surface shadow-card',
        /** The default. Present, quiet, clearly a surface. */
        secondary: 'border-line bg-surface shadow-none',
        /** Grouped or nested content: a tint instead of a border. */
        inset: 'border-transparent bg-surface-2 shadow-none',
        /** Information that never needed a container. Typography does the work. */
        bare: 'border-transparent bg-transparent shadow-none',
      },
      elevation: {
        flat: 'shadow-none',
        raised: 'shadow-card',
        lifted: 'shadow-lift',
      },
      interactive: {
        /*
         * A border and a tint, not a lift.
         *
         * `hover:-translate-y-0.5` was the old affordance. It is the single
         * most generic card interaction on the web, it does nothing at all on
         * the touch devices most of this site's traffic uses, and moving a card
         * under a thumb that is trying to hit it is the wrong instinct. The
         * press state is what matters on a phone, so that is the one that is
         * explicit here.
         */
        true: 'cursor-pointer hover:border-primary/30 hover:bg-surface-2/60 active:bg-surface-2',
        false: '',
      },
    },
    defaultVariants: { emphasis: 'secondary', interactive: false },
  },
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, emphasis, elevation, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ emphasis, elevation, interactive }), className)}
      {...props}
    />
  ),
)
Card.displayName = 'Card'

export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-1.5 p-5', className)} {...props} />
  ),
)
CardHeader.displayName = 'CardHeader'

export const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-heading text-balance', className)} {...props} />
  ),
)
CardTitle.displayName = 'CardTitle'

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-body-sm text-ink-muted text-pretty', className)} {...props} />
))
CardDescription.displayName = 'CardDescription'

export const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-5 pt-0', className)} {...props} />
  ),
)
CardContent.displayName = 'CardContent'

export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center gap-2 p-5 pt-0', className)} {...props} />
  ),
)
CardFooter.displayName = 'CardFooter'
