/**
 * Generates `supabase/0006_backfill_listings.sql` from the bundled directory.
 *
 * Written rather than hand-authored for one reason: the values are bilingual
 * pairs, seven-day `hours` grids, `chambers`, `qualifications` and doctor
 * <-> facility links rewritten from bundled ids to slugs. Hand-escaping 147
 * records of that — Bengali text, embedded quotes, nested jsonb — is where a
 * silent corruption comes from. This emits it from `buildImportRows(true)`,
 * the same function the panel's backfill uses and the one already round-trip
 * tested against `listings-rich.ts`.
 *
 * IDENTITY AND IDEMPOTENCE
 *
 * Each statement matches one row on `lower(trim(section))` + `lower(trim(title))`
 * — the composite key the importer already dedupes on — and additionally on
 * `slug is null`.
 *
 * That last clause is the whole safety property. `slug` is null on every row
 * until this file runs and is never written by anything else, so it marks a row
 * as "not yet backfilled". A second run matches nothing and updates nothing,
 * which is what makes the file safe to re-run and safe to resume if it is
 * interrupted half way. It also means an admin edit made after the backfill can
 * never be reverted by running it again.
 *
 * Because the guard guarantees a virgin row, each statement can assign
 * directly. A `coalesce(col, value)` form would look safer and would in fact be
 * wrong: nine of these columns are `not null default`, so they are already
 * `false`/`0` rather than null, and coalesce would keep the default forever.
 *
 * Usage:  npx tsx scripts/generate-backfill-sql.ts
 */
import { writeFileSync } from 'node:fs'
import { buildImportRows } from '../src/lib/listings-import'

/** Columns the backfill must never touch — the original sixteen. */
const PRESERVED = new Set([
  'section', 'title', 'description', 'phone', 'email', 'address', 'location',
  'category', 'price', 'availability', 'image_url', 'status', 'display_order',
])

/** A single-quoted SQL string literal, with embedded quotes doubled. */
function str(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

function literal(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null'
  if (typeof value === 'string') return str(value)
  // Arrays and objects go in as jsonb. JSON.stringify handles the escaping of
  // the contents; `str` then handles escaping it into a SQL literal.
  return `${str(JSON.stringify(value))}::jsonb`
}

const rows = buildImportRows(true)

const statements = rows.map((row) => {
  const assignments = Object.entries(row)
    .filter(([column, value]) => !PRESERVED.has(column) && value !== null && value !== undefined)
    .map(([column, value]) => `  ${column} = ${literal(value)}`)

  // `updated_at` is bumped so the admin's "recently updated" ordering reflects
  // that these rows were completed, rather than still reporting import time.
  assignments.push('  updated_at = now()')

  const section = row.section.trim().toLowerCase()
  const title = row.title.trim().toLowerCase()

  return (
    `update public.listings set\n${assignments.join(',\n')}\n` +
    `where lower(trim(section)) = ${str(section)}\n` +
    `  and lower(trim(title)) = ${str(title)}\n` +
    `  and slug is null;`
  )
})

const header = `-- =============================================================================
-- 0006 — backfill the columns 0004 and 0005 added
--
-- GENERATED FILE. Do not edit by hand.
-- Regenerate with:  npx tsx scripts/generate-backfill-sql.ts
--
-- Run AFTER 0004 and 0005. Running it before will fail on the first unknown
-- column, having changed nothing.
--
-- ${rows.length} statements, one per bundled record. Each matches a single row on
-- (section, title) — the dedupe key the importer uses — and on \`slug is null\`,
-- which marks a row as not yet backfilled.
--
-- SAFE TO RUN TWICE. The second run matches zero rows, because \`slug\` is no
-- longer null. That also makes it safe to resume after an interruption, and
-- means an admin edit made afterwards can never be reverted by re-running it.
--
-- Touches only the columns 0004/0005 added. The original sixteen — title,
-- phone, description, address, image_url, status and the rest — are never
-- named here, so anything edited in the admin panel survives untouched.
--
-- Expected: ${rows.length} rows updated on the first run, 0 on any run after it.
-- =============================================================================

begin;

`

const footer = `
-- Verify before committing: expect 147 / 147 / 0.
select count(*) as total,
       count(slug) as with_slug,
       count(*) filter (where slug is null) as still_missing
from public.listings;

commit;
`

const sql = header + statements.join('\n\n') + '\n' + footer
const out = new URL('../supabase/0006_backfill_listings.sql', import.meta.url)
writeFileSync(out, sql, 'utf8')

console.log(`Wrote ${statements.length} statements -> supabase/0006_backfill_listings.sql`)
console.log(`Size: ${(sql.length / 1024).toFixed(0)} KB`)
