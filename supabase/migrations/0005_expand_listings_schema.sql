-- =============================================================================
-- 0005 — the last three columns the application needs
--
-- STATUS: NOT APPLIED. Additive only. Safe to run more than once.
--
-- READ THIS BEFORE ADDING TO IT
--
-- This migration is deliberately three columns long. The brief it answers
-- listed roughly thirty fields as "missing from production" — Bengali copy,
-- slug, coordinates, rating, opening hours, rental metadata, emergency
-- metadata, doctor metadata, provenance. Every one of those is already
-- declared in 0004_listings_full_schema.sql.
--
-- They appear missing because 0004 has never been applied to the project, not
-- because it does not define them. Restating them here would create a second
-- declaration of the same thirty columns: harmless the first time thanks to
-- IF NOT EXISTS, and a standing invitation for the two files to disagree about
-- a type or a default. So this file adds only what no earlier migration
-- declares, and 0004 remains the place those thirty are defined.
--
-- ORDER OF APPLICATION
--
--   0004 first, then 0005. Applying 0005 alone leaves the directory without
--   slug, coordinates, hours and the rest, and the read layer will keep
--   serving the bundled dataset — see `hasRichSchema` in src/lib/api.ts.
--
-- WHAT IS DELIBERATELY NOT HERE
--
--   verified / verification    Both already exist in 0004 and mean different
--                              things: `verified` is the boolean badge,
--                              `verification` is the date-checked string that
--                              accompanies `source`. Not duplicates.
--   phone                      One column, already present since the table was
--                              created. `appointment_phone` and
--                              `emergency_phone` (0004) are separate published
--                              lines, not alternative spellings of it.
--   featured                   A boolean on this table (0004). There is no
--                              separate featured table and must not be one.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Classification
--
-- `category` already narrows a listing to 'hospital', 'pharmacy', 'plumber'
-- and so on. `subcategory` is the level below that the admin form asks for and
-- nothing in the schema could hold: 'diagnostic imaging' under 'diagnostic',
-- '24-hour' under 'pharmacy', 'bachelor' under 'apartment'.
--
-- Text rather than an enum, matching how `section` and `category` are already
-- stored: the vocabulary lives in src/data/categories.ts, where it can change
-- without a migration.
-- ---------------------------------------------------------------------------

alter table public.listings add column if not exists subcategory text;

-- ---------------------------------------------------------------------------
-- Contact
--
-- A second general line. Distinct from `appointment_phone` and
-- `emergency_phone`, which are healthcare-specific published numbers — this is
-- the "or call the other number" a shop or a plumber has, and it applies to
-- every section.
--
-- Stored as text, like `phone`, because the canonical form is decided in
-- application code (src/lib/phone.ts) and a listing typed by hand in the
-- Supabase dashboard must not be rejected by the column.
-- ---------------------------------------------------------------------------

alter table public.listings add column if not exists alt_phone text;

-- ---------------------------------------------------------------------------
-- Media
--
-- `image_url` holds the primary image and keeps that job. This is the gallery
-- behind it: an ordered array of objects rather than an array of URLs, so alt
-- text and caption travel with each entry instead of needing parallel columns.
--
--   [{ "url": "https://…", "alt": "Reception", "caption": "…" }, …]
--
-- jsonb rather than text[] for exactly that reason, and because it is queryable
-- if a later screen needs to be.
-- ---------------------------------------------------------------------------

alter table public.listings add column if not exists gallery jsonb;

-- ---------------------------------------------------------------------------
-- Index
--
-- Mirrors the (section, status, display_order) index 0004 adds. Subcategory is
-- filtered alongside category on the admin directory and on category pages, so
-- the pair is indexed together rather than separately.
-- ---------------------------------------------------------------------------

create index if not exists listings_category_subcategory_idx
  on public.listings (category, subcategory)
  where subcategory is not null;
