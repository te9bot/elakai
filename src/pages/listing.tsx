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
import { ListingPhoto } from '@/components/listing-photo'
import { Section } from '@/components/layout/section'
import { Reveal } from '@/components/reveal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CATEGORY_MAP } from '@/data/categories'
import type { CategoryId, IconName } from '@/data/types'
import { useListing } from '@/hooks/use-queries'
import {
  categoryLabel,
  isLink,
  mapLink,
  placeLabel,
  sectionLabel,
  type Listing,
} from '@/lib/listings'
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

/**
 * The hero's fact chips.
 *
 * `Badge` is `whitespace-nowrap` by default, which is right for a one-word
 * status and wrong here: these carry editor-supplied free text, and a full
 * street address in a chip that refuses to wrap is 433px wide on a 390px phone
 * — enough to push the whole document sideways and give every page a horizontal
 * scrollbar. So the chips wrap, and `items-start` keeps the icon on the first
 * line rather than floating to the middle of a two-line address.
 */
const CHIP = 'max-w-full items-start whitespace-normal text-left'

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
  // address over the area name gives the maps app the more specific of the two,
  // and a pasted map URL is never handed to it as a search string.
  const mapQuery = [listing.address, listing.location].find((v) => v && !isLink(v)) ?? ''

  // The shortest honest answer to "where is this?", for the chip beside the
  // title. The full address still appears in the details card below.
  const place = placeLabel(listing)

  // An editor who pasted a Google Maps share link gets a real link out of it,
  // not sixty characters of URL rendered where an area name belongs.
  const map = mapLink(listing)

  const hasDetails = Boolean(
    phone.display || listing.email || place || map || listing.availability,
  )

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

          {/* Identity and image sit side by side on desktop and stack image-first
              on mobile, so the photograph is never what a phone opens onto —
              the name and the call button are. `items-start` keeps the two
              columns top-aligned instead of the shorter one floating centred. */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start">
            <div className="overflow-hidden rounded-card border border-line bg-surface-2">
              {/* Fixed ratio, so the card reserves its space before the image
                  decodes and the text beside it does not jump on load. */}
              <div className="relative aspect-[16/10] w-full">
                <ListingPhoto
                  src={listing.imageUrl}
                  alt={title}
                  seed={listing.id}
                  icon={iconFor(listing.category)}
                  rounded={false}
                  priority
                  className="size-full"
                />
              </div>
            </div>

            <div className="min-w-0">
              {/* ---- 1. Identity ---- */}
              {listing.category && (
                <p className="flex items-center gap-1.5 text-meta font-bold uppercase text-primary">
                  <Tag className="size-3.5 shrink-0" aria-hidden="true" />
                  {categoryLabel(listing.category)}
                </p>
              )}

              <h1 className="mt-2 text-display text-balance">{title}</h1>

              {/* ---- 2. Status and 3. Location ----
                  One row of chips rather than three stacked paragraphs: these
                  are the facts a visitor checks at a glance before deciding to
                  call, and they read faster side by side. */}
              {(listing.price || listing.availability || place) && (
                <div className="mt-4 flex flex-wrap items-start gap-2">
                  {listing.price && (
                    <Badge variant="primary" size="lg" className={CHIP}>
                      <Wallet className="mt-0.5" aria-hidden="true" />
                      {listing.price}
                    </Badge>
                  )}
                  {listing.availability && (
                    <Badge variant="success" size="lg" className={CHIP}>
                      <CalendarClock className="mt-0.5" aria-hidden="true" />
                      {listing.availability}
                    </Badge>
                  )}
                  {place && (
                    <Badge variant="outline" size="lg" className={CHIP}>
                      <MapPin className="mt-0.5" aria-hidden="true" />
                      {place}
                    </Badge>
                  )}
                </div>
              )}

              {/* ---- 4. Main action ----
                  Directly under the identity block, above the prose: the reason
                  most people open a directory entry is to call it. CallButton
                  renders nothing at all when there is no dialable number, so
                  this row never contains a control that would do nothing when
                  tapped. */}
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
                  className="min-w-[10rem] flex-1"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- 5. About, then 6. Contact and location ----
          One section, two cards, so the vertical rhythm between them is the
          same `space-y` the rest of the site uses rather than two sections'
          padding meeting in the middle. */}
      <Section className="space-y-5">
        {/* About is its own card rather than a paragraph in the hero: a long
            description crammed beside the image pushed the call button below
            the fold on every phone, and that is the one control that must not
            move. */}
        {listing.description && (
          <Reveal>
            <Card className="p-5 sm:p-6">
              <h2 className="text-heading">About</h2>
              <p className="mt-3 whitespace-pre-line text-body leading-relaxed text-pretty text-ink-muted">
                {listing.description}
              </p>
            </Card>
          </Reveal>
        )}

        {/* ---- 7. Services ----
            Tags rather than a bulleted list, matching how the business profile
            already presents the same field, so one listing does not look like
            it came from a different site than the next. */}
        {listing.services.length > 0 && (
          <Reveal>
            <Card className="p-5 sm:p-6">
              <h2 className="text-heading">Services</h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {listing.services.map((service) => (
                  <li key={service}>
                    <Badge variant="neutral" size="md" className="max-w-full whitespace-normal">
                      {service}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>
        )}

        {/* Suppressed entirely when there is nothing to put in it. A listing
            with only a name is valid, and an empty card under a heading reads
            as content that failed to load rather than content that is absent. */}
        {hasDetails && (
        <Reveal>
          <Card className="p-5 sm:p-6">
            <h2 className="text-heading">Contact &amp; location</h2>

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

              {listing.address && !isLink(listing.address) && (
                <Row icon={<MapPin className="size-4" aria-hidden="true" />} label="Address">
                  <span className="text-body-sm">{listing.address}</span>
                </Row>
              )}

              {listing.location && !isLink(listing.location) && (
                <Row icon={<Globe className="size-4" aria-hidden="true" />} label="Area">
                  <span className="text-body-sm">{listing.location}</span>
                </Row>
              )}

              {/* The pasted map link, as a link. `noopener` because it opens in
                  a new tab, and `nofollow` because this is editor-supplied. */}
              {map && (
                <Row icon={<MapPin className="size-4" aria-hidden="true" />} label="Map">
                  <a
                    href={map}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="rounded text-body-sm font-bold text-primary transition-colors hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Open in Google Maps
                  </a>
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
        )}
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
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
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
