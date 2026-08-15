-- =============================================================================
-- 0004 — widen public.listings to hold the whole ELAKAI directory
--
-- STATUS: OPTIONAL. NOT APPLIED. NOT REQUIRED BY THE APPLICATION.
--
-- The app runs entirely against the sixteen columns `public.listings` actually
-- has. The importer maps into those and reports what it cannot carry; nothing
-- in the codebase queries a column added below. Running this changes no
-- behaviour on its own.
--
-- It exists as the answer to one question: what would it take for
-- `public.listings` to hold the directory in full, so the bundled dataset
-- could stop backing the maps, ratings, opening hours, rentals filter and
-- doctor profiles? Applying it is step one of that; the read layer would then
-- need pointing at the new columns.
--
-- WHY THIS EXISTS
--
-- `public.listings` was created with 16 columns, all text apart from the id,
-- the ordering key and the timestamps. That is enough for simple CMS entries
-- and not enough for the directory the public site already renders.
--
-- The bundled dataset is 147 records across five shapes:
--
--     74  businesses
--     18  rentals
--     14  emergency contacts
--     34  healthcare facilities
--      7  doctors
--
-- Moving those into the current 16 columns would silently drop every field the
-- site's features are built on — coordinates (maps), rating and review_count
-- (star ratings), the weekly `hours` schedule (open/closed status), rent and
-- bedrooms and tenant_type (the whole rentals filter), chambers and
-- qualifications (doctor profiles), icon and scope and priority (emergency
-- cards), and `slug`, which every /business/:slug and /healthcare/:slug URL on
-- the site depends on.
--
-- It would also drop half the copy. ELAKAI is bilingual with a live বাং/EN
-- toggle, and the bundled records carry `{ bn, en }` for every name,
-- description and address. One `title` column can hold one of them.
--
-- So this migration ADDS columns to the existing table. It does not create a
-- second listings table, does not touch RLS, and does not drop or rename
-- anything. The existing policies continue to apply unchanged: policies are
-- row-level, so they cover new columns automatically and no new policy is
-- needed or created here.
--
-- Every column is nullable with a sensible default, so existing rows and the
-- current admin form keep working exactly as they do today.
--
-- Safe to run more than once.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Identity and shared attributes
-- ---------------------------------------------------------------------------

-- Detail-page URLs. Unique so two records cannot claim the same page; nullable
-- so a plain CMS entry that has no detail page is still valid.
alter table public.listings add column if not exists slug text;
create unique index if not exists listings_slug_key
  on public.listings (slug) where slug is not null;

alter table public.listings add column if not exists verified boolean not null default false;
alter table public.listings add column if not exists featured boolean not null default false;

-- Seeds the procedural card art used wherever a record has no photograph.
alter table public.listings add column if not exists image_seed integer;

-- ---------------------------------------------------------------------------
-- Bilingual copy
--
-- Kept as `_bn` / `_en` column pairs rather than jsonb because the admin form
-- binds to them individually and Postgres can index them. The existing flat
-- `title` / `description` / `address` columns stay as they are and act as the
-- fallback when only one language was entered.
-- ---------------------------------------------------------------------------

alter table public.listings add column if not exists title_bn text;
alter table public.listings add column if not exists title_en text;
alter table public.listings add column if not exists description_bn text;
alter table public.listings add column if not exists description_en text;
alter table public.listings add column if not exists address_bn text;
alter table public.listings add column if not exists address_en text;
alter table public.listings add column if not exists short_bn text;
alter table public.listings add column if not exists short_en text;

-- ---------------------------------------------------------------------------
-- Place
-- ---------------------------------------------------------------------------

alter table public.listings add column if not exists area_id text;
alter table public.listings add column if not exists lat double precision;
alter table public.listings add column if not exists lng double precision;
-- True when the coordinates are an area centre rather than a surveyed point.
alter table public.listings add column if not exists coords_approx boolean not null default false;

-- ---------------------------------------------------------------------------
-- Business / directory
-- ---------------------------------------------------------------------------

alter table public.listings add column if not exists category_group text;
alter table public.listings add column if not exists website text;
alter table public.listings add column if not exists facebook text;
alter table public.listings add column if not exists rating numeric(2, 1);
alter table public.listings add column if not exists review_count integer not null default 0;
alter table public.listings add column if not exists photo_count integer not null default 0;
-- Seven arrays of open/close pairs, one per weekday.
alter table public.listings add column if not exists hours jsonb;
alter table public.listings add column if not exists always_open boolean not null default false;
alter table public.listings add column if not exists services jsonb;
alter table public.listings add column if not exists reviews jsonb;

-- ---------------------------------------------------------------------------
-- Rentals
-- ---------------------------------------------------------------------------

-- Numeric, not text: the rentals page filters and sorts on these in Postgres.
alter table public.listings add column if not exists rent integer;
alter table public.listings add column if not exists bedrooms integer;
alter table public.listings add column if not exists bathrooms integer;
alter table public.listings add column if not exists size_sqft integer;
alter table public.listings add column if not exists floor integer;
alter table public.listings add column if not exists tenant_type text;
alter table public.listings add column if not exists furnished boolean not null default false;
alter table public.listings add column if not exists available_from date;

-- ---------------------------------------------------------------------------
-- Emergency contacts
-- ---------------------------------------------------------------------------

alter table public.listings add column if not exists icon text;
alter table public.listings add column if not exists scope text;
alter table public.listings add column if not exists tone text;
alter table public.listings add column if not exists available_24 boolean not null default false;
alter table public.listings add column if not exists priority integer;

-- ---------------------------------------------------------------------------
-- Healthcare — facilities and doctors
-- ---------------------------------------------------------------------------

alter table public.listings add column if not exists aliases jsonb;
alter table public.listings add column if not exists appointment_phone text;
alter table public.listings add column if not exists emergency_phone text;
alter table public.listings add column if not exists emergency_24 boolean not null default false;
alter table public.listings add column if not exists tests jsonb;
alter table public.listings add column if not exists departments jsonb;
alter table public.listings add column if not exists specialty_bn text;
alter table public.listings add column if not exists specialty_en text;
alter table public.listings add column if not exists designation_bn text;
alter table public.listings add column if not exists designation_en text;
alter table public.listings add column if not exists qualifications jsonb;
-- Doctor <-> facility links and a doctor's visiting places. Held as jsonb
-- rather than join tables so the whole directory stays in this one table.
alter table public.listings add column if not exists facility_ids jsonb;
alter table public.listings add column if not exists doctor_ids jsonb;
alter table public.listings add column if not exists chambers jsonb;
-- Where the record came from, and when it was last checked against that source.
alter table public.listings add column if not exists verification text;
alter table public.listings add column if not exists source jsonb;

-- ---------------------------------------------------------------------------
-- Indexes for the queries the public site actually issues
-- ---------------------------------------------------------------------------

create index if not exists listings_section_status_order_idx
  on public.listings (section, status, display_order);

create index if not exists listings_category_idx on public.listings (category);
create index if not exists listings_area_idx on public.listings (area_id);
-- The rentals page filters on rent as a range.
create index if not exists listings_rent_idx on public.listings (rent) where rent is not null;
