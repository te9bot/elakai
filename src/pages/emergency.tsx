import { Siren } from 'lucide-react'
import { EmergencyCard } from '@/components/cards/emergency-card'
import { ErrorState, RailSkeleton } from '@/components/feedback'
import { ListingsSection } from '@/components/listings/listings-section'
import { useEmergency, useListingIdResolver } from '@/hooks/use-queries'
import { useI18n } from '@/lib/i18n'

/**
 * The highest-stakes page in the app. Deliberately plainer than the rest: no
 * rails, no hover choreography, no progressive disclosure. Large cards, one
 * obvious action each, and a demo warning that cannot be dismissed.
 */
export default function EmergencyPage() {
  const { t } = useI18n()
  const { data, isPending, isError, refetch } = useEmergency()

  const national = data?.filter((c) => c.scope === 'national') ?? []
  const local = data?.filter((c) => c.scope === 'local') ?? []

  // Each card's canonical `public.listings.id`, so its title opens the real
  // detail page rather than a separate emergency-only view built from a second
  // copy of the data. Every emergency contact is stored in the `emergency`
  // section, which is the section its row is matched under.
  const resolve = useListingIdResolver()
  const listingId = (contact: (typeof national)[number]) =>
    resolve('emergency', contact.name.en)

  return (
    <div className="pb-8">
      {/* Dark, high-contrast header so this page is unmistakable at a glance. */}
      <div className="relative overflow-hidden border-b border-danger/20 bg-danger-soft">
        <div className="surveyor-dots absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="container relative py-8 sm:py-12">
          <div className="flex items-start gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-control bg-danger text-white shadow-card">
              <Siren className="size-7" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="text-display text-balance text-danger-ink">{t('emergency.title')}</h1>
              <p className="mt-2 max-w-xl text-body text-pretty text-danger-ink/80">
                {t('emergency.sub')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {isError ? (
        <div className="container pt-6">
          <ErrorState onRetry={() => refetch()} />
        </div>
      ) : isPending ? (
        <div className="container pt-6">
          <RailSkeleton count={3} />
        </div>
      ) : (
        <>
          <section className="container pt-8">
            <h2 className="mb-4 text-title">{t('emergency.national')}</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {national.map((c) => (
                <EmergencyCard key={c.id} contact={c} listingId={listingId(c)} />
              ))}
            </div>
          </section>

          <section className="container pt-10">
            <h2 className="mb-4 text-title">{t('emergency.local')}</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {local.map((c) => (
                <EmergencyCard key={c.id} contact={c} listingId={listingId(c)} />
              ))}
            </div>
          </section>

          {/* Published from the admin panel. Renders nothing until it has rows,
              so this page is unchanged until somebody adds one. */}
          <section className="container">
            <ListingsSection
              section="emergency"
              title="Other emergency contacts"
              description="Added by the ELAKAI team."
            />
          </section>
        </>
      )}
    </div>
  )
}
