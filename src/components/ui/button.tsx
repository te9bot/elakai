import { forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Sizes are floored at 44px and default to 48px because the primary audience is
 * on budget Android hardware, often one-handed and in a hurry.
 *
 * `success` and `warning` deliberately have no solid variant — white text on
 * #16A34A (3.1:1) and #F59E0B (~2:1) both fail WCAG AA. They exist only as
 * tinted fills with dark text.
 */
const buttonVariants = cva(
  [
    'relative inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded-control font-semibold',
    'transition-[background-color,color,box-shadow,transform] duration-150 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
    'focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.985]',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white shadow-card hover:bg-primary-hover',
        danger: 'bg-danger text-white shadow-card hover:bg-danger-hover',
        secondary: 'bg-surface text-ink border border-line shadow-card hover:bg-surface-2',
        soft: 'bg-primary-soft text-primary-ink hover:bg-primary-soft/70',
        'soft-danger': 'bg-danger-soft text-danger-ink hover:bg-danger-soft/70',
        'soft-success': 'bg-success-soft text-success-ink hover:bg-success-soft/70',
        ghost: 'text-ink hover:bg-surface-2',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-10 px-3.5 text-body-sm [&_svg]:size-4',
        md: 'h-12 px-5 text-body-sm [&_svg]:size-[18px]',
        lg: 'h-14 px-6 text-body [&_svg]:size-5',
        xl: 'h-16 px-7 text-heading [&_svg]:size-6',
        icon: 'size-12 [&_svg]:size-5',
        'icon-sm': 'size-10 [&_svg]:size-[18px]',
        'icon-lg': 'size-14 [&_svg]:size-6',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', block: false },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        // Buttons inside filter forms would otherwise submit by default.
        type={asChild ? undefined : (type ?? 'button')}
        className={cn(buttonVariants({ variant, size, block }), className)}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { buttonVariants }
