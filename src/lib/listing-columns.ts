import { LISTING_SELECT } from './listings'
import { HAS_BACKEND, supabase } from './supabase'

/* ==========================================================================
 * Which columns of `public.listings` this project actually has.
 *
 * WHY THIS EXISTS
 *
 * `services` and `maps_url` arrive with migration 0007, and a migration is
 * applied by a person, not by a deploy. So there is always a window — possibly
 * a long one — where the built site is asking for columns the database does not
 * have yet. PostgREST answers that with a 400 and `42703 column
 * listings.maps_url does not exist`, and because every listing read names its
 * columns explicitly, one missing column does not degrade a field: it fails the
 * whole query. The directory, the admin table and every section that reads it
 * would go to their error state at once.
 *
 * Asking first is what makes the two orderings equivalent. Deploy then migrate,
 * or migrate then deploy — either way the site works, and the fields appear on
 * the next load after the SQL runs, with no second deploy.
 *
 * This is the same technique `hasRichSchema` in api.ts uses for migration 0004,
 * and for the same stated reason: a plain select reports a missing column
 * properly, where a HEAD count comes back as an empty error that cannot be told
 * apart from any other failure.
 *
 * Lives in its own module because the public read path (api.ts) and the admin
 * write path (listings-admin.ts) both need the answer, and those two
 * deliberately do not import each other's query code.
 * ========================================================================== */

/** The columns 0007 adds, appended to the base select when they are present. */
const OPTIONAL_COLUMNS = ['services', 'maps_url'] as const

export const LISTING_SELECT_WITH_EXTRAS = `${LISTING_SELECT}, ${OPTIONAL_COLUMNS.join(', ')}`

/**
 * Asked once per session and cached as the promise, so the many callers that
 * mount at the same moment share a single request rather than racing to issue
 * one each.
 *
 * A failure that is *not* a missing column — the network is down, the key is
 * wrong — also resolves false. That is deliberate: the caller's next real query
 * will surface the actual error with its own message, and answering "no" here
 * only costs two optional fields rather than turning an unrelated outage into a
 * confusing one about schema.
 */
let extrasPromise: Promise<boolean> | null = null

export function hasListingExtras(): Promise<boolean> {
  const db = supabase
  if (!HAS_BACKEND || !db) return Promise.resolve(false)

  extrasPromise ??= (async () => {
    const { error } = await db.from('listings').select(OPTIONAL_COLUMNS.join(', ')).limit(1)
    if (error) {
      console.info(
        '[elakai] listings.services / listings.maps_url are not present — ' +
          'those two fields stay hidden until supabase/migrations/0007 is applied. ' +
          `(${error.message})`,
      )
      return false
    }
    return true
  })().catch(() => false)

  return extrasPromise
}

/** The widest select this database will actually answer. */
export async function listingSelect(): Promise<string> {
  return (await hasListingExtras()) ? LISTING_SELECT_WITH_EXTRAS : LISTING_SELECT
}

/**
 * Drops the optional fields from a row being written when the columns are not
 * there yet.
 *
 * Writes need this as much as reads do: Postgres rejects an INSERT naming a
 * column that does not exist, so an admin saving any listing at all would fail
 * — not just one that filled in the new fields.
 */
export async function stripMissingColumns<T extends Record<string, unknown>>(
  row: T,
): Promise<Partial<T>> {
  if (await hasListingExtras()) return row
  const out = { ...row }
  for (const column of OPTIONAL_COLUMNS) delete out[column]
  return out
}

/** Testing seam: forget the cached answer so the next call asks again. */
export function resetListingExtras(): void {
  extrasPromise = null
}
