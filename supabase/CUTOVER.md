# Cutover runbook — making `public.listings` the runtime source of truth

Run these in order in the Supabase SQL Editor. Nothing here has been executed.

Every write step states what it changes, how many rows it touches, why it is
safe, and whether it can be undone.

**Current verified state** (read with the anon key, 2026-08-15):

| | |
|---|---|
| Rows in `public.listings` | 147 |
| By section | healthcare 75, services 33, utilities 7, rentals 18, emergency 14 |
| Columns | 16 (base) |
| `0004` applied | no — `slug` returns `42703 column does not exist` |
| `0005` applied | no |
| Duplicate rows | 0 |
| Rows with no bundled counterpart | 0 |

---

## STEP 1 — Preflight (READ ONLY)

Changes nothing. Confirms the starting state matches the table above.

```sql
-- 1a. Row count and section split. Expect 147 total; 75/33/7/18/14.
select coalesce(section, '(null)') as section, count(*) as rows
from public.listings
group by section
order by rows desc;

-- 1b. Column count. Expect exactly 16.
select count(*) as column_count
from information_schema.columns
where table_schema = 'public' and table_name = 'listings';

-- 1c. Confirm 0004/0005 are NOT applied. Expect zero rows.
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'listings'
  and column_name in ('slug', 'lat', 'lng', 'subcategory', 'gallery');

-- 1d. Duplicate identity keys (section + title). Expect zero rows.
select lower(trim(section)) as s, lower(trim(title)) as t, count(*)
from public.listings
group by 1, 2 having count(*) > 1;

-- 1e. The known-bad emergency number. Expect exactly one row, id 96.
select id, title, phone from public.listings where phone = '911';
```

---

## STEP 2 — Migration 0004 (WRITE — schema only)

**File:** `supabase/migrations/0004_listings_full_schema.sql` — paste it whole.

- **Changes:** adds **55 columns** and **5 indexes** to `public.listings`.
- **Rows affected:** 0. Every column is nullable or has a default, so no
  existing row is rewritten.
- **Why safe:** every statement is `ADD COLUMN IF NOT EXISTS` or
  `CREATE INDEX IF NOT EXISTS`. Statically verified: **zero** `DROP`,
  `TRUNCATE`, `DELETE`, `RENAME` or type-change statements. Existing columns
  are untouched. Safe to run twice.
- **Reversible:** yes — `alter table public.listings drop column <name>;` per
  column. Nothing is lost by adding them, so a rollback is only needed if you
  change your mind about the design.

One index is **unique**: `listings_slug_key on (slug) where slug is not null`.
It creates cleanly against the current data because all 147 rows have `slug`
null right now. The values the backfill will write have been checked:
**147 rows, 147 distinct slugs, 0 blanks, 0 collisions.**

---

## STEP 3 — Verify 0004

```sql
-- 3a. Expect 71 (16 base + 55 added).
select count(*) as column_count
from information_schema.columns
where table_schema = 'public' and table_name = 'listings';

-- 3b. Expect all five index names present.
select indexname from pg_indexes
where schemaname = 'public' and tablename = 'listings'
order by indexname;
-- listings_area_idx, listings_category_idx, listings_rent_idx,
-- listings_section_status_order_idx, listings_slug_key

-- 3c. Spot-check types. rating numeric, lat/lng double precision,
--     hours/services/chambers jsonb, verified/featured boolean.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'listings'
  and column_name in ('slug','lat','lng','rating','hours','services',
                      'chambers','verified','featured','rent','available_from')
order by column_name;

-- 3d. Still 147 rows, nothing disturbed.
select count(*) from public.listings;
```

**Do not continue unless 3a returns 71 and 3d returns 147.**

---

## STEP 4 — Migration 0005 (WRITE — schema only)

**File:** `supabase/migrations/0005_expand_listings_schema.sql` — paste it whole.

- **Changes:** adds **3 columns** (`subcategory`, `alt_phone`, `gallery`) and
  **1 index** (`listings_category_subcategory_idx`).
- **Rows affected:** 0.
- **Why safe:** same guarantees as 0004. Structurally independent of 0004 — its
  index uses `category` (base column) and `subcategory` (which it creates) — but
  apply it after 0004 so the schema reaches its final shape in one sitting.
- **Reversible:** yes, same as above.

---

## STEP 5 — Verify 0005

```sql
-- Expect 74 (16 + 55 + 3).
select count(*) as column_count
from information_schema.columns
where table_schema = 'public' and table_name = 'listings';

-- Expect three rows.
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'listings'
  and column_name in ('subcategory','alt_phone','gallery');

-- Expect 147.
select count(*) from public.listings;
```

---

## STEP 6 — Backfill preview (READ ONLY)

Changes nothing. Shows how much is still blank, which is what the backfill
will fill.

```sql
-- Expect all 147 rows blank on every added column at this point.
select
  count(*)                                          as total_rows,
  count(*) filter (where slug is null)              as missing_slug,
  count(*) filter (where lat is null)               as missing_coords,
  count(*) filter (where title_en is null)          as missing_english_title,
  count(*) filter (where title_bn is null)          as missing_bengali_title,
  count(*) filter (where hours is null
                     and always_open is not true)   as missing_hours,
  count(*) filter (where rating is null)            as missing_rating
from public.listings;
```

---

## STEP 7 — Backfill (WRITE — data)

**File:** `supabase/0006_backfill_listings.sql` — 147 statements, 225 KB.
Generated from the same mappers the panel uses, by
`scripts/generate-backfill-sql.ts`. Paste it whole; it opens with `begin;` and
ends with `commit;`.

*(Equivalent alternative: Dashboard → “Fill added columns”. Same logic, same
result — use whichever you prefer, not both.)*

- **Changes:** sets the columns 0004/0005 added. The original 16 —  title,
  phone, description, address, `image_url`, status, `display_order` — are never
  named in any statement, so everything you have edited in the admin panel
  survives untouched.
- **Rows affected:** **147 on the first run, 0 on every run after it.**
- **Why safe:** each statement matches one row on `(section, title)` — the
  importer's dedupe key, verified unique across all 147 — *and* on
  `slug is null`. Nothing else writes `slug`, and it is null on every row until
  this file runs, so it marks a row as "not yet backfilled". A second run
  matches nothing. That also makes the file safe to resume if it is interrupted,
  and means an admin edit made afterwards can never be reverted by re-running.
- **Reversible:** yes. The whole file is one transaction, so a failure rolls
  back to the pre-backfill state. After committing, the added columns can be
  cleared back to null; the original sixteen were never touched.

### Why the `slug is null` guard rather than `coalesce`

A `coalesce(column, value)` form would look safer and would be wrong here. Nine
of the columns 0004 adds are declared `not null default` — `verified`,
`featured`, `coords_approx`, `review_count`, `photo_count`, `always_open`,
`furnished`, `available_24`, `emergency_24`. The moment the migration lands they
hold `false` or `0` on all 147 rows, never null, so `coalesce` would keep the
default permanently: 40 verified badges, 30 featured and 28 "open 24 hours"
would silently never appear.

Guarding on `slug is null` instead means each statement runs against a row known
to be untouched, so it can assign directly — complete data on the first pass,
and no clobbering on any pass after it.

---

## STEP 8 — Post-backfill verification (READ ONLY)

```sql
-- 8a. Expect 147 / 147 / 0.
select count(*)                             as total,
       count(slug)                          as with_slug,
       count(*) filter (where slug is null) as still_missing_slug
from public.listings;

-- 8b. Slug uniqueness actually held. Expect zero rows.
select slug, count(*) from public.listings
where slug is not null group by slug having count(*) > 1;

-- 8c. Bilingual copy landed. Expect 147 / 147.
select count(title_en) as english, count(title_bn) as bengali
from public.listings;

-- 8d. Section-typed data landed where it belongs.
select section,
       count(*)                          as rows,
       count(lat)                        as with_coords,
       count(rent)                       as with_rent,
       count(priority)                   as with_priority
from public.listings group by section order by section;
-- rentals: with_rent = 18. emergency: with_priority = 14.

-- 8e. Doctor/facility links resolve to real slugs. Expect zero rows.
select l.id, l.title, x.ref
from public.listings l
cross join lateral jsonb_array_elements_text(coalesce(l.facility_ids,'[]'::jsonb)) as x(ref)
where not exists (select 1 from public.listings f where f.slug = x.ref);

-- 8f. The original 16 columns were not disturbed. Expect 147 and your
--     hand-edited values intact.
select count(*) from public.listings;
select id, title, phone, address from public.listings where id = 3;
```

---

## STEP 9 — Runtime verification (in the app, no SQL)

Reload the site, then confirm:

| Check | Before | Expect after |
|---|---|---|
| `databaseDriven` | `false` | **`true`** |
| `searchCorpus` | 74 | **115** |
| `healthcareRecords` | 41 | **75** (62 facilities, 13 doctors) |
| `emergency` | 14 | **14** |
| `rentals` | 18 | **18** |
| Duplicate blocks on pages | present | **gone** — `ListingsSection` stands down |

Tell me when this is done and I will run the full verification sweep.

---

## STEP 10 — The one data fix (WRITE — one row)

Only after the above. **This is yours to run; it is a real emergency number.**

```sql
-- Bangladesh's national emergency number is 999. 911 is the North American
-- number and reaches nothing from a Bangladeshi phone.
-- Changes: 1 row (id 96). Reversible: set it back to '911'.
-- Verify first:
select id, title, phone from public.listings where id = 96;

update public.listings
set phone = '999', updated_at = now()
where id = 96 and phone = '911';

-- Expect one row, phone = '999'.
select id, title, phone from public.listings where id = 96;
```

The `and phone = '911'` guard means re-running it does nothing once corrected.

Also worth checking against the publishing authority: id 98
`Fire Service & Civil Defence` is stored as `102`.

---

## STEP 11 — Migration 0007 (WRITE — schema only)

**Independent of everything above.** It can be run first, last, or on its own,
and the app works before and after either way — see the note at the end of this
section. `services` and `maps_url` are what the admin form's Services editor and
Google Maps link field write to.

**File:** `supabase/migrations/0007_listing_services_and_map.sql`. In full it is
two statements:

```sql
alter table public.listings add column if not exists services jsonb;
alter table public.listings add column if not exists maps_url text;
```

- **Changes:** adds two nullable columns. No existing column is read or written,
  so every row keeps every value it has.
- **Rows affected:** 0. Both columns are null on all 147 rows until somebody
  edits a listing.
- **Why safe:** additive and `if not exists`, so it is safe to run more than
  once. `services` is already declared in 0004 — restating it here is what makes
  this file work on a project that has not applied 0004, and the type is
  identical so the two cannot disagree.
- **Reversible:** yes — `alter table public.listings drop column maps_url;` and
  the same for `services`. Dropping `services` after 0004 has been applied would
  also drop the imported service lists, so drop only what this file added.

### Verify

```sql
-- Expect two rows: services | jsonb, maps_url | text.
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'listings'
  and column_name in ('services', 'maps_url')
order by column_name;
```

### The app does not require this migration

`src/lib/listing-columns.ts` asks the database once whether the two columns
exist and widens its select only if they do. Writes are stripped the same way,
because Postgres rejects an INSERT naming a column that is not there — without
that, an admin could not save *any* listing on a project missing 0007, not just
one that filled in the new fields.

That matters because every listing read names its columns explicitly, so one
missing column fails the whole query rather than degrading a single field: the
directory, the admin table and every section that reads them would go to their
error state together. Asking first is what makes "deploy then migrate" and
"migrate then deploy" equivalent. Until it is applied, the console says so once
per session and the two fields stay hidden.

---

## What changes in the app, and what does not

**No code change is required for the cutover.** The read layer already probes
the schema (`hasRichSchema` in `src/lib/api.ts`) and switches to Postgres the
moment the columns exist and rows are populated. The bundled dataset stays in
the repo as importer source and as the fallback for a fresh clone with no
backend — it stops being the runtime authority automatically.

The one exception, by design: `loadCoverage()` still serves the homepage
category chips from `src/data/coverage.ts`. Those are the app's own category
vocabulary — `CATEGORY_MAP` supplies each chip's name, emoji and icon, so a
chip only renders if this build knows the id. There is nothing there for an
admin to edit that is not already a code-level category.

## Two consequences to expect

1. **Healthcare grows from 41 to 75.** The extra 34 are the healthcare-group
   records from `businesses.ts` — fictional hospitals and clinics with
   placeholder numbers. 6 of them carry `category: 'doctor'`, which is why the
   doctor count goes 7 → 13. This is the data overlap created by importing all
   147, not a mapping fault; deleting those 34 from the admin panel is the fix
   if you want healthcare to hold only researched records.

2. **Search grows from 74 to 115.** Both the search corpus and the healthcare
   directory now read the same rows, so a hospital is one canonical listing
   surfaced in two places rather than two unrelated records. That is the
   intended “same organisation = same listing” behaviour.

Of the 115, **79 will have a working Directions button**. The other 36 have
neither surveyed coordinates nor a usable street address, and correctly render
no button rather than a generic destination.
