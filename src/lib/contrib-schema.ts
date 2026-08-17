import { HAS_BACKEND, supabase } from './supabase'

/* ==========================================================================
 * Whether migration 0008 has been applied.
 *
 * WHY THIS EXISTS
 *
 * Same reason as `hasListingExtras` in listing-columns.ts and `hasRichSchema`
 * in api.ts, and it is the third time this project has needed the pattern, so
 * it is worth stating once properly: a migration is applied by a person in the
 * Supabase SQL editor, and a deploy is applied by a push to `main`. Those are
 * different events on different clocks, and there is always a window — possibly
 * a long one — where the built site is talking to a database that does not yet
 * have what the build assumes.
 *
 * Asking first is what makes the two orderings equivalent. Deploy then migrate,
 * or migrate then deploy: either way the public site is untouched, the existing
 * admin panel keeps working, and the contributor system appears on the next
 * load after the SQL runs, with no second deploy.
 *
 * WHAT "NOT READY" MEANS IN THE UI
 *
 * Not a blank screen and not a thrown error. The Contribute entry point stays
 * visible but explains that contributions are not open yet, and /admin keeps
 * working through the legacy id check in config.ts. Nothing about the public
 * site changes in either state.
 * ========================================================================== */

/**
 * PostgREST reports a table the schema does not have as `PGRST205` (its own
 * schema-cache miss) or as Postgres `42P01` (undefined_table), depending on
 * whether the cache has been reloaded since. Both mean the same thing here.
 *
 * Any other error — network down, key wrong, RLS refusing — is deliberately NOT
 * treated as "missing". Answering "no" for an unrelated outage would tell a
 * contributor their account does not exist because their wifi dropped.
 */
function isMissingTable(code: string | undefined, message: string): boolean {
  if (code === 'PGRST205' || code === '42P01') return true
  return /could not find the table|relation .* does not exist/i.test(message)
}

let readyPromise: Promise<boolean> | null = null

/**
 * Asked once per session and cached as the promise, so the several callers
 * that mount at the same moment share one request rather than racing.
 *
 * Selecting `id` from `profiles` is the cheapest question that distinguishes
 * the two states. Signed out, RLS returns zero rows and no error, which is a
 * "yes" — the table is there. Missing, it returns one of the codes above.
 */
export function contributorSchemaReady(): Promise<boolean> {
  const db = supabase
  if (!HAS_BACKEND || !db) return Promise.resolve(false)

  readyPromise ??= (async () => {
    const { error } = await db.from('profiles').select('id').limit(1)
    if (!error) return true

    if (isMissingTable(error.code, error.message)) {
      console.info(
        '[elakai] the contributor schema is not present — contributions stay ' +
          'closed until supabase/migrations/0008_contributors.sql is applied. ' +
          `(${error.message})`,
      )
      return false
    }

    // Something else went wrong. Assume the schema is there and let the real
    // query report the real problem with its own message.
    console.warn('[elakai] could not check the contributor schema:', error.message)
    return true
  })().catch(() => false)

  return readyPromise
}

/** Testing seam: forget the cached answer so the next call asks again. */
export function resetContributorSchema(): void {
  readyPromise = null
}
