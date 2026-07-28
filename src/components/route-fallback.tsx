import { Skeleton } from '@/components/ui/skeleton'
import { useI18n } from '@/lib/i18n'

/** Shown while a lazily-loaded route chunk arrives. */
export function RouteFallback() {
  const { t } = useI18n()

  return (
    <div
      className="container space-y-4 py-8"
      role="status"
      aria-busy="true"
      aria-label={t('state.loading')}
    >
      <Skeleton className="h-8 w-1/2 max-w-xs" />
      <Skeleton className="h-4 w-3/4 max-w-md" />
      <div className="grid gap-3 pt-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full" />
        ))}
      </div>
    </div>
  )
}
