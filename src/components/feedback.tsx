import { useEffect, useState } from 'react'
import { AlertTriangle, Info, RotateCw, SearchX, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { LogoPlaceholder } from '@/components/brand-loader'
import { Skeleton } from '@/components/ui/skeleton'
import { STORAGE_KEYS } from '@/lib/config'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Skeletons                                                           */
/* ------------------------------------------------------------------ */
/*
 * Every slot that will resolve into an *image* is filled with the brand mark
 * (see components/brand-loader.tsx) instead of a grey block; only the slots
 * that resolve into lines of text stay as bars, because a watermark inside a
 * 12px-tall bar is illegible noise. Both share one brand-tinted sweep.
 */

export function BusinessCardSkeleton() {
  return (
    <Card className="overflow-hidden p-4">
      <div className="flex gap-4">
        <LogoPlaceholder className="size-20 shrink-0 rounded-control sm:size-24" />
        <div className="min-w-0 flex-1 space-y-2.5 py-0.5">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3 w-2/5" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-12 flex-1" />
        <Skeleton className="h-12 flex-1" />
      </div>
    </Card>
  )
}

export function BusinessListSkeleton({ count = 4 }: { count?: number }) {
  const { t } = useI18n()
  return (
    <div className="space-y-3" role="status" aria-busy="true" aria-label={t('state.loading')}>
      {Array.from({ length: count }).map((_, i) => (
        <BusinessCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function RailSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="rail rail-bleed" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="w-[264px] overflow-hidden p-0">
          <LogoPlaceholder className="h-32 w-full" />
          <div className="space-y-2.5 p-4">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-11 w-full" />
          </div>
        </Card>
      ))}
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <LogoPlaceholder className="h-56 w-full sm:rounded-card" />
      <div className="container space-y-4">
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* States                                                              */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  /** Lets a page whose whole content is an empty state own the document h1. */
  titleAs: Title = 'h3',
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  titleAs?: 'h1' | 'h2' | 'h3'
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-card border border-dashed border-line',
        'bg-surface/60 px-6 py-14 text-center',
        className,
      )}
    >
      <div className="mb-4 grid size-14 place-items-center rounded-control bg-surface-2 text-ink-subtle">
        {icon ?? <SearchX className="size-6" />}
      </div>
      <Title className="text-heading text-balance">{title}</Title>
      {description && (
        <p className="mt-2 max-w-sm text-body-sm text-pretty text-ink-muted">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function ErrorState({ onRetry, className }: { onRetry?: () => void; className?: string }) {
  const { t } = useI18n()
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center rounded-card border border-danger/25 bg-danger-soft px-6 py-12 text-center',
        className,
      )}
    >
      <div className="mb-4 grid size-14 place-items-center rounded-control bg-danger/10 text-danger">
        <AlertTriangle className="size-6" />
      </div>
      <h3 className="text-heading text-danger-ink">{t('state.errorTitle')}</h3>
      <p className="mt-2 max-w-sm text-body-sm text-danger-ink/80">{t('state.errorSub')}</p>
      {onRetry && (
        <Button variant="secondary" size="lg" className="mt-6" onClick={onRetry}>
          <RotateCw />
          {t('state.retry')}
        </Button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Demo-data banner                                                    */
/* ------------------------------------------------------------------ */

/**
 * Every number in this build is a placeholder. On the Emergency page the banner
 * is permanent and cannot be dismissed — that page is precisely where mistaking
 * demo data for real data would do harm.
 */
export function DemoBanner({
  persistent = false,
  className,
}: {
  persistent?: boolean
  className?: string
}) {
  const { t } = useI18n()
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (persistent) {
      setDismissed(false)
      return
    }
    try {
      setDismissed(localStorage.getItem(STORAGE_KEYS.demoBannerDismissed) === '1')
    } catch {
      setDismissed(false)
    }
  }, [persistent])

  if (dismissed) return null

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(STORAGE_KEYS.demoBannerDismissed, '1')
    } catch {
      /* private mode */
    }
  }

  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-3 rounded-card border border-warning/30 bg-warning-soft px-4 py-3.5',
        className,
      )}
    >
      <Info className="mt-0.5 size-5 shrink-0 text-warning-ink" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-body-sm text-pretty text-warning-ink">
        <span className="font-bold">{t('demo.badge')} · </span>
        {t('demo.banner')}
      </p>
      {!persistent && (
        <button
          type="button"
          onClick={dismiss}
          className="-m-1 grid size-8 shrink-0 place-items-center rounded-full text-warning-ink/70 transition-colors hover:bg-warning/15 hover:text-warning-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning-ink"
        >
          <X className="size-4" />
          <span className="sr-only">{t('demo.dismiss')}</span>
        </button>
      )}
    </div>
  )
}
