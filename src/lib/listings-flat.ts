import { BUSINESSES } from '@/data/businesses'
import { AREAS, AREA_MAP, CATEGORY_MAP } from '@/data/categories'
import { EMERGENCY_CONTACTS } from '@/data/emergency'
import { RENTALS } from '@/data/rentals'
import type {
  AreaId,
  Business,
  CategoryGroup,
  CategoryId,
  EmergencyContact,
  IconName,
  Localized,
  Rental,
  TenantType,
  WeeklyHours,
} from '@/data/types'
import { listingKey } from './listings-import'
import type { Listing } from './listings'

/* ==========================================================================
 * `public.listings` as the directory — with only the sixteen columns it has.
 *
 * WHY THIS EXISTS ALONGSIDE listings-rich.ts
 *
 * `listings-rich.ts` turns a database row into a `Business` / `Rental` /
 * `EmergencyContact` using the columns migration 0004 adds: slug, coordinates,
 * numeric rent, bilingual pairs, weekly hours. That is the better mapping, and
 * it is what runs on a project that has applied 0004.
 *
 * On a project that has not, every public page fell back to the bundled arrays
 * in `src/data/` — and that is the bug this module fixes. The fallback meant
 * the site rendered a *copy* of the directory rather than the directory: an
 * admin could edit a title, delete a listing or upload a photograph, watch the
 * row change in Postgres, and see nothing move on the public site, because the
 * page was reading an array compiled into the bundle. Delete was the worst of
 * them — the row went, the card stayed.
 *
 * So this maps the same domain types out of the flat sixteen columns instead.
 * The database decides what exists and what every field says; the bundled
 * record is consulted only for what the flat schema has nowhere to store.
 *
 * THE SUPPLEMENT, AND WHY IT IS NOT A SECOND SOURCE OF TRUTH
 *
 * Coordinates, weekly hours, bedroom counts, ratings and the Bengali half of
 * every text field have no column here. They are read from the bundled record
 * this row was imported from, matched on the same composite identity the
 * importer dedupes on (section + title, normalised). The rules are strict:
 *
 *   - the database's value always wins where the database has one;
 *   - the supplement only fills a gap the schema cannot express;
 *   - a row with no bundled twin — anything created in the admin panel — is
 *     rendered from the database alone, with neutral defaults;
 *   - nothing is rendered because it is in a bundled array. If Postgres has no
 *     row for it, it is not on the site.
 *
 * A bilingual field keeps its Bengali half only while the English half still
 * matches the bundled text. The moment an admin edits it, the edit is what both
 * languages show — a stale Bengali sentence beside a corrected English one is
 * worse than an untranslated pair, and this schema has one column for the two.
 *
 * All of this stops mattering the day migration 0004 is applied: `hasRichSchema`
 * goes true, `listings-rich.ts` takes over, and nothing here is called again.
 * ========================================================================== */

/* ------------------------------------------------------------------ */
/* Bundled supplements                                                 */
/* ------------------------------------------------------------------ */

/**
 * The bundled records, indexed by the identity the importer wrote them under.
 *
 * Built lazily and once: these arrays are already in the bundle, and the maps
 * are only needed if a flat-schema page actually renders.
 */
let businessByKey: Map<string, Business> | null = null
let rentalByKey: Map<string, Rental> | null = null
let emergencyByKey: Map<string, EmergencyContact> | null = null

function businessSupplements(): Map<string, Business> {
  // A business's section is its category group — that is what `fromBusiness`
  // in listings-import.ts wrote, so it is what the row is keyed on.
  businessByKey ??= new Map(BUSINESSES.map((b) => [listingKey(b.group, b.name.en), b]))
  return businessByKey
}

function rentalSupplements(): Map<string, Rental> {
  rentalByKey ??= new Map(RENTALS.map((r) => [listingKey('rentals', r.title.en), r]))
  return rentalByKey
}

function emergencySupplements(): Map<string, EmergencyContact> {
  emergencyByKey ??= new Map(
    EMERGENCY_CONTACTS.map((c) => [listingKey('emergency', c.name.en), c]),
  )
  return emergencyByKey
}

/* ------------------------------------------------------------------ */
/* Field helpers                                                       */
/* ------------------------------------------------------------------ */

/**
 * One text column read as a bilingual pair.
 *
 * Returns the bundled pair while the English half still matches what is stored,
 * so an untouched record keeps its Bengali. Any other stored text is shown in
 * both languages — see the note on translation drift above.
 */
function bilingual(stored: string, supplement?: Localized): Localized {
  const text = stored.trim()
  if (!text) return supplement ?? { bn: '', en: '' }
  if (supplement && supplement.en.trim() === text) return supplement
  return { bn: text, en: text }
}

/** A URL-safe identity for a record the flat schema gives no slug. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * The slug a flat row is reachable at.
 *
 * The bundled slug when this is that record, so a link printed before the
 * cutover still resolves. Otherwise the title with the row id appended — the id
 * is what keeps two listings called "City Pharmacy" from claiming one URL.
 */
function slugOf(listing: Listing, supplement?: { slug: string }): string {
  if (supplement) return supplement.slug
  const base = slugify(listing.title)
  return base ? `${base}-${listing.id}` : `listing-${listing.id}`
}

/** `location` read back to an area id — the importer stored its label. */
export function areaFromLabel(label: string, fallback: AreaId = 'kushtia-sadar'): AreaId {
  const text = label.trim().toLowerCase()
  if (!text) return fallback
  for (const area of AREAS) {
    if (area.id === text || area.name.en.toLowerCase() === text || area.name.bn === label.trim()) {
      return area.id
    }
  }
  // "Holding 12, Kushtia Sadar" and "Kushtia Sadar Bazar" both name an area a
  // strict comparison would miss.
  for (const area of AREAS) {
    if (text.includes(area.name.en.toLowerCase())) return area.id
  }
  return fallback
}

/**
 * The monthly rent, read out of the free-text price column.
 *
 * The importer writes "12,000 BDT/month"; an admin might type "12000 per
 * month", "BDT 12,000" or "Negotiable". The first run of digits is the rent,
 * and text with no digits at all is zero — which the filters and the card both
 * already treat as "no price given".
 */
export function parseRent(price: string): number {
  const match = price.replace(/[,\s]/g, '').match(/\d+/)
  return match ? Number(match[0]) : 0
}

/** The ISO date out of "Available from 2026-08-01", or ''. */
export function parseAvailableFrom(availability: string): string {
  return availability.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? ''
}

/** Whether an availability line describes a round-the-clock service. */
export function saysAlwaysOpen(availability: string): boolean {
  return /24\s*[/x-]?\s*7|24 hours|round[ -]the[ -]clock/i.test(availability)
}

/**
 * Opening hours for a row whose schema has nowhere to record them.
 *
 * Saturday to Thursday, 9am to 6pm — the ordinary working week here, and the
 * same shape the bundled dataset gives a business with no unusual hours. It is
 * a presentational default, not a claim: migration 0004's `hours` column is
 * what lets an admin state the real ones, and a bundled record's own hours
 * always win over this.
 */
const DEFAULT_HOURS: WeeklyHours = [0, 1, 2, 3, 4, 5, 6].map((day) =>
  day === 5 ? [] : [{ open: 9 * 60, close: 18 * 60 }],
)

function hoursFor(listing: Listing, supplement?: Business): WeeklyHours {
  if (saysAlwaysOpen(listing.availability)) return 'always'
  return supplement?.hours ?? DEFAULT_HOURS
}

/**
 * The verified flag.
 *
 * The column when the project has it, the bundled record's flag when it does
 * not, and false for a row that is neither. Null from the database means the
 * column is absent — see `Listing.verified`.
 */
function verifiedOf(listing: Listing, supplement?: { verified: boolean }): boolean {
  if (typeof listing.verified === 'boolean') return listing.verified
  return supplement?.verified ?? false
}

function categoryOf(listing: Listing, fallback: CategoryId): CategoryId {
  const id = listing.category.trim() as CategoryId
  return CATEGORY_MAP[id] ? id : fallback
}

const GROUPS: CategoryGroup[] = ['emergency', 'healthcare', 'services', 'rentals', 'utilities']

function groupOf(listing: Listing, fallback: CategoryGroup): CategoryGroup {
  const section = listing.section.trim() as CategoryGroup
  return GROUPS.includes(section) ? section : fallback
}

/** The services list, as the bilingual pairs the cards render. */
function servicesOf(listing: Listing, supplement?: Business): Localized[] {
  if (listing.services.length) return listing.services.map((s) => ({ bn: s, en: s }))
  return supplement?.services ?? []
}

/* ------------------------------------------------------------------ */
/* Mappers                                                             */
/* ------------------------------------------------------------------ */

export function flatToBusiness(listing: Listing): Business {
  const supplement = businessSupplements().get(listingKey(listing.section, listing.title))
  const group = groupOf(listing, supplement?.group ?? 'services')
  const category = categoryOf(listing, supplement?.category ?? 'electrician')
  const area = listing.location.trim()
    ? areaFromLabel(listing.location, supplement?.area ?? 'kushtia-sadar')
    : (supplement?.area ?? 'kushtia-sadar')

  return {
    id: String(listing.id),
    slug: slugOf(listing, supplement),
    name: bilingual(listing.title, supplement?.name),
    category,
    group,
    description: bilingual(listing.description, supplement?.description),
    phone: listing.phone || supplement?.phone || '',
    website: supplement?.website,
    address: bilingual(listing.address, supplement?.address),
    area,
    // No coordinate columns, so a record with no bundled twin is placed at the
    // centre of its area and says so — `coordsApprox` is what stops the
    // directions button offering a route to a guess. See lib/directions.ts.
    coords: supplement?.coords ?? AREA_MAP[area].coords,
    coordsApprox: supplement ? supplement.coordsApprox : true,
    verified: verifiedOf(listing, supplement),
    rating: supplement?.rating ?? 0,
    reviewCount: supplement?.reviewCount ?? 0,
    hours: hoursFor(listing, supplement),
    services: servicesOf(listing, supplement),
    imageSeed: supplement?.imageSeed ?? listing.id,
    imageUrl: listing.imageUrl ?? supplement?.imageUrl ?? null,
    photoCount: supplement?.photoCount ?? 0,
    reviews: supplement?.reviews ?? [],
    updatedAt: listing.updatedAt || listing.createdAt || '',
    featured: listing.featured ?? supplement?.featured ?? false,
  }
}

const RENTAL_CATEGORIES: Rental['category'][] = [
  'house',
  'apartment',
  'bachelor',
  'office',
  'shop',
  'warehouse',
]

export function flatToRental(listing: Listing): Rental {
  const supplement = rentalSupplements().get(listingKey(listing.section, listing.title))
  const stored = listing.category.trim() as Rental['category']
  const category = RENTAL_CATEGORIES.includes(stored) ? stored : (supplement?.category ?? 'house')
  const area = listing.location.trim()
    ? areaFromLabel(listing.location, supplement?.area ?? 'kushtia-sadar')
    : (supplement?.area ?? 'kushtia-sadar')

  // The price column is free text, so the number inside it is the filterable
  // rent. A bundled twin's rent is used only when the text holds no number at
  // all — otherwise an admin correcting a price would not move the listing in
  // a price sort.
  const parsed = parseRent(listing.price)
  const rent = parsed || supplement?.rent || 0

  return {
    id: String(listing.id),
    slug: slugOf(listing, supplement),
    title: bilingual(listing.title, supplement?.title),
    category,
    description: bilingual(listing.description, supplement?.description),
    phone: listing.phone || supplement?.phone || '',
    rent,
    // Room counts, floor area and furnishing have no columns here. Zero is a
    // real answer for the card, which hides a spec it has no figure for.
    bedrooms: supplement?.bedrooms ?? 0,
    bathrooms: supplement?.bathrooms ?? 0,
    sizeSqft: supplement?.sizeSqft ?? 0,
    tenantType: supplement?.tenantType ?? ('any' as TenantType),
    furnished: supplement?.furnished ?? false,
    floor: supplement?.floor,
    area,
    address: bilingual(listing.address, supplement?.address),
    coords: supplement?.coords ?? AREA_MAP[area].coords,
    coordsApprox: supplement ? supplement.coordsApprox : true,
    verified: verifiedOf(listing, supplement),
    imageSeed: supplement?.imageSeed ?? listing.id,
    imageUrl: listing.imageUrl ?? supplement?.imageUrl ?? null,
    availableFrom: parseAvailableFrom(listing.availability) || supplement?.availableFrom || '',
    updatedAt: listing.updatedAt || listing.createdAt || '',
  }
}

export function flatToEmergency(listing: Listing): EmergencyContact {
  const supplement = emergencySupplements().get(listingKey(listing.section, listing.title))

  return {
    id: String(listing.id),
    name: bilingual(listing.title, supplement?.name),
    short: supplement?.short,
    description: bilingual(listing.description, supplement?.description),
    phone: listing.phone || supplement?.phone || '',
    // Icon, tone and scope are presentation, and the flat schema carries none
    // of them. A contact created in the admin panel takes its icon from its
    // category and the neutral treatment, rather than borrowing another card's
    // urgency.
    icon:
      supplement?.icon ??
      ((CATEGORY_MAP[listing.category as CategoryId]?.icon ?? 'phone') as IconName),
    scope: supplement?.scope ?? 'local',
    tone: supplement?.tone ?? 'primary',
    available24: saysAlwaysOpen(listing.availability) || supplement?.available24 || false,
    coords: supplement?.coords,
    address: listing.address.trim()
      ? bilingual(listing.address, supplement?.address)
      : supplement?.address,
    imageUrl: listing.imageUrl ?? supplement?.imageUrl ?? null,
  }
}
