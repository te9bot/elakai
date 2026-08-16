import { CalendarClock, ChevronRight, MapPin, Mail, Tag } from 'lucide-react'
import { Link } from 'react-router-dom'

import { CallButton } from '@/components/call-button'
import { ListingPhoto } from '@/components/listing-photo'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CATEGORY_MAP } from '@/data/categories'
import type { CategoryId, IconName } from '@/data/types'
import { categoryLabel, placeLabel, type Listing } from '@/lib/listings'
import { isDialable } from '@/lib/phone'
import { cn } from '@/lib/utils'

/* ==========================================================================
 * A listing published from the admin panel.
 *
 * Built from the same Card, CallButton and ListingArt the rest of the
 * directory uses, so admin-managed content sits alongside the bundled
 * directory without looking like it arrived from somewhere else.
 *
 * Every field except the title is optional, and each one renders only when it
 * has a value — a listing with nothing but a name is a valid listing, and it
 * should look deliberate rather than like a card full of empty rows.
 * ========================================================================== */

/** Icon for the art fallback, resolved from the category the admin picked. */
function iconFor(category: string): IconName {
  return CATEGORY_MAP[category as CategoryId]?.icon ?? 'store'
}

export function ListingCard({ listing, className }: { listing: Listing; className?: string }) {
  const title = listing.title || 'Untitled listing'
  // Skips a pasted map URL: a card line is not the place for sixty characters
  // of link, and the detail page renders it as an actual link instead.
  const place = placeLabel(listing)
  const dialable = isDialable(listing.phone)

  return (
    <Card className={cn('group flex flex-col overflow-hidden p-0', className)}>
      {/* The whole record is one link to its detail page, following the same
          shape as BusinessCard: the actions below sit outside it, because a
          call button nested inside a link is both invalid and unpredictable —
          a tap would race the navigation against the dial. */}
      <Link
        to={`/listing/${listing.id}`}
        className="flex min-w-0 flex-1 flex-col rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-2">
          {/* Object-cover keeps a portrait upload from letterboxing the card.
              No photo is a normal state, not a broken one, so ListingPhoto
              falls back to the same procedural art the rest of the directory
              uses — and logs the URL if a stored one fails to load. */}
          <ListingPhoto
            src={listing.imageUrl}
            alt={title}
            seed={listing.id}
            icon={iconFor(listing.category)}
            rounded={false}
            className="size-full transition-transform duration-300 group-hover:scale-[1.03]"
          />

          {listing.price && (
            <span className="absolute right-3 top-3 rounded-full bg-surface/90 px-3 py-1 text-meta font-bold text-ink shadow-card backdrop-blur">
              {listing.price}
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col p-4">
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 text-body font-bold leading-snug text-balance transition-colors group-hover:text-primary">
              {title}
            </h3>
            <ChevronRight
              className="mt-0.5 size-4 shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </div>

          {listing.category && (
            <p className="mt-1 flex items-center gap-1.5 text-meta font-medium text-ink-subtle">
              <Tag className="size-3.5 shrink-0" aria-hidden="true" />
              {categoryLabel(listing.category)}
            </p>
          )}

          {listing.description && (
            <p className="mt-2 line-clamp-3 text-meta leading-relaxed text-pretty text-ink-muted">
              {listing.description}
            </p>
          )}

          <dl className="mt-3 space-y-1.5">
            {place && (
              <div className="flex items-start gap-1.5 text-meta text-ink-muted">
                <dt className="sr-only">Location</dt>
                <MapPin className="mt-px size-3.5 shrink-0 text-ink-subtle" aria-hidden="true" />
                <dd className="min-w-0">{place}</dd>
              </div>
            )}
            {listing.availability && (
              <div className="flex items-start gap-1.5 text-meta text-ink-muted">
                <dt className="sr-only">Availability</dt>
                <CalendarClock
                  className="mt-px size-3.5 shrink-0 text-ink-subtle"
                  aria-hidden="true"
                />
                <dd className="min-w-0">{listing.availability}</dd>
              </div>
            )}
          </dl>
        </div>
      </Link>

      {/* Only rendered when at least one action would actually do something.
          `dialable` rather than `listing.phone`: a stored placeholder is a
          non-empty string that CallButton deliberately will not dial, and a
          lone Email button should then take the full width. */}
      {(dialable || listing.email) && (
        <div className="flex gap-2 border-t border-line p-3">
          {dialable && (
            <CallButton
              phone={listing.phone}
              label={title}
              size="md"
              className={cn(listing.email ? 'flex-1' : 'w-full')}
            />
          )}
          {listing.email && (
            <Button
              asChild
              variant="secondary"
              size="md"
              className={cn(dialable ? 'flex-1' : 'w-full')}
            >
              <a href={`mailto:${listing.email}`} aria-label={`Email ${title}`}>
                <Mail aria-hidden="true" />
                Email
              </a>
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}
