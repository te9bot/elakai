import { lazy, Suspense, useState } from 'react'
import { Map as MapIcon, Navigation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { LatLng } from '@/data/types'
import { directionsHref } from '@/lib/format'
import { useI18n } from '@/lib/i18n'

// Leaflet and its CSS are ~45kb gzipped and reach an external tile server.
// Neither is loaded until the user actually taps "Show map", which keeps the
// common "call this place" path free of both costs.
const LeafletMap = lazy(() => import('./leaflet-map'))

export function MapPanel({ coords, label }: { coords: LatLng; label: string }) {
  const { t } = useI18n()
  const [shown, setShown] = useState(false)

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      {shown ? (
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-none sm:h-80" />}>
          <LeafletMap coords={coords} label={label} />
        </Suspense>
      ) : (
        <button
          type="button"
          onClick={() => setShown(true)}
          className="surveyor-grid group relative flex h-64 w-full flex-col items-center justify-center gap-3 bg-surface-2 transition-colors hover:bg-surface-2/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:h-80"
        >
          <span className="grid size-14 place-items-center rounded-control bg-primary text-white shadow-card transition-transform group-hover:scale-105">
            <MapIcon className="size-6" aria-hidden="true" />
          </span>
          <span className="text-body font-bold">{t('biz.showMap')}</span>
          <span className="max-w-xs px-6 text-center text-meta text-pretty text-ink-subtle">
            {t('biz.mapHint')}
          </span>
        </button>
      )}

      <div className="border-t border-line p-3">
        <Button asChild variant="secondary" size="lg" block>
          <a href={directionsHref(coords, label)} target="_blank" rel="noopener noreferrer">
            <Navigation />
            {t('card.directions')}
          </a>
        </Button>
      </div>
    </div>
  )
}
