import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Success/warning badges use tinted fills with dark ink, never white-on-colour —
 * see the contrast note in tailwind.config.ts.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-pill font-semibold whitespace-nowrap [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        neutral: 'bg-surface-2 text-ink-muted',
        outline: 'border border-line bg-surface text-ink-muted',
        primary: 'bg-primary-soft text-primary-ink',
        danger: 'bg-danger-soft text-danger-ink',
        success: 'bg-success-soft text-success-ink',
        warning: 'bg-warning-soft text-warning-ink',
        solid: 'bg-primary text-white',
        'solid-danger': 'bg-danger text-white',
      },
      size: {
        sm: 'px-2 py-0.5 text-micro uppercase [&_svg]:size-3',
        md: 'px-2.5 py-1 text-meta [&_svg]:size-3.5',
        lg: 'px-3 py-1.5 text-body-sm [&_svg]:size-4',
      },
    },
    defaultVariants: { variant: 'neutral', size: 'md' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

export { badgeVariants }
