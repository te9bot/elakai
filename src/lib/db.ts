import type {
  AreaId,
  Business,
  CategoryGroup,
  CategoryId,
  EmergencyContact,
  IconName,
  Localized,
  Rental,
  Review,
  TenantType,
  WeeklyHours,
} from '@/data/types'
import type { Chamber, Doctor, HealthFacility, SourceKind } from '@/data/healthcare-types'
import type { CoverageBandId } from '@/data/coverage'

/* ==========================================================================
 * Row shapes and mappers.
 *
 * One place where Postgres column names meet the types the UI already speaks.
 * Keeping this separate from api.ts matters: the admin panel writes the same
 * tables the public site reads, and both sides need the same translation
 * without one importing the other's query code.
 *
 * Columns are `_bn` / `_en` pairs rather than jsonb because an admin form has
 * to bind to them individually and Postgres has to index them. `loc()` folds a
 * pair back into the `Localized` object the components expect.
 * ========================================================================== */

/* ------------------------------------------------------------------ */
/* Row types                                                           */
/* ------------------------------------------------------------------ */

export type RecordStatus = 'draft' | 'published' | 'archived'
export type VerificationLevel = 'unverified' | 'partial' | 'verified'

type ServiceJoin = { sort_order: number; services: { name_bn: string; name_en: string } | null }

export type BusinessRow = {
  id: string
  slug: string
  category: CategoryId
  group: CategoryGroup
  name_bn: string
  name_en: string
  description_bn: string | null
  description_en: string | null
  phone: string | null
  website: string | null
  address_bn: string | null
  address_en: string | null
  area_id: AreaId | null
  lat: number | null
  lng: number | null
  hours: unknown
  always_open: boolean
  rating: number | string | null
  review_count: number
  verified: boolean
  image_seed: number
  photo_count: number
  status: RecordStatus
  featured: boolean
  updated_at: string
  business_services?: ServiceJoin[] | null
  reviews?: ReviewRow[] | null
}

export type ReviewRow = {
  id: string
  author_bn: string | null
  author_en: string | null
  rating: number | string
  comment_bn: string | null
  comment_en: string | null
  reviewed_on: string | null
}

export type RentalRow = {
  id: string
  slug: string
  category: Rental['category']
  title_bn: string
  title_en: string
  description_bn: string | null
  description_en: string | null
  rent: number
  bedrooms: number
  bathrooms: number
  size_sqft: number | null
  floor: number | null
  tenant_type: TenantType
  furnished: boolean
  address_bn: string | null
  address_en: string | null
  area_id: AreaId | null
  lat: number | null
  lng: number | null
  owner_name: string | null
  owner_phone: string | null
  available_from: string | null
  image_seed: number
  verified: boolean
  status: RecordStatus
  featured: boolean
  updated_at: string
}

export type EmergencyRow = {
  id: string
  name_bn: string
  name_en: string
  short_bn: string | null
  short_en: string | null
  description_bn: string | null
  description_en: string | null
  phone: string
  icon: IconName
  scope: 'national' | 'local'
  tone: 'danger' | 'primary' | 'neutral'
  available_24: boolean
  address_bn: string | null
  address_en: string | null
  lat: number | null
  lng: number | null
  priority: number
  status: RecordStatus
}

/**
 * One chip in one of the two homepage bands.
 *
 * Deliberately thin: the row says *which category, which band, in what order*
 * and nothing about how the chip looks. Name, emoji and icon are resolved from
 * the category itself, so renaming a category renames it everywhere at once
 * rather than in the catalogue and separately in the strip.
 */
export type CategoryBarRow = {
  id: string
  category_id: CategoryId
  band: CoverageBandId
  label_bn: string | null
  label_en: string | null
  target_path: string | null
  sort_order: number
  status: RecordStatus
}

export type FacilityRow = {
  id: string
  slug: string
  category: HealthFacility['category']
  name_bn: string
  name_en: string
  aliases: string[] | null
  description_bn: string | null
  description_en: string | null
  address_bn: string | null
  address_en: string | null
  area_id: AreaId | null
  lat: number | null
  lng: number | null
  coords_approx: boolean
  phone: string | null
  appointment_phone: string | null
  emergency_phone: string | null
  email: string | null
  website: string | null
  facebook: string | null
  hours: unknown
  always_open: boolean
  emergency_24: boolean
  rating: number | string | null
  review_count: number | null
  verification: VerificationLevel
  source_kind: SourceKind
  source_url: string | null
  source_note_bn: string | null
  source_note_en: string | null
  source_verified_at: string | null
  status: RecordStatus
  featured: boolean
  facility_services?: ServiceJoin[] | null
}

export type ChamberRow = {
  id: string
  facility_id: string | null
  place_bn: string | null
  place_en: string | null
  area_id: AreaId | null
  visiting_hours_bn: string | null
  visiting_hours_en: string | null
  appointment_phone: string | null
  sort_order: number
}

export type DoctorRow = {
  id: string
  slug: string
  name_bn: string
  name_en: string
  aliases: string[] | null
  qualifications: string[] | null
  specialty_bn: string | null
  specialty_en: string | null
  designation_bn: string | null
  designation_en: string | null
  phone: string | null
  appointment_phone: string | null
  email: string | null
  website: string | null
  facebook: string | null
  area_id: AreaId | null
  verification: VerificationLevel
  source_kind: SourceKind
  source_url: string | null
  source_note_bn: string | null
  source_note_en: string | null
  source_verified_at: string | null
  status: RecordStatus
  featured: boolean
  chambers?: ChamberRow[] | null
  doctor_facilities?: { facility_id: string }[] | null
}

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_AREA: AreaId = 'kushtia-sadar'

/** Folds a `_bn` / `_en` column pair back into one `Localized`. */
function loc(bn: string | null | undefined, en: string | null | undefined): Localized {
  // Either side may be missing on a partially-entered record. Falling back to
  // the other language beats rendering an empty string, and beats inventing a
  // translation the admin never wrote.
  return { bn: bn ?? en ?? '', en: en ?? bn ?? '' }
}

/** Same, but preserves "there is nothing here" so the UI can stay quiet. */
function optLoc(
  bn: string | null | undefined,
  en: string | null | undefined,
): Localized | undefined {
  if (!bn && !en) return undefined
  return loc(bn, en)
}

/** numeric(2,1) arrives as a string over the wire. */
function n(value: number | string | null | undefined, fallback = 0): number {
  if (value === null || value === undefined) return fallback
  const parsed = typeof value === 'string' ? Number.parseFloat(value) : value
  return Number.isFinite(parsed) ? parsed : fallback
}

const CLOSED_WEEK: WeeklyHours = [[], [], [], [], [], [], []]

function hours(json: unknown, alwaysOpen: boolean): WeeklyHours {
  if (alwaysOpen) return 'always'
  if (Array.isArray(json) && json.length === 7) return json as WeeklyHours
  // An unset schedule reads as closed rather than as open-all-hours: for a
  // pharmacy or a blood bank, guessing the wrong way sends someone to a locked
  // door in the middle of the night.
  return CLOSED_WEEK
}

function services(join: ServiceJoin[] | null | undefined): Localized[] {
  if (!join?.length) return []
  return [...join]
    .sort((a, z) => a.sort_order - z.sort_order)
    .flatMap((s) => (s.services ? [loc(s.services.name_bn, s.services.name_en)] : []))
}

/* ------------------------------------------------------------------ */
/* Mappers                                                             */
/* ------------------------------------------------------------------ */

export function toBusiness(r: BusinessRow, areaCoords: (a: AreaId) => { lat: number; lng: number }): Business {
  const area = r.area_id ?? DEFAULT_AREA
  const centre = areaCoords(area)
  return {
    id: r.id,
    slug: r.slug,
    name: loc(r.name_bn, r.name_en),
    category: r.category,
    group: r.group,
    description: loc(r.description_bn, r.description_en),
    phone: r.phone ?? '',
    website: r.website ?? undefined,
    address: loc(r.address_bn, r.address_en),
    area,
    // Falls back to the area centre so the card still places the listing on the
    // right side of the district instead of dropping it at (0, 0) off Ghana.
    coords: { lat: r.lat ?? centre.lat, lng: r.lng ?? centre.lng },
    verified: r.verified,
    rating: n(r.rating),
    reviewCount: r.review_count,
    hours: hours(r.hours, r.always_open),
    services: services(r.business_services),
    imageSeed: r.image_seed,
    photoCount: r.photo_count,
    reviews: (r.reviews ?? []).map(toReview),
    updatedAt: r.updated_at.slice(0, 10),
    featured: r.featured,
  }
}

export function toReview(r: ReviewRow): Review {
  return {
    id: r.id,
    author: loc(r.author_bn, r.author_en),
    rating: n(r.rating),
    comment: loc(r.comment_bn, r.comment_en),
    date: r.reviewed_on ?? '',
  }
}

export function toRental(r: RentalRow, areaCoords: (a: AreaId) => { lat: number; lng: number }): Rental {
  const area = r.area_id ?? DEFAULT_AREA
  const centre = areaCoords(area)
  return {
    id: r.id,
    slug: r.slug,
    title: loc(r.title_bn, r.title_en),
    category: r.category,
    description: loc(r.description_bn, r.description_en),
    phone: r.owner_phone ?? '',
    rent: r.rent,
    bedrooms: r.bedrooms,
    bathrooms: r.bathrooms,
    sizeSqft: r.size_sqft ?? 0,
    tenantType: r.tenant_type,
    furnished: r.furnished,
    floor: r.floor ?? undefined,
    area,
    address: loc(r.address_bn, r.address_en),
    coords: { lat: r.lat ?? centre.lat, lng: r.lng ?? centre.lng },
    verified: r.verified,
    imageSeed: r.image_seed,
    availableFrom: r.available_from ?? '',
    updatedAt: r.updated_at.slice(0, 10),
  }
}

export function toEmergency(r: EmergencyRow): EmergencyContact {
  return {
    id: r.id,
    name: loc(r.name_bn, r.name_en),
    short: optLoc(r.short_bn, r.short_en),
    description: loc(r.description_bn, r.description_en),
    phone: r.phone,
    icon: r.icon,
    scope: r.scope,
    tone: r.tone,
    available24: r.available_24,
    coords: r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng } : undefined,
    address: optLoc(r.address_bn, r.address_en),
  }
}

export function toFacility(r: FacilityRow): HealthFacility {
  const tags = services(r.facility_services)
  return {
    kind: 'facility',
    id: r.id,
    slug: r.slug,
    category: r.category,
    name: loc(r.name_bn, r.name_en),
    aliases: r.aliases ?? undefined,
    description: loc(r.description_bn, r.description_en),
    address: optLoc(r.address_bn, r.address_en),
    area: r.area_id ?? DEFAULT_AREA,
    coords: r.lat != null && r.lng != null && !r.coords_approx ? { lat: r.lat, lng: r.lng } : undefined,
    contact: {
      phone: r.phone ?? undefined,
      appointmentPhone: r.appointment_phone ?? undefined,
      emergencyPhone: r.emergency_phone ?? undefined,
      email: r.email ?? undefined,
      website: r.website ?? undefined,
      facebook: r.facebook ?? undefined,
    },
    hours: r.always_open ? 'always' : Array.isArray(r.hours) ? (r.hours as WeeklyHours) : undefined,
    emergency24: r.emergency_24,
    services: tags.length ? tags : undefined,
    // Rating is only ever shown when a real source published one; an absent
    // value stays absent rather than becoming a zero-star listing.
    rating: r.rating != null ? n(r.rating) : undefined,
    reviewCount: r.review_count ?? undefined,
    featured: r.featured,
    source: {
      kind: r.source_kind,
      url: r.source_url ?? undefined,
      note: optLoc(r.source_note_bn, r.source_note_en),
      verifiedAt: r.source_verified_at,
    },
  }
}

export function toDoctor(r: DoctorRow): Doctor {
  const chambers: Chamber[] = [...(r.chambers ?? [])]
    .sort((a, z) => a.sort_order - z.sort_order)
    .map((c) => ({
      facilityId: c.facility_id ?? undefined,
      place: loc(c.place_bn, c.place_en),
      area: c.area_id ?? DEFAULT_AREA,
      hours: optLoc(c.visiting_hours_bn, c.visiting_hours_en),
      phone: c.appointment_phone ?? undefined,
    }))

  return {
    kind: 'doctor',
    id: r.id,
    slug: r.slug,
    category: 'doctor',
    name: loc(r.name_bn, r.name_en),
    aliases: r.aliases ?? undefined,
    specialty: loc(r.specialty_bn, r.specialty_en),
    qualifications: r.qualifications ?? [],
    designation: optLoc(r.designation_bn, r.designation_en),
    facilityIds: r.doctor_facilities?.map((f) => f.facility_id),
    chambers: chambers.length ? chambers : undefined,
    contact: {
      phone: r.phone ?? undefined,
      appointmentPhone: r.appointment_phone ?? undefined,
      email: r.email ?? undefined,
      website: r.website ?? undefined,
      facebook: r.facebook ?? undefined,
    },
    area: r.area_id ?? DEFAULT_AREA,
    featured: r.featured,
    source: {
      kind: r.source_kind,
      url: r.source_url ?? undefined,
      note: optLoc(r.source_note_bn, r.source_note_en),
      verifiedAt: r.source_verified_at,
    },
  }
}

/* ------------------------------------------------------------------ */
/* Select fragments                                                    */
/* ------------------------------------------------------------------ */

/**
 * Explicit column lists rather than `*`.
 *
 * On a directory this size the payload difference is real on a phone, and it
 * also means adding an internal column to a table does not silently start
 * shipping it to every visitor.
 */
export const SELECT = {
  business:
    'id, slug, category, group, name_bn, name_en, description_bn, description_en, ' +
    'phone, website, address_bn, address_en, area_id, lat, lng, hours, always_open, ' +
    'rating, review_count, verified, image_seed, photo_count, status, featured, updated_at, ' +
    'business_services(sort_order, services(name_bn, name_en))',
  businessDetail:
    'id, slug, category, group, name_bn, name_en, description_bn, description_en, ' +
    'phone, website, address_bn, address_en, area_id, lat, lng, hours, always_open, ' +
    'rating, review_count, verified, image_seed, photo_count, status, featured, updated_at, ' +
    'business_services(sort_order, services(name_bn, name_en)), ' +
    'reviews(id, author_bn, author_en, rating, comment_bn, comment_en, reviewed_on)',
  rental:
    'id, slug, category, title_bn, title_en, description_bn, description_en, rent, ' +
    'bedrooms, bathrooms, size_sqft, floor, tenant_type, furnished, address_bn, address_en, ' +
    'area_id, lat, lng, owner_name, owner_phone, available_from, image_seed, verified, ' +
    'status, featured, updated_at',
  emergency:
    'id, name_bn, name_en, short_bn, short_en, description_bn, description_en, phone, ' +
    'icon, scope, tone, available_24, address_bn, address_en, lat, lng, priority, status',
  categoryBar: 'id, category_id, band, label_bn, label_en, target_path, sort_order, status',
  facility:
    'id, slug, category, name_bn, name_en, aliases, description_bn, description_en, ' +
    'address_bn, address_en, area_id, lat, lng, coords_approx, phone, appointment_phone, ' +
    'emergency_phone, email, website, facebook, hours, always_open, emergency_24, rating, ' +
    'review_count, verification, source_kind, source_url, source_note_bn, source_note_en, ' +
    'source_verified_at, status, featured, ' +
    'facility_services(sort_order, services(name_bn, name_en))',
  doctor:
    'id, slug, name_bn, name_en, aliases, qualifications, specialty_bn, specialty_en, ' +
    'designation_bn, designation_en, phone, appointment_phone, email, website, facebook, ' +
    'area_id, verification, source_kind, source_url, source_note_bn, source_note_en, ' +
    'source_verified_at, status, featured, ' +
    'chambers(id, facility_id, place_bn, place_en, area_id, visiting_hours_bn, ' +
    'visiting_hours_en, appointment_phone, sort_order), ' +
    'doctor_facilities(facility_id)',
} as const
