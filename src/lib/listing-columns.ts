import { LISTING_SELECT } from './listings'
import { HAS_BACKEND, supabase } from './supabase'

/* ==========================================================================
 * Which columns of `public.listings` this project actually has.
 *
 * WHY THIS EXISTS
 *
 * `services` and `maps_url` arrive with migration 0007, `verified` and
 * `featured` with 0014 (or with the much larger 0004, which also defines them).
 * A migration is applied by a person, not by a deploy. So there is always a
 * window — possibly a long one — where the built site is asking for columns the
 * database does not have yet. PostgREST answers that with a 400 and `42703
 * column listings.maps_url does not exist`, and because every listing read
 * names its columns explicitly, one missing column does not degrade a field: it
 * fails the whole query. The directory, the admin table and every section that
 * reads it would go to their error state at once.
 *
 * Asking first is what makes the two orderings equivalent. Deploy then migrate,
 * or migrate then deploy — either way the site works, and the fields appear on
 * the next load after the SQL runs, with no second deploy.
 *
 * ONE QUESTION PER MIGRATION
 *
 * This used to ask a single question — "is 0007 applied?" — naming both of its
 * columns. That is no longer enough: `verified` can be present without
 * `services` (a project that ran 0014 but not 0007, or the other way round),
 * and one absent column must not hide the others.
 *
 * So there is one probe per migration rather than one per column. The columns a
 * migration adds arrive together or not at all, which makes the group the
 * honest unit — and it keeps this to two requests instead of four. Each probe
 * that comes back "column does not exist" logs a 400 in the console; that is
 * the answer being obtained, not a fault, and the accompanying line says so.
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

/**
 * Columns this app writes and reads when they exist, and lives without when
 * they do not.
 *
 *   services, maps_url   migration 0007
 *   verified, featured   migration 0014 (also defined by 0004)
 */
const COLUMN_GROUPS = [
  { migration: '0007', columns: ['services', 'maps_url'] },
  { migration: '0014', columns: ['verified', 'featured'] },
] as const

export const OPTIONAL_COLUMNS = COLUMN_GROUPS.flatMap((g) => [...g.columns])

export type OptionalColumn = (typeof COLUMN_GROUPS)[number]['columns'][number]

/**
 * Asked once per session and cached as the promise, so the many callers that
 * mount at the same moment share a single round of requests rather than racing
 * to issue one each.
 *
 * A failure that is *not* a missing column — the network is down, the key is
 * wrong — also resolves to "absent". That is deliberate: the caller's next real
 * query will surface the actual error with its own message, and answering "no"
 * here only costs an optional field rather than turning an unrelated outage
 * into a confusing one about schema.
 */
let columnsPromise: Promise<Set<string>> | null = null

export function listingColumns(): Promise<Set<string>> {
  const db = supabase
  if (!HAS_BACKEND || !db) return Promise.resolve(new Set<string>())

  columnsPromise ??= (async () => {
    const found = await Promise.all(
      COLUMN_GROUPS.map(async (group) => {
        const { error } = await db.from('listings').select(group.columns.join(', ')).limit(1)
        if (error) {
          console.info(
            `[elakai] listings.${group.columns.join(' / listings.')} are not present — ` +
              `the fields that depend on them stay hidden until migration ${group.migration} ` +
              `is applied. (${error.message})`,
          )
          return []
        }
        return [...group.columns] as string[]
      }),
    )
    return new Set(found.flat())
  })().catch(() => new Set<string>())

  return columnsPromise
}

/** Whether one optional column exists on this project. */
export async function hasListingColumn(column: OptionalColumn): Promise<boolean> {
  return (await listingColumns()).has(column)
}

/** The widest select this database will actually answer. */
export async function listingSelect(): Promise<string> {
  const present = await listingColumns()
  const extras = OPTIONAL_COLUMNS.filter((c) => present.has(c))
  return extras.length ? `${LISTING_SELECT}, ${extras.join(', ')}` : LISTING_SELECT
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
  const present = await listingColumns()
  const out = { ...row }
  for (const column of OPTIONAL_COLUMNS) {
    if (!present.has(column)) delete out[column]
  }
  return out
}

/** Testing seam: forget the cached answer so the next call asks again. */
export function resetListingExtras(): void {
  columnsPromise = null
}
