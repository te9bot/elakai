-- =============================================================================
-- 0014 — verification and promotion flags on public.listings
--
-- WHY THIS EXISTS SEPARATELY FROM 0004
--
-- Migration 0004 is the full directory schema: sixty-odd columns, coordinates,
-- bilingual pairs, weekly hours, rich rental and healthcare fields. It is the
-- right destination, and it is a large change to apply to a live project.
--
-- Two of its columns are needed long before the rest of it: `verified` and
-- `featured`. Without them the public site has no database answer to "is this
-- listing verified?", and the only remaining source is a boolean compiled into
-- the bundle — which is exactly the thing the admin panel is supposed to
-- control. This adds those two, and nothing else.
--
-- Both are declared exactly as 0004 declares them minus its NOT NULL, so
-- applying 0004 afterwards is a no-op for these columns (`add column if not
-- exists`), and applying this after 0004 is likewise a no-op.
--
-- NULL RATHER THAN false BY DEFAULT
--
-- A row written before this migration has no verification decision recorded
-- against it. Defaulting those to `false` would state one — it would mark every
-- imported listing as "checked and not verified" on the day the SQL runs, and
-- silently strip the verification mark from records that carry it in the
-- bundled dataset the site was seeded from.
--
-- NULL means "nobody has said", and the app reads it that way: it falls back to
-- whatever the seeded record claimed and shows no mark for anything else. The
-- moment an administrator touches the switch the value becomes a real boolean
-- and the database is the only thing that decides. See `Listing.verified` in
-- src/lib/listings.ts and `verifiedOf` in src/lib/listings-flat.ts.
--
-- Safe to run more than once.
-- =============================================================================

alter table public.listings add column if not exists verified boolean;
alter table public.listings add column if not exists featured boolean;

comment on column public.listings.verified is
  'Checked against an official source or a phone call. NULL = no decision recorded.';
comment on column public.listings.featured is
  'Promoted to the homepage rails. NULL = no decision recorded.';

-- The public site asks for "verified listings, newest first" and the admin
-- table filters on the same column, so both get an index. Partial: the rows
-- worth finding this way are the true ones, and NULL is the common case.
create index if not exists listings_verified_idx
  on public.listings (verified)
  where verified is true;

create index if not exists listings_featured_idx
  on public.listings (featured)
  where featured is true;

-- No RLS changes. `verified` and `featured` are columns of a table that is
-- already covered by the policies in 0002 and 0008: anonymous visitors read
-- active rows, and only `public.is_admin()` may write. Adding a column does not
-- widen either.
