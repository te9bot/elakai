import { AlertTriangle } from 'lucide-react'

import { ListingCard } from '@/components/listings/listing-card'
import { Reveal } from '@/components/reveal'
import { SectionHeader } from '@/components/layout/section'
import { Skeleton } from '@/components/ui/skeleton'
import { useDatabaseDrivenDirectory, useListings } from '@/hooks/use-queries'
import { isFromBundledDirectory } from '@/lib/listing-identity'

/* ==========================================================================
 * The admin-managed block on a public page.
 *
 * Reads `public.listings` through the shared Supabase client — the same table
 * and the same publishable key the admin panel writes with. Nothing here is
 * bundled: what an editor publishes is what renders, on the next load.
 *
 * The three states are deliberately distinct, because conflating them is how a
 * broken backend comes to look like an empty one:
 *
 *   loading  — skeletons, so the section is visibly pending rather than absent
 *   error    — says so, and never silently substitutes bundled content
 *   empty    — renders nothing at all, so a page with no listings for this
 *              section looks finished rather than broken
 * ========================================================================== */

export function ListingsSection({
  section,
  title,
  description,
  /** How many skeletons to show while loading. */
  placeholders = 3,
}: {
  /** Omit to show every active listing, whatever its section. */
  section?: string
  title: string
  description?: string
  placeholders?: number
}) {
  const listings = useListings(section)
  const fromDatabase = useDatabaseDrivenDirectory()

  // Once the page's own sections are built from `public.listings`, these rows
  // are already on screen in the site's native cards — with their maps, hours
  // and badges — so repeating them here would show every record twice.
  if (fromDatabase.data === true) return null

  /*
   * Before that cutover the page renders the bundled dataset, and the database
   * holds a row for every one of those records because they were imported from
   * it. Rendering all of them here put fourteen emergency services on the page
   * twice — once above as bundled contacts, once below as database listings.
   *
   * So this shows only rows with no bundled counterpart: the listings actually
   * created in the admin panel, which exist nowhere else and would otherwise
   * never appear. Matching is by the same composite identity the importer
   * dedupes on, so a row is classified identically by both.
   */
  const own = (listings.data ?? []).filter((l) => !isFromBundledDirectory(l))

  if (listings.isPending) {
    return (
      <div className="mt-10">
        <SectionHeader title={title} description={description} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: placeholders }, (_, i) => (
            <div key={i} className="overflow-hidden rounded-card border border-line bg-surface">
              <Skeleton className="aspect-[16/9] w-full rounded-none" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (listings.isError) {
    return (
      <div className="mt-10">
        <SectionHeader title={title} description={description} />
        <div
          role="alert"
          className="flex items-start gap-3 rounded-card border border-danger/30 bg-danger-soft px-4 py-3.5"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger-ink" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-body-sm font-bold text-danger-ink">
              These listings could not be loaded.
            </p>
            <p className="mt-1 text-meta text-danger-ink/80">
              {listings.error instanceof Error ? listings.error.message : 'Unknown error'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Nothing here that the page is not already showing — render nothing rather
  // than an empty shell.
  if (own.length === 0) return null

  return (
    <div className="mt-10">
      <SectionHeader title={title} description={description} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {own.map((listing, i) => (
          <Reveal key={listing.id} delay={Math.min(i, 5) * 0.04}>
            <ListingCard listing={listing} className="h-full" />
          </Reveal>
        ))}
      </div>
    </div>
  )
}
