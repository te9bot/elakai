import { forwardRef } from 'react'
import * as SheetPrimitive from '@radix-ui/react-dialog'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Sheet = SheetPrimitive.Root
export const SheetTrigger = SheetPrimitive.Trigger
export const SheetClose = SheetPrimitive.Close

const SheetOverlay = forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-ink/45 backdrop-blur-[2px] data-[state=open]:animate-fade-in',
      className,
    )}
    {...props}
  />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

const sheetVariants = cva(
  'fixed z-50 flex flex-col gap-0 border-line bg-surface shadow-lift transition-transform duration-300 ease-out focus:outline-none',
  {
    variants: {
      side: {
        bottom:
          'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-sheet border-t data-[state=closed]:translate-y-full data-[state=open]:translate-y-0',
        right:
          'inset-y-0 right-0 w-[min(24rem,88vw)] border-l data-[state=closed]:translate-x-full data-[state=open]:translate-x-0',
        left: 'inset-y-0 left-0 w-[min(20rem,84vw)] border-r data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0',
      },
    },
    defaultVariants: { side: 'bottom' },
  },
)

export interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  /** Show the drag-handle affordance. Bottom sheets only. */
  showHandle?: boolean
}

export const SheetContent = forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = 'bottom', className, children, showHandle = true, ...props }, ref) => (
  <SheetPrimitive.Portal>
    <SheetOverlay />
    <SheetPrimitive.Content ref={ref} className={cn(sheetVariants({ side }), className)} {...props}>
      {side === 'bottom' && showHandle && (
        <div className="flex shrink-0 justify-center pb-1 pt-3" aria-hidden="true">
          <span className="h-1.5 w-10 rounded-full bg-line" />
        </div>
      )}
      {children}
    </SheetPrimitive.Content>
  </SheetPrimitive.Portal>
))
SheetContent.displayName = SheetPrimitive.Content.displayName

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex shrink-0 items-center justify-between gap-3 px-5 py-4', className)}
      {...props}
    />
  )
}

export function SheetBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto px-5 pb-2', className)} {...props} />
}

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex shrink-0 gap-3 border-t border-line bg-surface px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]',
        className,
      )}
      {...props}
    />
  )
}

export const SheetTitle = forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title ref={ref} className={cn('text-heading', className)} {...props} />
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

export const SheetDescription = forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn('text-body-sm text-ink-muted', className)}
    {...props}
  />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

/** Icon-only close button for sheet headers. */
export function SheetCloseButton({ label = 'Close' }: { label?: string }) {
  return (
    <SheetPrimitive.Close
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-full text-ink-subtle',
        'transition-colors hover:bg-surface-2 hover:text-ink',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
      )}
    >
      <X className="size-5" />
      <span className="sr-only">{label}</span>
    </SheetPrimitive.Close>
  )
}
