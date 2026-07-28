import { useState } from 'react'
import { Phone, ShieldAlert } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DEMO_MODE } from '@/lib/config'
import { toTelHref } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

type CallButtonProps = Omit<ButtonProps, 'asChild' | 'onClick'> & {
  phone: string
  /** Accessible name context, e.g. the business name. */
  label?: string
  showIcon?: boolean
  children?: React.ReactNode
}

/**
 * The single place the app decides whether a phone number is dialable.
 *
 * While DEMO_MODE is on, this renders a button that explains the data is not
 * real instead of a `tel:` link. That is deliberate: every number in this build
 * is a placeholder, and someone dialling one during a real emergency would lose
 * time they cannot afford. Flip DEMO_MODE in src/lib/config.ts once numbers are
 * verified and this becomes a real link with no other change.
 */
export function CallButton({
  phone,
  label,
  showIcon = true,
  className,
  variant = 'primary',
  size = 'lg',
  children,
  ...props
}: CallButtonProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)

  const content = (
    <>
      {showIcon && <Phone />}
      {children ?? t('card.call')}
    </>
  )

  if (!DEMO_MODE) {
    return (
      <Button asChild variant={variant} size={size} className={className} {...props}>
        <a href={toTelHref(phone)} aria-label={label ? `${t('card.call')} ${label}` : undefined}>
          {content}
        </a>
      </Button>
    )
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={cn(className)}
        onClick={() => setOpen(true)}
        aria-label={label ? `${t('card.call')} ${label}` : undefined}
        {...props}
      >
        {content}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-1 grid size-12 place-items-center rounded-control bg-warning-soft text-warning-ink">
              <ShieldAlert className="size-6" />
            </div>
            <DialogTitle>{t('demo.dialogTitle')}</DialogTitle>
            <DialogDescription>{t('demo.dialogBody')}</DialogDescription>
          </DialogHeader>

          <p className="mt-4 rounded-control bg-surface-2 px-4 py-3 text-center">
            <span className="tnum text-heading text-ink-subtle line-through decoration-danger/60 decoration-2">
              {phone}
            </span>
          </p>

          <DialogFooter>
            <Button block size="lg" onClick={() => setOpen(false)}>
              {t('demo.dialogAck')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
