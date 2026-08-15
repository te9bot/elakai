import { AREA_MAP } from '@/data/categories'
import type {
  Chamber,
  DataSource,
  Doctor,
  FacilityCategoryId,
  HealthContact,
  HealthFacility,
  HealthRecord,
} from '@/data/healthcare-types'
import type {
  AreaId,
  Business,
  CategoryGroup,
  CategoryId,
  EmergencyContact,
  IconName,
  LatLng,
  Localized,
  Rental,
  Review,
  TenantType,
  WeeklyHours,
} from '@/data/types'
import { KUSHTIA_CENTER } from './config'
import type { ListingRow } from './listings'

/* ==========================================================================
 * `public.listings` as the whole directory.
 *
 * The base table has sixteen flat text columns, which is enough for a CMS entry
 * and not enough for the directory this site renders — no slug for detail URLs,
 * no coordinates for maps, no weekly hours, no numeric rent to filter on, and
 * one text column where every record carries a { bn, en } pair.
 *
 * Migration 0004 adds those columns. This module is the other half of that
 * change: the row shape they form, and the mappers that turn one such row back
 * into the `Business` / `Rental` / `EmergencyContact` / `HealthRecord` the
 * existing pages already know how to render.
 *
 * That is the point. Nothing above this file learns that its data moved into
 * Postgres — the components, the search ranker and the profile layouts keep
 * their existing types, and this is the single seam where a database row
 * becomes one of them.
 *
 * IDENTITY
 *
 * The domain types key on a string id, and doctors and facilities point at each
 * other by it. `slug` is used for that here rather than the bigint primary key,
 * because slug is also what `/business/:slug` and `/healthcare/:slug` resolve
 * on — so one value serves as identity, as cross-reference and as URL, and
 * there is no mapping table to fall out of step.
 * ========================================================================== */

/* ------------------------------------------------------------------ */
/* Row shape                                                           */
/* ------------------------------------------------------------------ */

/** The columns migration 0004 adds, on top of `ListingRow`. */
export type RichListingRow = ListingRow & {
  slug: string | null
  verified: boolean | null
  featured: boolean | null
  image_seed: number | null

  title_bn: string | null
  title_en: string | null
  description_bn: string | null
  description_en: string | null
  address_bn: string | null
  address_en: string | null
  short_bn: string | null
  short_en: string | null

  area_id: string | null
  lat: number | null
  lng: number | null
  coords_approx: boolean | null

  /** Added by 0005. Null on any project that has not applied it. */
  subcategory: string | null
  alt_phone: string | null
  gallery: unknown

  category_group: string | null
  website: string | null
  facebook: string | null
  rating: number | null
  review_count: number | null
  photo_count: number | null
  hours: unknown
  always_open: boolean | null
  services: unknown
  reviews: unknown

  rent: number | null
  bedrooms: number | null
  bathrooms: number | null
  size_sqft: number | null
  floor: number | null
  tenant_type: string | null
  furnished: boolean | null
  available_from: string | null

  icon: string | null
  scope: string | null
  tone: string | null
  available_24: boolean | null
  priority: number | null

  aliases: unknown
  appointment_phone: string | null
  emergency_phone: string | null
  emergency_24: boolean | null
  tests: unknown
  departments: unknown
  specialty_bn: string | null
  specialty_en: string | null
  designation_bn: string | null
  designation_en: string | null
  qualifications: unknown
  facility_ids: unknown
  doctor_ids: unknown
  chambers: unknown
  verification: string | null
  source: unknown
}

/**
 * Explicit column list, matching the convention in `db.ts` and `listings.ts`:
 * an internal column added later must not silently start shipping to every
 * visitor of the public site.
 */
export const RICH_LISTING_SELECT =
  'id, created_at, section, title, description, phone, email, address, location, ' +
  'category, price, availability, image_url, status, display_order, updated_at, ' +
  'slug, verified, featured, image_seed, ' +
  'title_bn, title_en, description_bn, description_en, address_bn, address_en, short_bn, short_en, ' +
  'area_id, lat, lng, coords_approx, ' +
  'category_group, website, facebook, rating, review_count, photo_count, hours, always_open, services, reviews, ' +
  'rent, bedrooms, bathrooms, size_sqft, floor, tenant_type, furnished, available_from, ' +
  'icon, scope, tone, available_24, priority, ' +
  'aliases, appointment_phone, emergency_phone, emergency_24, tests, departments, ' +
  'specialty_bn, specialty_en, designation_bn, designation_en, qualifications, ' +
  'facility_ids, doctor_ids, chambers, verification, source'

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

/**
 * Rebuilds a `{ bn, en }` pair from its column pair.
 *
 * The flat column is the fallback for both halves, which is what makes a row
 * typed by hand in the Supabase dashboard — or saved from the simple admin form,
 * which only writes the flat columns — render in both languages instead of
 * appearing blank in one of them.
 */
function localized(bn: string | null, en: string | null, flat: string | null): Localized {
  const fallback = flat ?? en ?? bn ?? ''
  return { bn: bn || fallback, en: en || fallback }
}

/** Nullable variant, for fields the domain types leave optional. */
function localizedOrNull(
  bn: string | null,
  en: string | null,
  flat: string | null,
): Localized | undefined {
  if (!bn && !en && !flat) return undefined
  return localized(bn, en, flat)
}

/** Parses a jsonb column that should hold an array, tolerating null and junk. */
function jsonArray<T>(value: unknown): T[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value as T[]
}

function jsonArrayOr<T>(value: unknown, fallback: T[]): T[] {
  return jsonArray<T>(value) ?? fallback
}

function isAreaId(value: string | null): value is AreaId {
  return !!value && value in AREA_MAP
}

function areaOf(row: RichListingRow): AreaId {
  return isAreaId(row.area_id) ? row.area_id : 'kushtia-sadar'
}

/** Whether this row carries its own surveyed position. */
function hasExactCoords(row: RichListingRow): boolean {
  return typeof row.lat === 'number' && typeof row.lng === 'number' && !row.coords_approx
}

/**
 * Coordinates, falling back to the area centre exactly as the bundled data
 * does — so maps and distance sorting still have something to work with.
 *
 * Whether the result is real is reported separately by `hasExactCoords`, and
 * Directions keys off that rather than off this value: a shared area centre is
 * fine for "roughly where in the district", and wrong for "navigate me here".
 */
function coordsOf(row: RichListingRow): LatLng {
  if (typeof row.lat === 'number' && typeof row.lng === 'number') {
    return { lat: row.lat, lng: row.lng }
  }
  return AREA_MAP[areaOf(row)]?.coords ?? KUSHTIA_CENTER
}

/**
 * The record's stable identity — slug where there is one, else the primary key
 * as text. Also what the detail routes resolve on, so the two can never drift.
 */
function idOf(row: RichListingRow): string {
  return row.slug || String(row.id)
}

/**
 * Weekly opening hours from the jsonb column.
 *
 * `always_open` wins over the grid: a record marked 24/7 that also carries a
 * schedule is describing staffed hours, not closing times, and rendering it as
 * "closed now" at 3am would be wrong in the direction that matters.
 */
function hoursOf(row: RichListingRow): WeeklyHours {
  if (row.always_open) return 'always'
  const grid = jsonArray<unknown>(row.hours)
  // Seven entries, one per weekday, or the value is not a schedule this app
  // can read — an empty week renders as "closed", which is the safe reading.
  if (!grid || grid.length !== 7) return [[], [], [], [], [], [], []]
  return grid as WeeklyHours
}

function sourceOf(row: RichListingRow): DataSource {
  const raw = row.source
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const s = raw as Partial<DataSource>
    return {
      kind: s.kind ?? 'directory',
      url: s.url,
      note: s.note,
      // Explicitly null rather than undefined when absent: the profile page
      // reads null as "nobody has checked this" and says so.
      verifiedAt: s.verifiedAt ?? null,
    }
  }
  return { kind: 'directory', verifiedAt: row.verification ?? null }
}

function contactOf(row: RichListingRow): HealthContact {
  return {
    phone: row.phone ?? undefined,
    appointmentPhone: row.appointment_phone ?? undefined,
    emergencyPhone: row.emergency_phone ?? undefined,
    email: row.email ?? undefined,
    website: row.website ?? undefined,
    facebook: row.facebook ?? undefined,
  }
}

/* ------------------------------------------------------------------ */
/* Mappers                                                             */
/* ------------------------------------------------------------------ */

export function listingToBusiness(row: RichListingRow): Business {
  return {
    id: idOf(row),
    slug: idOf(row),
    name: localized(row.title_bn, row.title_en, row.title),
    category: (row.category ?? 'other') as CategoryId,
    group: (row.category_group ?? row.section ?? 'services') as CategoryGroup,
    description: localized(row.description_bn, row.description_en, row.description),
    phone: row.phone ?? '',
    website: row.website ?? undefined,
    address: localized(row.address_bn, row.address_en, row.address),
    area: areaOf(row),
    coords: coordsOf(row),
    coordsApprox: !hasExactCoords(row),
    verified: row.verified ?? false,
    // Zero, not an invented number. The rating component hides itself at 0,
    // which is the correct rendering for "no source has published one".
    rating: row.rating ?? 0,
    reviewCount: row.review_count ?? 0,
    hours: hoursOf(row),
    services: jsonArrayOr<Localized>(row.services, []),
    // The art seed must be stable across reloads, so it falls back to the
    // primary key rather than to anything random.
    imageSeed: row.image_seed ?? row.id,
    photoCount: row.photo_count ?? 0,
    reviews: jsonArrayOr<Review>(row.reviews, []),
    updatedAt: row.updated_at ?? row.created_at ?? '',
    featured: row.featured ?? false,
  }
}

export function listingToRental(row: RichListingRow): Rental {
  return {
    id: idOf(row),
    slug: idOf(row),
    title: localized(row.title_bn, row.title_en, row.title),
    category: (row.category ?? 'house') as Rental['category'],
    description: localized(row.description_bn, row.description_en, row.description),
    phone: row.phone ?? '',
    rent: row.rent ?? 0,
    bedrooms: row.bedrooms ?? 0,
    bathrooms: row.bathrooms ?? 0,
    sizeSqft: row.size_sqft ?? 0,
    tenantType: (row.tenant_type ?? 'any') as TenantType,
    furnished: row.furnished ?? false,
    floor: row.floor ?? undefined,
    area: areaOf(row),
    address: localized(row.address_bn, row.address_en, row.address),
    coords: coordsOf(row),
    coordsApprox: !hasExactCoords(row),
    verified: row.verified ?? false,
    imageSeed: row.image_seed ?? row.id,
    availableFrom: row.available_from ?? '',
    updatedAt: row.updated_at ?? row.created_at ?? '',
  }
}

export function listingToEmergency(row: RichListingRow): EmergencyContact {
  const hasCoords = typeof row.lat === 'number' && typeof row.lng === 'number'

  return {
    id: idOf(row),
    name: localized(row.title_bn, row.title_en, row.title),
    short: localizedOrNull(row.short_bn, row.short_en, null),
    description: localized(row.description_bn, row.description_en, row.description),
    phone: row.phone ?? '',
    icon: (row.icon ?? 'phone') as IconName,
    scope: row.scope === 'national' ? 'national' : 'local',
    tone:
      row.tone === 'danger' || row.tone === 'primary' || row.tone === 'neutral'
        ? row.tone
        : 'primary',
    available24: row.available_24 ?? false,
    // Only when genuinely stored. Falling back to the area centre here would
    // put a "directions" link on a card that has no known location.
    coords: hasCoords ? { lat: row.lat as number, lng: row.lng as number } : undefined,
    address: localizedOrNull(row.address_bn, row.address_en, row.address),
  }
}

/**
 * A healthcare row becomes a doctor or a facility depending on its category,
 * which is the same distinction the bundled dataset draws.
 */
export function listingToHealthRecord(row: RichListingRow): HealthRecord {
  return row.category === 'doctor' ? listingToDoctor(row) : listingToFacility(row)
}

function listingToFacility(row: RichListingRow): HealthFacility {
  return {
    kind: 'facility',
    id: idOf(row),
    slug: idOf(row),
    category: (row.category ?? 'clinic') as FacilityCategoryId,
    name: localized(row.title_bn, row.title_en, row.title),
    aliases: jsonArray<string>(row.aliases),
    description: localized(row.description_bn, row.description_en, row.description),
    address: localizedOrNull(row.address_bn, row.address_en, row.address),
    area: areaOf(row),
    coords:
      typeof row.lat === 'number' && typeof row.lng === 'number'
        ? { lat: row.lat, lng: row.lng }
        : undefined,
    contact: contactOf(row),
    hours: row.always_open || jsonArray(row.hours) ? hoursOf(row) : undefined,
    emergency24: row.emergency_24 ?? undefined,
    services: jsonArray<Localized>(row.services),
    departments: jsonArray<Localized>(row.departments),
    tests: jsonArray<Localized>(row.tests),
    doctorIds: jsonArray<string>(row.doctor_ids),
    // Undefined rather than 0: the profile hides the stars entirely when no
    // source published a rating, which is not the same as rating zero.
    rating: row.rating ?? undefined,
    reviewCount: row.review_count || undefined,
    featured: row.featured ?? undefined,
    source: sourceOf(row),
  }
}

function listingToDoctor(row: RichListingRow): Doctor {
  return {
    kind: 'doctor',
    id: idOf(row),
    slug: idOf(row),
    category: 'doctor',
    name: localized(row.title_bn, row.title_en, row.title),
    aliases: jsonArray<string>(row.aliases),
    specialty: localized(row.specialty_bn, row.specialty_en, row.description),
    qualifications: jsonArrayOr<string>(row.qualifications, []),
    designation: localizedOrNull(row.designation_bn, row.designation_en, null),
    facilityIds: jsonArray<string>(row.facility_ids),
    chambers: jsonArray<Chamber>(row.chambers),
    contact: contactOf(row),
    area: areaOf(row),
    featured: row.featured ?? undefined,
    source: sourceOf(row),
  }
}
