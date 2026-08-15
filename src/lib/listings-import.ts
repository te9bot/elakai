import { BUSINESSES } from '@/data/businesses'
import { AREA_MAP } from '@/data/categories'
import { EMERGENCY_CONTACTS } from '@/data/emergency'
import { HEALTH_RECORDS } from '@/data/healthcare'
import { RENTALS } from '@/data/rentals'
import type { Doctor, HealthFacility } from '@/data/healthcare-types'
import type { Business, EmergencyContact, Localized, Rental } from '@/data/types'
import { RICH_LISTING_SELECT } from './listings-rich'
import { toStoredPhone } from './phone'
import { requireSupabase } from './supabase'

/* ==========================================================================
 * One-time import of the bundled directory into `public.listings`.
 *
 * WRITTEN AGAINST THE TABLE THAT EXISTS
 *
 * `public.listings` has sixteen columns and no others:
 *
 *   id, created_at, section, title, description, phone, email, address,
 *   location, category, price, availability, image_url, status,
 *   display_order, updated_at
 *
 * There is no `slug`, no coordinate pair, no numeric rent, no jsonb column to
 * park structured data in. Everything below maps into those sixteen and
 * nothing else, and whatever cannot be expressed in them is *reported* rather
 * than quietly dropped — see `UNMAPPED` and the `unmapped` field on the
 * report.
 *
 * IDEMPOTENCE WITHOUT A UNIQUE COLUMN
 *
 * The table has no natural key, so identity is a composite of two columns that
 * do exist and are populated on every bundled record: `section` and `title`.
 * Measured across the 147 records, `title` alone collides once ("Kushtia
 * Ambulance Service" appears in two sections) while `section` + `title` is
 * unique for all 147. That pair is therefore the dedupe key.
 *
 * It is matched case-insensitively on trimmed text, so a title an admin has
 * since re-cased is still recognised as already imported rather than inserted
 * a second time.
 *
 * Existing rows are read first and any match is skipped, never overwritten —
 * an upsert would look identical until the second run, when it would revert
 * every edit an admin had made to an imported listing.
 *
 * Runs in the browser under the admin's own session, so the existing RLS
 * policies authorise the inserts. No service_role key is involved.
 * ========================================================================== */

export type ImportReport = {
  found: number
  existingBefore: number
  imported: number
  skipped: number
  failed: { key: string; reason: string }[]
  bySection: Record<string, number>
  /** Bundled information the current schema has nowhere to put. Empty when rich. */
  unmapped: { field: string; records: number; note: string }[]
  /** Whether migration 0004 was in place, so the whole record was carried. */
  rich: boolean
}

/** Exactly the columns `public.listings` has, minus the generated ones. */
type ImportRow = {
  section: string
  title: string
  description: string | null
  phone: string | null
  email: string | null
  address: string | null
  location: string | null
  category: string | null
  price: string | null
  availability: string | null
  image_url: string | null
  status: string
  display_order: number
}

/**
 * The same record with everything migration 0004 makes room for.
 *
 * Written only when those columns exist — see `hasRichColumns`. Loose typing on
 * the jsonb fields because they carry the bundled structures verbatim, and
 * restating each of their shapes here would duplicate `data/types.ts` for no
 * benefit: `listings-rich.ts` is what reads them back and validates them.
 */
type RichImportRow = ImportRow & Record<string, unknown>

/* ------------------------------------------------------------------ */
/* Identity                                                            */
/* ------------------------------------------------------------------ */

/** The composite dedupe key, normalised so casing and padding cannot fool it. */
export function listingKey(section: string | null, title: string | null): string {
  return `${(section ?? '').trim().toLowerCase()}||${(title ?? '').trim().toLowerCase()}`
}

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

/**
 * Collapses a bilingual value to the single text column available.
 *
 * English wins because the column is one column; the Bengali half has nowhere
 * to go and is counted in the unmapped report rather than discarded silently.
 */
function one(value: Localized | undefined): string | null {
  if (!value) return null
  return value.en || value.bn || null
}

function areaLabel(area: string | undefined): string | null {
  if (!area) return null
  return AREA_MAP[area]?.name.en ?? area
}

/** The one piece of the opening-hours model the schema can carry. */
function availabilityFrom(hours: Business['hours'] | undefined): string | null {
  return hours === 'always' ? 'Open 24 hours' : null
}

function row(fields: Partial<ImportRow> & { section: string; title: string; display_order: number }): ImportRow {
  const merged: ImportRow = {
    description: null,
    phone: null,
    email: null,
    address: null,
    location: null,
    category: null,
    price: null,
    availability: null,
    image_url: null,
    status: 'active',
    ...fields,
  }

  // Stored canonical, the same as anything saved through the admin form, so
  // every number in the table has one shape regardless of how it got there.
  // Bundled placeholders normalise too and still refuse to dial — that is
  // decided by the number's range in `lib/phone.ts`, not by its formatting.
  return { ...merged, phone: merged.phone ? toStoredPhone(merged.phone) : null }
}

/* ------------------------------------------------------------------ */
/* Mappers — into the sixteen real columns                             */
/* ------------------------------------------------------------------ */

function fromBusiness(b: Business, order: number): ImportRow {
  return row({
    // A business already records which part of the site it belongs to.
    section: b.group,
    title: one(b.name) ?? b.slug,
    description: one(b.description),
    phone: b.phone || null,
    address: one(b.address),
    location: areaLabel(b.area),
    category: b.category,
    availability: availabilityFrom(b.hours),
    display_order: order,
  })
}

function fromRental(r: Rental, order: number): ImportRow {
  return row({
    section: 'rentals',
    title: one(r.title) ?? r.slug,
    description: one(r.description),
    phone: r.phone || null,
    address: one(r.address),
    location: areaLabel(r.area),
    category: r.category,
    // The numeric rent has no numeric column, so it is rendered as the
    // free-text price the CMS already shows. The filterable number is lost.
    price: r.rent ? `${r.rent.toLocaleString('en-US')} BDT/month` : null,
    availability: r.availableFrom ? `Available from ${r.availableFrom}` : null,
    display_order: order,
  })
}

function fromEmergency(e: EmergencyContact, order: number): ImportRow {
  return row({
    section: 'emergency',
    title: one(e.name) ?? e.id,
    description: one(e.description),
    phone: e.phone || null,
    address: one(e.address),
    category: 'emergency',
    availability: e.available24 ? 'Available 24 hours' : null,
    display_order: order,
  })
}

function fromFacility(f: HealthFacility, order: number): ImportRow {
  return row({
    section: 'healthcare',
    title: one(f.name) ?? f.slug,
    description: one(f.description),
    phone: f.contact?.phone ?? f.contact?.appointmentPhone ?? null,
    email: f.contact?.email ?? null,
    address: one(f.address),
    location: areaLabel(f.area),
    category: f.category,
    availability: f.emergency24 ? 'Emergency open 24 hours' : availabilityFrom(f.hours as Business['hours']),
    display_order: order,
  })
}

function fromDoctor(d: Doctor, order: number): ImportRow {
  return row({
    section: 'healthcare',
    title: one(d.name) ?? d.slug,
    // A doctor's specialty is the closest thing they have to a description,
    // and without it the row would carry only a name.
    description: one(d.specialty),
    phone: d.contact?.phone ?? d.contact?.appointmentPhone ?? null,
    email: d.contact?.email ?? null,
    location: areaLabel(d.area),
    category: 'doctor',
    display_order: order,
  })
}

/* ------------------------------------------------------------------ */
/* Rich mappers — everything migration 0004 makes room for             */
/* ------------------------------------------------------------------ */

/**
 * Cross-references are rewritten from bundled ids to slugs.
 *
 * A doctor points at facilities by id ('f01'), but those ids mean nothing once
 * the records are rows with bigint keys assigned by Postgres. Slug is the
 * identity that survives the move — it is also what the detail routes resolve
 * on — so the links are translated on the way in and resolve on the way out.
 * See the IDENTITY note in `listings-rich.ts`.
 */
const SLUG_BY_RECORD_ID = new Map<string, string>(
  HEALTH_RECORDS.map((r) => [r.id, r.slug]),
)

function slugsFor(ids: string[] | undefined): string[] | null {
  if (!ids?.length) return null
  const out = ids.map((id) => SLUG_BY_RECORD_ID.get(id)).filter((s): s is string => Boolean(s))
  return out.length ? out : null
}

/** Splits a bilingual pair into the two columns that hold it. */
function pair(prefix: string, value: Localized | undefined): Record<string, string | null> {
  return {
    [`${prefix}_bn`]: value?.bn ?? null,
    [`${prefix}_en`]: value?.en ?? null,
  }
}

function coords(c: { lat: number; lng: number } | undefined): Record<string, number | null> {
  return { lat: c?.lat ?? null, lng: c?.lng ?? null }
}

function richFromBusiness(b: Business, order: number): RichImportRow {
  return {
    ...fromBusiness(b, order),
    slug: b.slug,
    verified: b.verified,
    featured: b.featured ?? false,
    image_seed: b.imageSeed,
    ...pair('title', b.name),
    ...pair('description', b.description),
    ...pair('address', b.address),
    area_id: b.area,
    ...coords(b.coords),
    category_group: b.group,
    website: b.website ?? null,
    rating: b.rating,
    review_count: b.reviewCount,
    photo_count: b.photoCount,
    // 'always' is a marker, not a schedule — it goes in its own boolean so the
    // jsonb column only ever holds an actual seven-day grid.
    hours: b.hours === 'always' ? null : b.hours,
    always_open: b.hours === 'always',
    services: b.services ?? [],
    reviews: b.reviews ?? [],
  }
}

function richFromRental(r: Rental, order: number): RichImportRow {
  return {
    ...fromRental(r, order),
    slug: r.slug,
    verified: r.verified,
    image_seed: r.imageSeed,
    ...pair('title', r.title),
    ...pair('description', r.description),
    ...pair('address', r.address),
    area_id: r.area,
    ...coords(r.coords),
    category_group: 'rentals',
    // Numeric, so the rentals page can filter and sort in Postgres rather than
    // parsing the price text it previously had to fall back to.
    rent: r.rent,
    bedrooms: r.bedrooms,
    bathrooms: r.bathrooms,
    size_sqft: r.sizeSqft,
    floor: r.floor ?? null,
    tenant_type: r.tenantType,
    furnished: r.furnished,
    available_from: r.availableFrom || null,
  }
}

function richFromEmergency(e: EmergencyContact, order: number): RichImportRow {
  return {
    ...fromEmergency(e, order),
    slug: `emergency-${e.id}`,
    ...pair('title', e.name),
    ...pair('short', e.short),
    ...pair('description', e.description),
    ...pair('address', e.address),
    ...coords(e.coords),
    category_group: 'emergency',
    icon: e.icon,
    scope: e.scope,
    tone: e.tone,
    available_24: e.available24,
    // Preserves the hand-tuned order the emergency page relies on: national
    // services first, and the most urgent within each group at the top.
    priority: order,
  }
}

function richFromFacility(f: HealthFacility, order: number): RichImportRow {
  return {
    ...fromFacility(f, order),
    slug: f.slug,
    featured: f.featured ?? false,
    ...pair('title', f.name),
    ...pair('description', f.description),
    ...pair('address', f.address),
    area_id: f.area,
    ...coords(f.coords),
    category_group: 'healthcare',
    website: f.contact?.website ?? null,
    facebook: f.contact?.facebook ?? null,
    rating: f.rating ?? null,
    review_count: f.reviewCount ?? 0,
    hours: f.hours === 'always' ? null : (f.hours ?? null),
    always_open: f.hours === 'always',
    services: f.services ?? null,
    departments: f.departments ?? null,
    tests: f.tests ?? null,
    aliases: f.aliases ?? null,
    appointment_phone: f.contact?.appointmentPhone ?? null,
    emergency_phone: f.contact?.emergencyPhone ?? null,
    emergency_24: f.emergency24 ?? false,
    doctor_ids: slugsFor(f.doctorIds),
    verification: f.source?.verifiedAt ?? null,
    source: f.source ?? null,
  }
}

function richFromDoctor(d: Doctor, order: number): RichImportRow {
  return {
    ...fromDoctor(d, order),
    slug: d.slug,
    featured: d.featured ?? false,
    ...pair('title', d.name),
    ...pair('specialty', d.specialty),
    ...pair('designation', d.designation),
    area_id: d.area,
    category_group: 'healthcare',
    website: d.contact?.website ?? null,
    facebook: d.contact?.facebook ?? null,
    appointment_phone: d.contact?.appointmentPhone ?? null,
    emergency_phone: d.contact?.emergencyPhone ?? null,
    qualifications: d.qualifications ?? [],
    facility_ids: slugsFor(d.facilityIds),
    // Chambers carry a facilityId of their own, rewritten for the same reason.
    chambers:
      d.chambers?.map((c) => ({
        ...c,
        facilityId: c.facilityId ? SLUG_BY_RECORD_ID.get(c.facilityId) ?? null : null,
      })) ?? null,
    verification: d.source?.verifiedAt ?? null,
    source: d.source ?? null,
  }
}

/**
 * Whether migration 0004 has been applied to this project.
 *
 * Probed rather than assumed, so the importer works against both schemas: on
 * the base sixteen columns it writes what fits and reports the rest as
 * unmapped, and once the migration is applied it carries the whole record.
 * Selecting a single added column is enough — PostgREST fails the request when
 * the column is not in its schema cache.
 */
export async function hasRichColumns(): Promise<boolean> {
  const { error } = await requireSupabase().from('listings').select('slug').limit(1)
  return !error
}

/* ------------------------------------------------------------------ */
/* What the schema cannot hold                                         */
/* ------------------------------------------------------------------ */

/**
 * Bundled fields with no column to land in.
 *
 * Listed explicitly so the loss is visible in the UI at import time instead of
 * being discovered later as a missing feature on the public site. Counts are
 * computed from the live data rather than hard-coded.
 */
function unmappedReport(): ImportReport['unmapped'] {
  const facilities = HEALTH_RECORDS.filter((r): r is HealthFacility => r.kind === 'facility')
  const doctors = HEALTH_RECORDS.filter((r): r is Doctor => r.kind === 'doctor')
  const all = BUSINESSES.length + RENTALS.length + EMERGENCY_CONTACTS.length + HEALTH_RECORDS.length

  const entries: ImportReport['unmapped'] = [
    { field: 'Bengali text (name / description / address)', records: all, note: 'One text column per field; English kept' },
    { field: 'slug', records: all, note: 'Detail-page URLs stay on bundled data' },
    { field: 'coordinates (lat/lng)', records: BUSINESSES.length + RENTALS.length + EMERGENCY_CONTACTS.filter((e) => e.coords).length, note: 'Maps cannot be driven from listings' },
    { field: 'rating / reviewCount', records: BUSINESSES.length, note: 'Star ratings unavailable' },
    { field: 'reviews', records: BUSINESSES.filter((b) => b.reviews?.length).length, note: 'Review lists unavailable' },
    { field: 'weekly opening hours', records: BUSINESSES.filter((b) => b.hours !== 'always').length, note: 'Only "open 24 hours" survives, as availability text' },
    { field: 'verified / featured flags', records: all, note: 'Badges and featured rails unavailable' },
    { field: 'imageSeed / photoCount', records: BUSINESSES.length + RENTALS.length, note: 'Procedural card art unavailable' },
    { field: 'rent / bedrooms / bathrooms / sizeSqft / tenantType / furnished', records: RENTALS.length, note: 'Rent kept as price text; numeric filtering lost' },
    { field: 'icon / scope / tone / priority', records: EMERGENCY_CONTACTS.length, note: 'Emergency card styling and ordering' },
    { field: 'services / tests / departments', records: facilities.filter((f) => f.services?.length || f.tests?.length || f.departments?.length).length, note: 'Facility service lists' },
    { field: 'qualifications / designation / chambers / facility links', records: doctors.length, note: 'Doctor profiles' },
    { field: 'source provenance / verification', records: facilities.length + doctors.length, note: 'Healthcare data provenance' },
  ]

  return entries.filter((e) => e.records > 0)
}

/* ------------------------------------------------------------------ */
/* The set to import                                                   */
/* ------------------------------------------------------------------ */

export function buildImportRows(rich = false): ImportRow[] {
  const rows: ImportRow[] = []
  const orderBySection = new Map<string, number>()
  const next = (section: string) => {
    const n = orderBySection.get(section) ?? 0
    orderBySection.set(section, n + 1)
    return n
  }

  for (const b of BUSINESSES) {
    rows.push(rich ? richFromBusiness(b, next(b.group)) : fromBusiness(b, next(b.group)))
  }
  for (const r of RENTALS) {
    rows.push(rich ? richFromRental(r, next('rentals')) : fromRental(r, next('rentals')))
  }
  for (const e of EMERGENCY_CONTACTS) {
    rows.push(rich ? richFromEmergency(e, next('emergency')) : fromEmergency(e, next('emergency')))
  }
  for (const record of HEALTH_RECORDS) {
    const order = next('healthcare')
    if (record.kind === 'facility') {
      rows.push(rich ? richFromFacility(record, order) : fromFacility(record, order))
    } else {
      rows.push(rich ? richFromDoctor(record, order) : fromDoctor(record, order))
    }
  }

  return rows
}

export function describeUnmapped(): ImportReport['unmapped'] {
  return unmappedReport()
}

/* ------------------------------------------------------------------ */
/* Runner                                                              */
/* ------------------------------------------------------------------ */

const CHUNK = 25

export type BackfillReport = {
  /** Rows in the table that a bundled record could be matched to. */
  matched: number
  /** Matched rows that had at least one blank column filled. */
  updated: number
  /** Matched rows that already had every column — a repeat run reports these. */
  alreadyComplete: number
  /** Rows with no bundled counterpart — typically created in the admin panel. */
  unmatched: number
  /** Total columns written, across every row. */
  fieldsFilled: number
  failed: { key: string; reason: string }[]
}

/**
 * Fills the columns migration 0004 adds, on rows that are already there.
 *
 * Needed because the import is deliberately skip-not-overwrite: once a record
 * exists it is never rewritten, which is what stops a second run from reverting
 * an admin's edits. That protection also means an import performed *before* the
 * migration cannot be repaired by importing again — every row would be
 * recognised and skipped, and the new columns would stay empty.
 *
 * So this writes the added columns and only the added columns. The original
 * sixteen are left exactly as they are, which is the whole safety property: a
 * phone number corrected in the admin panel, a rewritten description or a
 * replaced image survive a backfill untouched, because this never names those
 * columns in the update.
 */
export async function backfillRichColumns(
  onProgress?: (done: number, total: number) => void,
): Promise<BackfillReport> {
  const db = requireSupabase()

  if (!(await hasRichColumns())) {
    throw new Error(
      'This project does not have the wider columns yet. Apply supabase/migrations/0004_listings_full_schema.sql first.',
    )
  }

  // The whole wide row, not just the identity: deciding what to fill requires
  // knowing what is already there.
  const { data: existing, error } = await db.from('listings').select(RICH_LISTING_SELECT)
  if (error) throw new Error(`Could not read existing listings: ${error.message}`)

  // Bundled records keyed the same way the importer dedupes, so a row and its
  // source record are matched on exactly the pair that identified it before.
  const bundled = new Map(
    buildImportRows(true).map((r) => [listingKey(r.section, r.title), r as RichImportRow]),
  )

  const rows = (existing ?? []) as unknown as Record<string, unknown>[]
  const report: BackfillReport = {
    matched: 0,
    updated: 0,
    alreadyComplete: 0,
    unmatched: 0,
    fieldsFilled: 0,
    failed: [],
  }

  // The sixteen original columns, never written here.
  const PRESERVED = new Set([
    'section', 'title', 'description', 'phone', 'email', 'address', 'location',
    'category', 'price', 'availability', 'image_url', 'status', 'display_order',
  ])

  /**
   * Whether a stored value counts as "not filled in yet".
   *
   * Only null and undefined qualify. `false`, `0` and `''` are all values an
   * admin can legitimately have chosen — `featured: false` and `rating: 0` are
   * decisions, not blanks — and treating them as empty would let a backfill
   * quietly re-assert the bundled default over a deliberate one.
   */
  const isBlank = (value: unknown) => value === null || value === undefined

  /**
   * Has this row ever been backfilled?
   *
   * `slug` answers it: nothing else writes that column, every bundled record
   * supplies one, and it is null on every row until this runs.
   *
   * The distinction matters because nine of the columns 0004 adds are declared
   * `not null default` — verified, featured, coords_approx, review_count,
   * photo_count, always_open, furnished, available_24, emergency_24. The
   * moment the migration lands they hold `false` or `0` on all 147 rows, so
   * they are never null and a fill-blanks-only pass would skip every one of
   * them: 40 verified badges, 30 featured, 28 "open 24 hours" and every review
   * count would stay at the default, with nothing reported as failed.
   *
   * So a row that has never been backfilled takes the whole record, defaults
   * included. A row that has takes only what is still null, which is what keeps
   * a second run from reverting an admin's edits.
   */
  const isVirgin = (row: Record<string, unknown>) => isBlank(row.slug)

  let done = 0
  for (const row of rows) {
    const id = row.id as number
    const source = bundled.get(listingKey(row.section as string, row.title as string))
    if (!source) {
      report.unmatched++
      onProgress?.(++done, rows.length)
      continue
    }
    report.matched++

    /*
     * First run takes the whole record; later runs fill only what is missing.
     *
     * This is the difference between a backfill and a reset. Writing every
     * column unconditionally is correct exactly once — on a second run, or on
     * a row whose coordinates or rating an admin had corrected since, it would
     * silently replace that work with the bundled value. Since the panel
     * offers this as a button anyone can press twice, "safe to press twice"
     * has to be a property of the operation, not a note in the docs.
     *
     * But filling only nulls is wrong on the *first* run, for the nine
     * `not null default` columns described above. Splitting on whether the row
     * has been backfilled before gets both: complete data on the first pass,
     * and no clobbering on any pass after it.
     */
    const virgin = isVirgin(row)
    const patch: Record<string, unknown> = {}
    for (const [column, value] of Object.entries(source)) {
      if (PRESERVED.has(column)) continue
      if (isBlank(value)) continue
      if (!virgin && !isBlank(row[column])) continue
      patch[column] = value
    }

    const fields = Object.keys(patch).length
    if (fields === 0) {
      // Nothing left to add — the row is already complete. Skipping the write
      // is what makes a repeat run cheap and makes an interrupted one safe to
      // resume: finished rows cost a comparison, not a round trip.
      report.alreadyComplete++
      onProgress?.(++done, rows.length)
      continue
    }

    const { error: writeError } = await db.from('listings').update(patch).eq('id', id)
    if (writeError) {
      report.failed.push({
        key: `${row.section as string} / ${row.title as string}`,
        reason: writeError.message,
      })
    } else {
      report.updated++
      report.fieldsFilled += fields
    }

    onProgress?.(++done, rows.length)
  }

  return report
}

export async function importBundledListings(
  onProgress?: (done: number, total: number) => void,
): Promise<ImportReport> {
  const db = requireSupabase()
  // Decided once per run rather than per row, so an import cannot end up half
  // rich and half flat if the schema cache changes underneath it.
  const rich = await hasRichColumns()
  const rows = buildImportRows(rich)

  // Only real columns. Read as the signed-in admin so this sees every row
  // whatever its status — re-importing something an admin deactivated would
  // resurrect it on the public site.
  const { data: existing, error: readError } = await db
    .from('listings')
    .select('section, title')

  if (readError) {
    throw new Error(`Could not read existing listings: ${readError.message}`)
  }

  const present = new Set(
    (existing ?? []).map((r) => {
      const x = r as { section: string | null; title: string | null }
      return listingKey(x.section, x.title)
    }),
  )

  const pending = rows.filter((r) => !present.has(listingKey(r.section, r.title)))

  const report: ImportReport = {
    found: rows.length,
    existingBefore: present.size,
    imported: 0,
    skipped: rows.length - pending.length,
    failed: [],
    bySection: {},
    // Nothing is lost once the added columns are there to hold it.
    unmapped: rich ? [] : unmappedReport(),
    rich,
  }

  const credit = (r: ImportRow) => {
    report.imported++
    report.bySection[r.section] = (report.bySection[r.section] ?? 0) + 1
  }

  for (let i = 0; i < pending.length; i += CHUNK) {
    const chunk = pending.slice(i, i + CHUNK)
    const { error } = await db.from('listings').insert(chunk)

    if (error) {
      // Retry one at a time so a single bad record is named rather than taking
      // twenty-four good ones down with it.
      for (const r of chunk) {
        const single = await db.from('listings').insert(r)
        if (single.error) {
          report.failed.push({ key: `${r.section} / ${r.title}`, reason: single.error.message })
        } else {
          credit(r)
        }
      }
    } else {
      for (const r of chunk) credit(r)
    }

    onProgress?.(Math.min(i + CHUNK, pending.length), pending.length)
  }

  return report
}
