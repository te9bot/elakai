import { Link, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Globe,
  Mail,
  MapPin,
  Tag,
  Wallet,
} from 'lucide-react'

import { CallButton, PhoneLink } from '@/components/call-button'
import { DirectionsButton } from '@/components/directions-button'
import { ListingArt } from '@/components/listing-art'
import { Section } from '@/components/layout/section'
import { Reveal } from '@/components/reveal'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CATEGORY_MAP } from '@/data/categories'
import type { CategoryId, IconName } from '@/data/types'
import { useListing } from '@/hooks/use-queries'
import { categoryLabel, sectionLabel, type Listing } from '@/lib/listings'
import { normalizePhone } from '@/lib/phone'

/* ==========================================================================
 * /listing/:id — one admin-published listing.
 *
 * This page is what the listing cards were missing. Before it existed, content
 * published from the admin panel rendered as a card with nowhere to go: the
 * data was in Postgres and on the page, but there was no route to open and no
 * detail to open it onto, which is what "the listing appears but clicking it
 * does nothing" was.
 *
 * The id in the URL is the `public.listings` primary key — the same value the
 * admin table shows and the same one the card links with. No slug, no second
 * identifier, no mapping table: one id from the database through to the address
 * bar, so there is nothing to fall out of sync.
 *
 * Every state is explicit and distinguishable, because on a directory the
 * difference between "loading", "no such listing" and "the backend is down"
 * is the difference between waiting, going back, and trying again later.
 * ========================================================================== */

function iconFor(category: string): IconName {
  return CATEGORY_MAP[category as CategoryId]?.icon ?? 'store'
}

export default function ListingPage() {
  const { id } = useParams<{ id: string }>()
  const listing = useListing(id)

  if (listing.isPending) return <LoadingState />
  if (listing.isError) {
    return (
      <FailureState
        icon={<AlertTriangle className="size-7" aria-hidden="true" />}
        title="This listing could not be loaded."
        body={
          listing.error instanceof Error
            ? listing.error.message
            : 'Something went wrong reaching the server.'
        }
        action={
          <Button onClick={() => void listing.refetch()}>Try again</Button>
        }
      />
    )
  }

  // Null covers never-existed, deleted and unpublished alike — see
  // `getListingById`. All three are "this is not here", so they read the same.
  if (!listing.data) {
    return (
      <FailureState
        icon={<MapPin className="size-7" aria-hidden="true" />}
        title="This listing is not available."
        body="It may have been removed, or the link may be wrong."
        action={
          <Button asChild>
            <Link to="/">Back to ELAKAI</Link>
          </Button>
        }
      />
    )
  }

  return <ListingDetail listing={listing.data} />
}

/* ------------------------------------------------------------------ */
/* The record                                                          */
/* ------------------------------------------------------------------ */

function ListingDetail({ listing }: { listing: Listing }) {
  const title = listing.title || 'Untitled listing'
  const phone = normalizePhone(listing.phone)
  const backTo = listing.section ? sectionPath(listing.section) : '/'

  // Every value that could seed a "get directions" link. Preferring the street
  // address over the area name gives the maps app the more specific of the two.
  const mapQuery = listing.address || listing.location

  return (
    <>
      {/* ---- Hero ---- */}
      <div className="border-b border-line bg-surface">
        <div className="container py-6 sm:py-8">
          <Link
            to={backTo}
            className="mb-5 inline-flex items-center gap-1.5 rounded-control text-body-sm font-bold text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {listing.section ? sectionLabel(listing.section) : 'Back'}
          </Link>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-start">
            <div className="overflow-hidden rounded-card border border-line bg-surface-2">
              <div className="relative aspect-[16/10] w-full">
                {listing.imageUrl ? (
                  <img
                    src={listing.imageUrl}
                    alt={title}
                    className="size-full object-cover"
                    // Above the fold on this route, so it is the one image on
                    // the page that must not be deferred. Lowercase because
                    // React 18 passes unknown lowercase attributes through but
                    // warns on the camelCase spelling it does not yet map.
                    loading="eager"
                    {...{ fetchpriority: 'high' }}
                  />
                ) : (
                  <ListingArt
                    seed={listing.id}
                    icon={iconFor(listing.category)}
                    rounded={false}
                    className="size-full"
                  />
                )}
              </div>
            </div>

            <div className="min-w-0">
              {listing.category && (
                <p className="flex items-center gap-1.5 text-meta font-bold uppercase text-primary">
                  <Tag className="size-3.5 shrink-0" aria-hidden="true" />
                  {categoryLabel(listing.category)}
                </p>
              )}

              <h1 className="mt-2 text-display text-balance">{title}</h1>

              {listing.price && (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-body-sm font-bold text-ink">
                  <Wallet className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
                  {listing.price}
                </p>
              )}

              {listing.description && (
                <p className="mt-4 whitespace-pre-line text-body leading-relaxed text-pretty text-ink-muted">
                  {listing.description}
                </p>
              )}

              {/* The primary actions. CallButton renders nothing at all when
                  there is no dialable number, so this row never contains a
                  control that would do nothing when tapped. */}
              <div className="mt-6 flex flex-wrap gap-2">
                <CallButton phone={listing.phone} label={title} size="lg" className="min-w-[10rem] flex-1" />

                {/* The flat `listings` row has no coordinate columns until
                    migration 0004, so this resolves through the address —
                    which for these records is the more precise of the two
                    anyway. Once coordinates exist they take precedence
                    automatically, with no change here. */}
                <DirectionsButton
                  address={mapQuery}
                  label={title}
                  size="lg"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Details ---- */}
      <Section>
        <Reveal>
          <Card className="p-5 sm:p-6">
            <h2 className="text-heading">Contact & details</h2>

            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              {phone.display && (
                <Row icon={<CallIcon />} label="Phone">
                  <PhoneLink phone={listing.phone} className="text-body-sm" />
                  {phone.placeholder && (
                    <span className="mt-1 block text-meta text-ink-subtle">
                      Sample number — not connected.
                    </span>
                  )}
                </Row>
              )}

              {listing.email && (
                <Row icon={<Mail className="size-4" aria-hidden="true" />} label="Email">
                  <a
                    href={`mailto:${listing.email}`}
                    className="rounded text-body-sm font-bold text-primary transition-colors hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {listing.email}
                  </a>
                </Row>
              )}

              {listing.address && (
                <Row icon={<MapPin className="size-4" aria-hidden="true" />} label="Address">
                  <span className="text-body-sm">{listing.address}</span>
                </Row>
              )}

              {listing.location && (
                <Row icon={<Globe className="size-4" aria-hidden="true" />} label="Area">
                  <span className="text-body-sm">{listing.location}</span>
                </Row>
              )}

              {listing.availability && (
                <Row
                  icon={<CalendarClock className="size-4" aria-hidden="true" />}
                  label="Opening hours"
                >
                  <span className="text-body-sm">{listing.availability}</span>
                </Row>
              )}
            </dl>

            {listing.updatedAt && (
              <p className="mt-6 border-t border-line pt-4 text-meta text-ink-subtle">
                Last updated {formatUpdated(listing.updatedAt)}.
              </p>
            )}
          </Card>
        </Reveal>
      </Section>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Parts                                                               */
/* ------------------------------------------------------------------ */

function CallIcon() {
  // Matching the lucide sizing of its siblings without importing Phone twice.
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0 text-ink-subtle">{icon}</span>
      <div className="min-w-0">
        <dt className="text-meta font-semibold text-ink-subtle">{label}</dt>
        <dd className="mt-0.5 min-w-0 break-words">{children}</dd>
      </div>
    </div>
  )
}

/** Where the "back" link goes, based on the section the listing belongs to. */
function sectionPath(section: string): string {
  switch (section) {
    case 'healthcare':
      return '/healthcare'
    case 'rentals':
      return '/rentals'
    case 'emergency':
      return '/emergency'
    case 'services':
    case 'utilities':
      return '/services'
    default:
      return '/'
  }
}

/**
 * A plain date rather than "3 days ago". A relative stamp on a directory entry
 * invites the reader to infer how current the information is, and the write
 * time of a row is not evidence of that.
 */
function formatUpdated(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'recently'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

/* ------------------------------------------------------------------ */
/* States                                                              */
/* ------------------------------------------------------------------ */

function LoadingState() {
  return (
    <>
      <div className="border-b border-line bg-surface">
        <div className="container py-6 sm:py-8">
          <Skeleton className="mb-5 h-5 w-28" />
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <Skeleton className="aspect-[16/10] w-full rounded-card" />
            <div className="space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="mt-4 h-12 w-full" />
            </div>
          </div>
        </div>
      </div>
      <Section>
        <Skeleton className="h-56 w-full rounded-card" />
      </Section>
    </>
  )
}

function FailureState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode
  title: string
  body: string
  action: React.ReactNode
}) {
  return (
    <Section className="min-h-[60vh]">
      <div className="mx-auto max-w-md rounded-card border border-line bg-surface px-6 py-14 text-center shadow-card">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-surface-2 text-ink-muted">
          {icon}
        </span>
        <h1 className="mt-4 text-title text-balance">{title}</h1>
        <p className="mt-2 text-body-sm text-pretty text-ink-muted">{body}</p>
        <div className="mt-6 flex justify-center">{action}</div>
      </div>
    </Section>
  )
}
