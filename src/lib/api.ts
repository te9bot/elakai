import { BUSINESS_BY_SLUG, BUSINESSES } from '@/data/businesses'
import { cleanCoverage, FALLBACK_COVERAGE, type CoverageBands } from '@/data/coverage'
import { EMERGENCY_CONTACTS } from '@/data/emergency'
import { HEALTH_RECORDS } from '@/data/healthcare'
import type { HealthRecord } from '@/data/healthcare-types'
import { RENTAL_BY_SLUG, RENTALS, RENT_RANGE } from '@/data/rentals'
import type {
  Business,
  CategoryId,
  EmergencyContact,
  LatLng,
  Rental,
  ScoredBusiness,
  TenantType,
} from '@/data/types'
import { FAKE_LATENCY_MS } from './config'
import { haversineKm } from './format'
import { setHealthCorpus } from './healthcare-search'
import { listingSelect } from './listing-columns'
import { flatToBusiness, flatToEmergency, flatToRental } from './listings-flat'
import { toListing, type Listing, type ListingRow } from './listings'
import { listingKey } from './listings-import'
import {
  listingToBusiness,
  listingToEmergency,
  listingToHealthRecord,
  listingToRental,
  RICH_LISTING_SELECT,
  type RichListingRow,
} from './listings-rich'
import { rankBusinesses, setBusinessCorpus, type SearchOptions } from './search'
import { HAS_BACKEND, supabase } from './supabase'

/* ==========================================================================
 * THE BACKEND SEAM
 *
 * Every read in the app goes through this module. Nothing above it imports
 * `src/data/` directly, so the switch from bundled demo data to Postgres
 * happens here and nowhere else.
 *
 * Both paths stay live on purpose. `HAS_BACKEND` is false whenever the Supabase
 * environment variables are absent — a fresh clone, a preview build without
 * secrets, a contributor with no project — and in that state the app serves the
 * bundled dataset instead of throwing on first paint. It is a fallback, not a
 * second source of truth: once a backend is configured the static data is only
 * reachable through the seed script.
 * ========================================================================== */

/** Simulates network latency so loading states exercise real code paths. */
function delay<T>(value: T, ms = FAKE_LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

/* ------------------------------------------------------------------ */
/* `public.listings` as the directory                                  */
/* ------------------------------------------------------------------ */

/**
 * Published rows for one or more sections, as the wide shape.
 *
 * Returns null — distinct from an empty array — when this project has not had
 * migration 0004 applied, so the added columns are not there to select. The
 * callers below treat null and empty the same way, by serving the bundled
 * dataset, but the distinction is what keeps a genuine "nothing published yet"
 * from being mistaken for "this schema is older than the code".
 *
 * This is the one function that decides the site reads from Postgres. Before
 * the directory has been imported it returns nothing and every page behaves
 * exactly as it did; after the import each page is rendering database rows,
 * with no per-page change and no second copy of anything.
 */
/**
 * A query described as data rather than as a chain of builder calls.
 *
 * Declarative because the alternative — handing callers the PostgREST builder
 * to tune — types badly: each chained method returns a new generic instance,
 * and threading that through a callback makes the checker give up. Every filter
 * these pages need is one of five shapes, so naming them is both simpler and
 * fully typed.
 */
type ListingQuery = {
  eq?: Record<string, unknown>
  in?: Record<string, readonly unknown[]>
  gte?: Record<string, number>
  lte?: Record<string, number>
  order?: { column: string; ascending?: boolean; nullsFirst?: boolean }[]
}

async function richListings(
  sections: string[],
  spec: ListingQuery = {},
): Promise<RichListingRow[] | null> {
  if (!HAS_BACKEND || !supabase) return null
  // Checked up front so a project without the migration never issues the wide
  // select at all, rather than issuing it and interpreting the failure.
  if (!(await hasRichSchema())) return null

  let q = supabase
    .from('listings')
    .select(RICH_LISTING_SELECT)
    .eq('status', 'active')
    .in('section', sections)

  for (const [column, value] of Object.entries(spec.eq ?? {})) q = q.eq(column, value)
  for (const [column, values] of Object.entries(spec.in ?? {})) q = q.in(column, values as never[])
  for (const [column, value] of Object.entries(spec.gte ?? {})) q = q.gte(column, value)
  for (const [column, value] of Object.entries(spec.lte ?? {})) q = q.lte(column, value)
  for (const o of spec.order ?? []) {
    q = q.order(o.column, { ascending: o.ascending ?? true, nullsFirst: o.nullsFirst ?? false })
  }

  const { data, error } = await q
  if (error) throw new Error(`Failed to load listings: ${error.message}`)

  return (data ?? []) as unknown as RichListingRow[]
}

/**
 * Whether migration 0004 has been applied, asked once and cached.
 *
 * Asked rather than inferred from a failure, because the failures are not
 * reliably readable: a `head: true` count against a column that does not exist
 * comes back as `{ message: "" }` with no code and no details, since a HEAD
 * response has no body for PostgREST to put them in. Classifying that would
 * mean treating every empty error as a missing column, which would silently
 * swallow real ones.
 *
 * A single ordinary select answers it properly — that shape does report
 * `42703 column listings.slug does not exist` — so every caller below branches
 * on this instead of guessing from its own error.
 */
let richSchemaPromise: Promise<boolean> | null = null

/**
 * Whether the public pages are rendering `public.listings` rather than the
 * bundled arrays.
 *
 * Exposed so the admin-managed block on each page can stand down once the page
 * around it is already showing those same rows through its own components. Both
 * reading from the same table is the point; both rendering it twice is not.
 */
export async function directoryIsDatabaseDriven(): Promise<boolean> {
  if (await hasRichSchema()) return true
  // The flat cutover counts too. Every section below now renders whatever
  // `public.listings` holds, mapped through listings-flat.ts, so a page that
  // also rendered the admin-managed block underneath would show each of those
  // rows twice.
  return (await flatListings()).length > 0
}

function hasRichSchema(): Promise<boolean> {
  const db = supabase
  if (!HAS_BACKEND || !db) return Promise.resolve(false)

  richSchemaPromise ??= (async () => {
    const { error } = await db.from('listings').select('slug').limit(1)
    return !error
  })()

  return richSchemaPromise
}

/* ------------------------------------------------------------------ */
/* The published rows                                                  */
/* ------------------------------------------------------------------ */

/**
 * WHERE THE DIRECTORY COMES FROM
 *
 * There are three answers, tried in this order, and every loader below follows
 * the same sequence:
 *
 *   1. migration 0004 applied   the wide select, mapped by listings-rich.ts.
 *                               Coordinates, weekly hours, numeric rent,
 *                               bilingual columns: the full record.
 *
 *   2. rows but no 0004         the sixteen base columns, mapped by
 *                               listings-flat.ts. Less detail, same rows —
 *                               and, crucially, the same *set* of rows, so
 *                               publishing, editing, hiding and deleting all
 *                               reach the public site.
 *
 *   3. no rows at all           the bundled demo dataset in src/data/, with
 *                               the phone number and photograph the database
 *                               does hold applied over it.
 *
 * Step 2 used to not exist, and its absence was the bug this section was
 * rewritten to fix. A project with 147 published rows and no 0004 fell all the
 * way to step 3: the site rendered arrays compiled into the bundle, and an
 * administrator could rename a listing, replace its photograph or delete it
 * outright and watch the public page carry on showing the old one. Worse, a
 * renamed row stopped matching its bundled twin and appeared *again* in the
 * admin-managed block below it, so one edit produced two cards.
 *
 * Step 3 keeps the overlay it always had, because a bundled record cannot
 * carry a phone number an admin typed or an image they uploaded. It only runs
 * on an empty table now, which is what it was always for.
 */
type ListingOverlay = Map<string, Listing>

/**
 * Every active row of `public.listings`, fetched once and shared.
 *
 * One request serves the whole site: the business corpus, the emergency page,
 * the rentals page and the healthcare overlay all read this array. At the size
 * a district directory reaches that is cheaper than four filtered queries, and
 * — more to the point — it means every page is looking at the same snapshot,
 * so a listing cannot be present on one screen and missing from the next.
 *
 * Cached as the promise rather than the result, so components mounting together
 * share a single request instead of racing to issue one each. Cleared by
 * `invalidateCorpus` after an admin write.
 */
let flatPromise: Promise<Listing[]> | null = null

function flatListings(): Promise<Listing[]> {
  if (!HAS_BACKEND || !supabase) return Promise.resolve([])

  flatPromise ??= listActiveListings().catch((error) => {
    // A failed load must not poison the cache — the next attempt should retry
    // rather than replay the rejection forever.
    flatPromise = null
    throw error
  })

  return flatPromise
}

/** The active rows for one section, in `display_order`. */
async function flatSection(section: string): Promise<Listing[]> {
  return (await flatListings()).filter((l) => l.section === section)
}

/**
 * The database's rows indexed by the identity the importer dedupes on.
 *
 * WHAT THIS IS FOR
 *
 * Two callers, and they use it for opposite halves of the same problem. The
 * healthcare corpus is still assembled from the bundled records — a doctor's
 * chambers, a facility's departments and the links between the two have no
 * columns in the flat schema, and inventing them here would be worse than
 * keeping them — so for that page the database says which records exist and
 * what their editable fields hold, and the bundled record supplies the rest.
 *
 * The remaining bundled paths (which only run when the table is empty) use it
 * for the two fields an admin can change that the bundled data cannot carry at
 * all: the phone number and an uploaded photograph.
 *
 * Matched on section + title, normalised — the same composite the importer
 * writes and `listing-identity.ts` compares on, so a record is paired here
 * exactly as it is there.
 */
async function listingOverlay(): Promise<ListingOverlay> {
  const map: ListingOverlay = new Map()
  for (const listing of await flatListings()) {
    map.set(listingKey(listing.section, listing.title), listing)
  }
  return map
}

function withDatabaseFields<T extends { phone: string; imageUrl?: string | null }>(
  record: T,
  section: string,
  title: string,
  overlay: ListingOverlay,
): T {
  const found = overlay.get(listingKey(section, title))
  if (!found) return record

  const phone = found.phone && found.phone !== record.phone ? found.phone : undefined
  const imageUrl =
    found.imageUrl && found.imageUrl !== record.imageUrl ? found.imageUrl : undefined

  if (!phone && !imageUrl) return record
  return {
    ...record,
    ...(phone ? { phone } : {}),
    ...(imageUrl ? { imageUrl } : {}),
  }
}

/** True when the database has content for this domain and should be believed. */
function hasRows(rows: unknown[] | null): rows is unknown[] {
  return rows !== null && rows.length > 0
}

/**
 * Whether a section has any published rows at all, cached per session.
 *
 * Needed because an empty result from a *filtered* query is ambiguous: it means
 * either "the filters excluded everything", which is a real answer to show, or
 * "this section was never imported", which should fall back to the bundled set.
 * A HEAD count answers that without transferring rows, and the answer cannot
 * change often enough to be worth asking twice.
 */
const sectionPopulated = new Map<string, Promise<boolean>>()

function sectionHasRows(section: string): Promise<boolean> {
  const db = supabase
  if (!HAS_BACKEND || !db) return Promise.resolve(false)

  const cached = sectionPopulated.get(section)
  if (cached) return cached

  const pending = (async () => {
    const { count, error } = await db
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('section', section)
    return error ? false : (count ?? 0) > 0
  })()

  sectionPopulated.set(section, pending)
  return pending
}

/* ------------------------------------------------------------------ */
/* Business corpus                                                     */
/* ------------------------------------------------------------------ */

/**
 * The ranked search in `lib/search.ts` is a tiered fuzzy matcher over the whole
 * corpus — it has to see every listing to score one. So the published set is
 * fetched once, handed to the index, and reused for every subsequent query.
 *
 * Cached as the promise rather than the result, so ten components mounting at
 * once share a single request instead of racing to issue ten.
 */
let corpusPromise: Promise<Business[]> | null = null

/**
 * The sections whose rows are directory entries.
 *
 * Rentals and emergency contacts are excluded: both have their own record
 * shape, their own page and their own loader below, and folding them into the
 * business corpus would put a flat for rent into the results for "pharmacy".
 */
const DIRECTORY_SECTIONS = ['services', 'utilities', 'healthcare']

async function loadCorpus(): Promise<Business[]> {
  if (!HAS_BACKEND || !supabase) return BUSINESSES

  corpusPromise ??= (async () => {
    const rows = await richListings(DIRECTORY_SECTIONS, {
      order: [{ column: 'display_order' }, { column: 'id' }],
    })
    if (hasRows(rows)) return (rows as RichListingRow[]).map(listingToBusiness)

    // No 0004, but there are rows: the directory is those rows, read through
    // the flat mapper. This is what makes an edit, a deletion or an uploaded
    // photograph in the admin panel show up on the public site of a project
    // that has only the sixteen base columns. See lib/listings-flat.ts.
    const all = await flatListings()
    const flat = all.filter((l) => DIRECTORY_SECTIONS.includes(l.section))
    if (flat.length) return flat.map(flatToBusiness)

    // Nothing published at all, which is a fresh project: the bundled dataset
    // is the demo content, with whatever the database does hold applied over
    // it. A business's section is its category group, which is what the importer
    // wrote and therefore what the overlay is keyed on.
    const overlay = await listingOverlay()
    return BUSINESSES.map((b) => withDatabaseFields(b, b.group, b.name.en, overlay))
  })()
    .then((businesses) => {
      setBusinessCorpus(businesses)
      return businesses
    })
    .catch((error) => {
      // A failed load must not poison the cache — the next attempt should retry
      // rather than replay the rejection forever.
      corpusPromise = null
      throw error
    })

  return corpusPromise
}

/**
 * Called after an admin write so the public queries stop serving stale rows.
 *
 * The overlay is cleared alongside the corpus. It caches the phone and image
 * the database holds for every bundled record, so leaving it in place would
 * mean an admin saving a new photograph and the page it belongs to still
 * rendering the previous one — which looks exactly like the save not working.
 */
export function invalidateCorpus(): void {
  corpusPromise = null
  flatPromise = null
  sectionPopulated.clear()
}

/**
 * Everything the public read path holds in memory for this tab.
 *
 * Called by every admin write — see lib/listings-admin.ts. Without it the
 * caches above are per-session, so an administrator could save a listing,
 * click through to the public site in the same tab, and be shown the snapshot
 * taken before their edit. The React Query keys the admin screens invalidate
 * do not reach these: they are module-level promises, deliberately shared by
 * every component, and this is the one place that can clear them.
 */
export function invalidateDirectory(): void {
  invalidateCorpus()
  invalidateHealthcare()
}

/* ------------------------------------------------------------------ */
/* Businesses                                                          */
/* ------------------------------------------------------------------ */

export async function searchBusinesses(options: SearchOptions): Promise<ScoredBusiness[]> {
  await loadCorpus()
  return HAS_BACKEND ? rankBusinesses(options) : delay(rankBusinesses(options))
}

/**
 * One directory entry by slug.
 *
 * Resolved from the corpus rather than by its own query. The corpus is loaded
 * once and shared, so this costs nothing extra, and — more to the point — it
 * guarantees the detail page and the list agree: a record reachable from a card
 * is reachable at its URL, because both read the same array.
 */
export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  if (!HAS_BACKEND || !supabase) return delay(BUSINESS_BY_SLUG[slug] ?? null)

  const corpus = await loadCorpus()
  return corpus.find((b) => b.slug === slug) ?? null
}

export async function listByCategory(
  category: CategoryId,
  origin?: LatLng,
  limit?: number,
): Promise<ScoredBusiness[]> {
  await loadCorpus()
  return rankBusinesses({ category, origin, limit })
}

export async function listByCategories(
  categories: CategoryId[],
  origin?: LatLng,
  limit?: number,
): Promise<ScoredBusiness[]> {
  await loadCorpus()
  return rankBusinesses({ categories, origin, limit })
}

/** Highest-rated verified listings, used for the "Popular" rail. */
export async function listPopular(origin?: LatLng, limit = 8): Promise<ScoredBusiness[]> {
  await loadCorpus()
  return rankBusinesses({ origin, sort: 'rating' })
    .filter((r) => r.business.featured)
    .slice(0, limit)
}

/** Most recently verified listings, used for the "Latest verified" rail. */
export async function listLatestVerified(origin?: LatLng, limit = 8): Promise<ScoredBusiness[]> {
  await loadCorpus()
  return [...rankBusinesses({ origin, verifiedOnly: true })]
    .sort((a, z) => z.business.updatedAt.localeCompare(a.business.updatedAt))
    .slice(0, limit)
}

/** Nearby listings in the same category, shown at the foot of a detail page. */
export async function listRelated(business: Business, limit = 4): Promise<ScoredBusiness[]> {
  await loadCorpus()
  return rankBusinesses({
    category: business.category,
    origin: business.coords,
    sort: 'nearest',
  })
    .filter((r) => r.business.id !== business.id)
    .slice(0, limit)
}

export type DirectoryStats = { total: number; verified: number; always: number }

/**
 * Counted in Postgres with `head: true`, so three cheap COUNT queries replace
 * shipping the table to the client to call `.length` on it.
 */
export async function fetchStats(): Promise<DirectoryStats> {
  if (!HAS_BACKEND || !supabase) return delay(countBusinessesSync())

  // `verified` and `always_open` are columns migration 0004 adds, so without it
  // there is nothing here to count — and a failed HEAD count cannot be told
  // apart from any other error. See `hasRichSchema`.
  if (!(await hasRichSchema())) return countBusinessesSync()

  // Bound to a local: the narrowing above does not survive into the closure.
  const db = supabase

  const active = () =>
    db
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .in('section', DIRECTORY_SECTIONS)

  const [total, verified, always] = await Promise.all([
    active(),
    active().eq('verified', true),
    active().eq('always_open', true),
  ])

  const failed = total.error ?? verified.error ?? always.error
  if (failed) throw new Error(`Failed to count listings: ${failed.message}`)

  // Nothing imported yet: report the bundled counts, which is what the rest of
  // the page is rendering. A zeroed stat line under a populated page reads as
  // a bug rather than as an empty directory.
  if ((total.count ?? 0) === 0) return countBusinessesSync()

  return {
    total: total.count ?? 0,
    verified: verified.count ?? 0,
    always: always.count ?? 0,
  }
}

/**
 * Synchronous counts over the bundled data.
 *
 * Used as the hero's initial value so the stat line renders a real number on
 * first paint instead of animating up from zero, then reconciles to the live
 * counts when `fetchStats` resolves.
 */
export function countBusinessesSync(): DirectoryStats {
  return {
    total: BUSINESSES.length,
    verified: BUSINESSES.filter((b) => b.verified).length,
    always: BUSINESSES.filter((b) => b.hours === 'always').length,
  }
}

/* ------------------------------------------------------------------ */
/* Emergency                                                           */
/* ------------------------------------------------------------------ */

export async function listEmergency(): Promise<EmergencyContact[]> {
  if (!HAS_BACKEND || !supabase) return delay(EMERGENCY_CONTACTS)

  // Ordered by priority: on this page the sequence is the safety feature, so
  // the most urgent service has to stay at the top whatever else changes.
  const rows = await richListings(['emergency'], {
    order: [{ column: 'priority' }, { column: 'display_order' }],
  })

  if (hasRows(rows)) return (rows as RichListingRow[]).map(listingToEmergency)

  // The flat cutover: the page is the `emergency` rows themselves, in display
  // order, so hiding or deleting one in the admin panel takes it off the page.
  // See lib/listings-flat.ts.
  const flat = await flatSection('emergency')
  if (flat.length) return flat.map(flatToEmergency)

  // Bundled presentation, database numbers and images — see `listingOverlay`.
  // Every emergency contact is stored under the `emergency` section.
  const overlay = await listingOverlay()
  return EMERGENCY_CONTACTS.map((c) =>
    withDatabaseFields(c, 'emergency', c.name.en, overlay),
  )
}

/* ------------------------------------------------------------------ */
/* Homepage coverage bands                                             */
/* ------------------------------------------------------------------ */

/**
 * What the two homepage strips say the directory covers.
 *
 * These are category chips drawn from the app's own catalogue, not user
 * content: `CATEGORY_MAP` is what supplies each chip's name, emoji and icon,
 * so a chip only means anything if this build already knows the id. That makes
 * the pair static content by the test in §11 of the brief — there is nothing
 * here for an admin to edit that is not already a code-level category — and it
 * is served from the bundled lists rather than from a table.
 *
 * `cleanCoverage` still runs, so an id the catalogue has since dropped falls
 * out of the strip instead of rendering as a blank chip.
 *
 * (This previously queried a `category_bar_items` table that this project does
 * not have and never did, so every load spent a round trip to be told so and
 * then used exactly these values.)
 */
export async function loadCoverage(): Promise<CoverageBands> {
  return delay({
    covering: cleanCoverage(FALLBACK_COVERAGE.covering),
    covers: cleanCoverage(FALLBACK_COVERAGE.covers),
  })
}

/* ------------------------------------------------------------------ */
/* Rentals                                                             */
/* ------------------------------------------------------------------ */

export type RentalFilters = {
  categories?: CategoryId[]
  maxRent?: number
  minRent?: number
  bedrooms?: number | null
  bathrooms?: number | null
  tenantType?: TenantType | null
  furnishedOnly?: boolean
  area?: string | null
  origin?: LatLng
  sort?: 'recommended' | 'price-asc' | 'price-desc' | 'newest'
}

export type ScoredRental = { rental: Rental; distanceKm: number }

/**
 * Unlike the business search, every rental filter is a plain predicate over
 * indexed columns, so these run in Postgres. Nothing is fetched that the user
 * has filtered out — which is what keeps the page usable once there are more
 * listings than fit in a phone's memory.
 */
export async function listRentals(filters: RentalFilters = {}): Promise<ScoredRental[]> {
  if (!HAS_BACKEND || !supabase) return delay(filterRentals(RENTALS, filters))

  const {
    categories, maxRent, minRent, bedrooms, bathrooms,
    tenantType, furnishedOnly, area, origin, sort = 'recommended',
  } = filters

  // Every predicate runs in Postgres against the columns migration 0004 added
  // and indexed, so a filtered rentals page fetches only what it renders —
  // which is what keeps the page usable once there are more listings than fit
  // in a phone's memory.
  const spec: ListingQuery = { eq: {}, in: {}, gte: {}, lte: {} }
  if (categories?.length) spec.in!.category = categories
  // A "family" filter still surfaces listings open to anyone.
  if (tenantType) spec.in!.tenant_type = [tenantType, 'any']
  if (minRent !== undefined) spec.gte!.rent = minRent
  if (maxRent !== undefined) spec.lte!.rent = maxRent
  if (bedrooms != null && bedrooms > 0) spec.gte!.bedrooms = bedrooms
  if (bathrooms != null && bathrooms > 0) spec.gte!.bathrooms = bathrooms
  if (furnishedOnly) spec.eq!.furnished = true
  if (area) spec.eq!.area_id = area

  spec.order =
    sort === 'price-asc'
      ? [{ column: 'rent', ascending: true }]
      : sort === 'price-desc'
        ? [{ column: 'rent', ascending: false }]
        : sort === 'newest'
          ? [{ column: 'updated_at', ascending: false }]
          : [
              { column: 'verified', ascending: false },
              { column: 'updated_at', ascending: false },
            ]

  const rows = await richListings(['rentals'], spec)

  // Null means the rich schema is absent. Empty is ambiguous, so it is only
  // treated as a real "nothing matches" once the section is known to hold rows.
  if (rows !== null && (rows.length > 0 || (await sectionHasRows('rentals')))) {
    return rows.map((r) => {
      const rental = listingToRental(r)
      return { rental, distanceKm: origin ? haversineKm(origin, rental.coords) : 0 }
    })
  }

  /*
   * The flat cutover. Every predicate this page offers reads a column 0004
   * adds, so without it there is nothing to push into Postgres: the section is
   * fetched once (shared with the rest of the site) and filtered in memory.
   * A district's rentals are tens of rows, not thousands.
   *
   * What matters is that the rows are the database's. A rental published,
   * repriced, hidden or deleted in the admin panel changes this page on the
   * next load, which it did not when the page was reading a bundled array.
   */
  const flat = await flatSection('rentals')
  if (flat.length) return filterRentals(flat.map(flatToRental), filters)

  return bundledRentals(filters)
}

/** Bundled rentals with database numbers and images applied. */
async function bundledRentals(filters: RentalFilters): Promise<ScoredRental[]> {
  const overlay = await listingOverlay()
  return filterRentals(RENTALS, filters).map((scored) => ({
    ...scored,
    rental: withDatabaseFields(scored.rental, 'rentals', scored.rental.title.en, overlay),
  }))
}

/**
 * The rentals filters, applied in memory.
 *
 * Used by the flat-schema path above and by the bundled fallback, so the two
 * cannot drift into filtering differently.
 */
function filterRentals(rentals: Rental[], filters: RentalFilters): ScoredRental[] {
  const {
    categories, maxRent, minRent, bedrooms, bathrooms,
    tenantType, furnishedOnly, area, origin, sort = 'recommended',
  } = filters

  const allowed = categories?.length ? new Set(categories) : null

  // The budget slider tops out at RENT_RANGE.max and is labelled with a "+",
  // so its maximum means "no ceiling". Treating it as a literal one would hide
  // every listing an admin priced above the slider's range.
  const ceiling = maxRent !== undefined && maxRent < RENT_RANGE.max ? maxRent : undefined

  const out = rentals.filter((r) => {
    if (allowed && !allowed.has(r.category)) return false
    if (ceiling !== undefined && r.rent > ceiling) return false
    if (minRent !== undefined && r.rent < minRent) return false
    if (bedrooms != null && bedrooms > 0 && r.bedrooms < bedrooms) return false
    if (bathrooms != null && bathrooms > 0 && r.bathrooms < bathrooms) return false
    if (tenantType && r.tenantType !== tenantType && r.tenantType !== 'any') return false
    if (furnishedOnly && !r.furnished) return false
    if (area && r.area !== area) return false
    return true
  }).map((rental) => ({
    rental,
    distanceKm: origin ? haversineKm(origin, rental.coords) : 0,
  }))

  switch (sort) {
    case 'price-asc':
      out.sort((a, z) => a.rental.rent - z.rental.rent)
      break
    case 'price-desc':
      out.sort((a, z) => z.rental.rent - a.rental.rent)
      break
    case 'newest':
      out.sort((a, z) => z.rental.updatedAt.localeCompare(a.rental.updatedAt))
      break
    default:
      out.sort(
        (a, z) =>
          Number(z.rental.verified) - Number(a.rental.verified) ||
          z.rental.updatedAt.localeCompare(a.rental.updatedAt),
      )
  }

  return out
}

/* ------------------------------------------------------------------ */
/* Healthcare                                                          */
/* ------------------------------------------------------------------ */

/**
 * The healthcare directory is loaded whole, for the same reason the business
 * corpus is: `lib/healthcare-search.ts` cross-links doctors to the facilities
 * they sit in and scores a query against both, which it cannot do one page at
 * a time. Facilities and doctors are fetched in parallel and handed to that
 * module as one corpus.
 */
let healthPromise: Promise<HealthRecord[]> | null = null

export async function loadHealthcare(): Promise<HealthRecord[]> {
  if (!HAS_BACKEND || !supabase) return delay(HEALTH_RECORDS)

  healthPromise ??= (async () => {
    const rows = await richListings(['healthcare'], {
      order: [{ column: 'display_order' }, { column: 'id' }],
    })
    if (!hasRows(rows)) return flatHealthcare()

    const records = (rows as RichListingRow[]).map(listingToHealthRecord)

    // A facility's doctor list is the mirror of each doctor's `facility_ids`.
    // Rebuilding it from that one side means the two directions cannot
    // disagree: an admin editing a doctor's facilities updates both, and a
    // facility whose `doctor_ids` was never filled in still resolves.
    const byFacility = new Map<string, string[]>()
    for (const r of records) {
      if (r.kind !== 'doctor') continue
      for (const facilitySlug of r.facilityIds ?? []) {
        const list = byFacility.get(facilitySlug) ?? []
        list.push(r.id)
        byFacility.set(facilitySlug, list)
      }
    }
    for (const r of records) {
      if (r.kind === 'facility') {
        const derived = byFacility.get(r.id)
        if (derived?.length) r.doctorIds = derived
      }
    }

    return records
  })()
    .then((records) => {
      setHealthCorpus(records)
      return records
    })
    .catch((error) => {
      healthPromise = null
      throw error
    })

  return healthPromise
}

/**
 * The healthcare corpus on a project without migration 0004.
 *
 * The one place the bundled records still lead, and deliberately: a doctor's
 * chambers, a facility's departments, its test list and the links between
 * doctors and the facilities they sit in have no columns in the flat schema.
 * Mapping /healthcare out of sixteen text columns would mean discarding all of
 * that, which is a worse page than the one this produces.
 *
 * What the database decides here is everything it legitimately can:
 *
 *   existence   a record with no active row is not rendered, so hiding or
 *               deleting a listing in the admin panel takes it off this page
 *               as well as off every other one;
 *   fields      title, description (a doctor's specialty, which is what the
 *               importer wrote there), phone, email, address and image come
 *               from the row whenever the row has them.
 *
 * Until the section has been imported at all, the bundled corpus is served
 * whole -- an empty table is a project that has not started, not a directory
 * with nothing in it.
 */
async function flatHealthcare(): Promise<HealthRecord[]> {
  const overlay = await listingOverlay()
  const populated = await sectionHasRows('healthcare')
  if (!populated) return HEALTH_RECORDS

  const out: HealthRecord[] = []
  for (const record of HEALTH_RECORDS) {
    const row = overlay.get(listingKey('healthcare', record.name.en))
    // Deleted, or set inactive: the overlay only carries active rows.
    if (!row) continue

    const contact = { ...(record.contact ?? {}) }
    if (row.phone) contact.phone = row.phone
    if (row.email) contact.email = row.email

    const next = { ...record, contact } as HealthRecord
    if (row.title.trim() && row.title.trim() !== record.name.en) {
      next.name = { bn: row.title.trim(), en: row.title.trim() }
    }
    if (row.imageUrl) next.imageUrl = row.imageUrl

    const text = row.description.trim()
    if (text) {
      if (next.kind === 'doctor') {
        if (text !== next.specialty.en) next.specialty = { bn: text, en: text }
      } else if (text !== next.description?.en) {
        next.description = { bn: text, en: text }
      }
    }

    if (next.kind !== 'doctor' && row.address.trim() && row.address.trim() !== next.address?.en) {
      next.address = { bn: row.address.trim(), en: row.address.trim() }
    }

    out.push(next)
  }

  return out
}

export function invalidateHealthcare(): void {
  healthPromise = null
  flatPromise = null
}

export async function getRentalBySlug(slug: string): Promise<Rental | null> {
  if (!HAS_BACKEND || !supabase) return delay(RENTAL_BY_SLUG[slug] ?? null)

  const rows = await richListings(['rentals'], { eq: { slug } })
  if (hasRows(rows)) return listingToRental((rows as RichListingRow[])[0])

  // The flat schema has no slug column, so the slug is derived on the way out
  // and matched here the same way. See `slugOf` in lib/listings-flat.ts.
  const flat = await flatSection('rentals')
  const found = flat.map(flatToRental).find((r) => r.slug === slug)
  if (found) return found

  // No rich schema, or nothing published under that slug — the bundled record
  // is the only remaining place it could be.
  return RENTAL_BY_SLUG[slug] ?? null
}

/* ------------------------------------------------------------------ */
/* Listings — the admin-managed content                                */
/* ------------------------------------------------------------------ */

/**
 * Everything published from the admin panel.
 *
 * This is the one part of the site whose content is not bundled: `listings` is
 * the table the admin panel writes, so there is nothing sensible to fall back
 * to when it cannot be read. An unconfigured build returns an empty list and
 * the sections that render it simply do not appear, which is correct — no
 * backend means nothing has been published yet.
 *
 * Two rules are enforced here rather than at each call site, because getting
 * either wrong is a content leak rather than a layout bug:
 *
 *   - only `status = 'active'` rows are ever returned, so unpublishing in the
 *     admin panel removes a listing from the public site on the next load;
 *   - `display_order` decides the sequence, which is the column the admin
 *     table sorts on, so what an editor arranges is what a visitor sees.
 */
export async function listActiveListings(section?: string): Promise<Listing[]> {
  // No backend configured at all is a build-time state, not a runtime failure —
  // an empty list is the honest answer.
  if (!HAS_BACKEND || !supabase) return []

  // Chosen at runtime rather than fixed: `services` and `maps_url` only exist
  // once migration 0007 is applied, and naming a column the database does not
  // have fails the entire query rather than one field. See listing-columns.ts.
  let q = supabase
    .from('listings')
    .select(await listingSelect())
    .eq('status', 'active')
    .order('display_order', { ascending: true, nullsFirst: false })
    // A stable tiebreak within one display_order, so equal values do not
    // reshuffle between loads.
    .order('id', { ascending: true })

  if (section) q = q.eq('section', section)

  const { data, error } = await q
  if (error) {
    // Thrown, not swallowed. Returning an empty list here would render exactly
    // like "nothing published yet", which is the one failure mode that must not
    // look like success: it would hide a broken backend behind a page that
    // appears fine. The section renders an error state instead.
    throw new Error(`Failed to load listings: ${error.message}`)
  }

  return ((data ?? []) as unknown as ListingRow[]).map(toListing)
}

/**
 * One published listing, by its database id.
 *
 * Backs `/listing/:id`. The id arrives from the URL as a string and the column
 * is a bigint, so it is parsed and checked here rather than handed to PostgREST
 * as-is: `/listing/abc` must be a clean "not found", not a 400 from Postgres
 * failing to cast, and not an error state that reads like the server is broken.
 *
 * `status = 'active'` is applied for the same reason it is in
 * `listActiveListings`: an unpublished row must not become reachable just
 * because somebody has its id. Null therefore covers three cases the caller
 * renders identically — never existed, deleted, or unpublished — which is
 * correct, because distinguishing them for an anonymous visitor would leak
 * exactly the thing unpublishing is for.
 */
export async function getListingById(id: string | number): Promise<Listing | null> {
  if (!HAS_BACKEND || !supabase) return null

  // `Number()` alone accepts '', '0x1f', '1e3' and ' 12 '; the ids this route
  // issues are plain positive integers, so anything else is a bad URL.
  const numeric = typeof id === 'number' ? id : /^\d+$/.test(id.trim()) ? Number(id.trim()) : NaN
  if (!Number.isSafeInteger(numeric) || numeric <= 0) return null

  const { data, error } = await supabase
    .from('listings')
    .select(await listingSelect())
    .eq('id', numeric)
    .eq('status', 'active')
    // maybeSingle, not single: "no such row" is an ordinary outcome for a URL
    // somebody typed, and `single` reports it as a query error instead.
    .maybeSingle()

  if (error) throw new Error(`Failed to load listing: ${error.message}`)
  if (!data) return null
  return toListing(data as unknown as ListingRow)
}
