-- =============================================================================
-- ELAKAI — core schema
--
-- Modelled on the shapes the application already uses (src/data/types.ts and
-- src/data/healthcare-types.ts) rather than on a generic directory schema, so
-- the existing search, filter and profile code keeps working against the same
-- fields it does today.
--
-- Conventions
--   * Every user-facing string is a `_bn` / `_en` pair. The app resolves these
--     through `L()` in src/lib/i18n.tsx; a record with only one language filled
--     in is normal and the UI stays quiet about the missing side.
--   * `status` drives public visibility. RLS (0002) is what enforces it — the
--     anon role can only ever see 'published'.
--   * Provenance is not optional on healthcare records. A directory that cannot
--     say where a number came from should not be presenting it as fact.
-- =============================================================================

create extension if not exists pg_trgm;      -- fuzzy name matching, incl. Bengali
create extension if not exists "uuid-ossp";

-- -----------------------------------------------------------------------------
-- Enumerations
-- -----------------------------------------------------------------------------

create type category_group      as enum ('emergency','healthcare','services','rentals','utilities');
create type record_status       as enum ('draft','published','archived');
create type verification_level  as enum ('unverified','partial','verified');
create type source_kind         as enum ('official','dghs','facebook','directory','placeholder','other');
create type tenant_type         as enum ('family','bachelor','any');
create type emergency_scope     as enum ('national','local');
create type emergency_tone      as enum ('danger','primary','neutral');
-- One catalogue serves clinical services, departments and diagnostic tests:
-- they are the same shape and differ only in how a profile groups them.
create type service_kind        as enum ('service','department','test');
create type admin_role          as enum ('owner','editor','viewer');
create type media_owner_kind    as enum ('facility','doctor','rental','business','service','homepage');

-- -----------------------------------------------------------------------------
-- Admin identity
--
-- Supabase Auth owns credentials; this table only carries role and status.
-- No password material is ever stored here.
-- -----------------------------------------------------------------------------

create table admin_users (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text        not null unique,
  display_name  text,
  role          admin_role  not null default 'editor',
  active        boolean     not null default true,
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);

comment on table admin_users is
  'Admin profile keyed to auth.users. Credentials live in Supabase Auth, never here.';

-- Used by every RLS policy, so it must not itself be subject to RLS recursion.
create or replace function is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from admin_users
    where id = auth.uid() and active
  );
$$;

-- -----------------------------------------------------------------------------
-- Reference data
-- -----------------------------------------------------------------------------

create table areas (
  id         text primary key,            -- 'kushtia-sadar', ...
  name_bn    text not null,
  name_en    text not null,
  upazila_en text,
  district   text not null default 'Kushtia',
  lat        double precision not null,
  lng        double precision not null,
  sort_order integer not null default 0
);

create table categories (
  id         text primary key,            -- 'ambulance', 'hospital', ...
  "group"    category_group not null,
  name_bn    text not null,
  name_en    text not null,
  emoji      text,
  icon       text not null,               -- resolved via src/components/icon.tsx
  keywords   text[] not null default '{}',
  active     boolean not null default true,
  sort_order integer not null default 0
);

comment on column categories.keywords is
  'Extra bn/en search terms. Feeds the existing fuzzy matcher in src/lib/search.ts.';

-- Reusable catalogue (§28). Facilities reference these instead of repeating
-- "Ultrasound" as free text on every record.
create table services (
  id         uuid primary key default uuid_generate_v4(),
  kind       service_kind not null default 'service',
  name_bn    text not null,
  name_en    text not null,
  category   text references categories(id) on delete set null,
  description_bn text,
  description_en text,
  icon       text,
  active     boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (kind, name_en)
);

-- -----------------------------------------------------------------------------
-- Healthcare facilities
-- -----------------------------------------------------------------------------

create table facilities (
  id            uuid primary key default uuid_generate_v4(),
  slug          text not null unique,
  category      text not null references categories(id),
  name_bn       text not null,
  name_en       text not null,
  aliases       text[] not null default '{}',
  description_bn text,
  description_en text,

  address_bn    text,
  address_en    text,
  area_id       text references areas(id),
  lat           double precision,
  lng           double precision,
  -- true when lat/lng fall back to the area centre rather than a real fix
  coords_approx boolean not null default false,

  phone             text,
  appointment_phone text,
  emergency_phone   text,
  email             text,
  website           text,
  facebook          text,
  map_url           text,

  hours         jsonb,                    -- HoursWindow[][] as used by the app
  always_open   boolean not null default false,
  emergency_24  boolean not null default false,

  rating        numeric(2,1) check (rating is null or (rating >= 0 and rating <= 5)),
  review_count  integer,

  verification  verification_level not null default 'unverified',
  source_kind   source_kind not null default 'placeholder',
  source_url    text,
  source_note_bn text,
  source_note_en text,
  source_verified_at date,

  status        record_status not null default 'draft',
  featured      boolean not null default false,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  published_at  timestamptz,
  created_by    uuid references admin_users(id) on delete set null,
  updated_by    uuid references admin_users(id) on delete set null
);

comment on column facilities.rating is
  'Only ever set when a real source published one. Never synthesised.';

create table facility_services (
  facility_id uuid not null references facilities(id) on delete cascade,
  service_id  uuid not null references services(id)   on delete cascade,
  sort_order  integer not null default 0,
  primary key (facility_id, service_id)
);

-- -----------------------------------------------------------------------------
-- Doctors and chambers
-- -----------------------------------------------------------------------------

create table doctors (
  id             uuid primary key default uuid_generate_v4(),
  slug           text not null unique,
  name_bn        text not null,
  name_en        text not null,
  aliases        text[] not null default '{}',
  qualifications text[] not null default '{}',   -- 'MBBS', 'FCPS (Medicine)'
  specialty_bn   text,
  specialty_en   text,
  sub_specialty_bn text,
  sub_specialty_en text,
  designation_bn text,
  designation_en text,
  description_bn text,
  description_en text,

  phone          text,
  appointment_phone text,
  email          text,
  website        text,
  facebook       text,
  profile_image_id uuid,                 -- FK added after media table exists

  area_id        text references areas(id),

  verification   verification_level not null default 'unverified',
  source_kind    source_kind not null default 'placeholder',
  source_url     text,
  source_note_bn text,
  source_note_en text,
  source_verified_at date,

  status         record_status not null default 'draft',
  featured       boolean not null default false,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  published_at   timestamptz,
  created_by     uuid references admin_users(id) on delete set null,
  updated_by     uuid references admin_users(id) on delete set null
);

-- A doctor sits at several chambers, so this is a relation, not an address
-- column on `doctors` (§27).
create table chambers (
  id                uuid primary key default uuid_generate_v4(),
  doctor_id         uuid not null references doctors(id) on delete cascade,
  facility_id       uuid references facilities(id) on delete set null,
  place_bn          text,
  place_en          text,
  address_bn        text,
  address_en        text,
  area_id           text references areas(id),
  -- Free text: published chamber hours rarely fit a weekly grid
  -- ("Sat–Thu, after Asr"), and forcing them into one loses information.
  visiting_days_bn  text,
  visiting_days_en  text,
  visiting_hours_bn text,
  visiting_hours_en text,
  appointment_phone text,
  consultation_fee  integer,
  notes_bn          text,
  notes_en          text,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Affiliation, separate from chambers: a doctor can be attached to a hospital
-- without holding a chamber there.
create table doctor_facilities (
  doctor_id   uuid not null references doctors(id)    on delete cascade,
  facility_id uuid not null references facilities(id) on delete cascade,
  primary key (doctor_id, facility_id)
);

-- -----------------------------------------------------------------------------
-- Local services directory (the existing `Business` record)
-- -----------------------------------------------------------------------------

create table businesses (
  id            uuid primary key default uuid_generate_v4(),
  slug          text not null unique,
  category      text not null references categories(id),
  "group"       category_group not null,
  name_bn       text not null,
  name_en       text not null,
  description_bn text,
  description_en text,

  phone         text,
  website       text,
  email         text,
  facebook      text,

  address_bn    text,
  address_en    text,
  area_id       text references areas(id),
  lat           double precision,
  lng           double precision,

  hours         jsonb,
  always_open   boolean not null default false,

  rating        numeric(2,1) check (rating is null or (rating >= 0 and rating <= 5)),
  review_count  integer not null default 0,
  verified      boolean not null default false,

  -- Seeds the generated placeholder artwork (src/components/listing-art.tsx)
  -- so a listing without photographs still looks like itself between visits.
  -- Superseded per-record as soon as real images are uploaded.
  image_seed    integer not null default 0,
  photo_count   integer not null default 0,

  status        record_status not null default 'draft',
  featured      boolean not null default false,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  published_at  timestamptz,
  created_by    uuid references admin_users(id) on delete set null,
  updated_by    uuid references admin_users(id) on delete set null
);

create table business_services (
  business_id uuid not null references businesses(id) on delete cascade,
  service_id  uuid not null references services(id)   on delete cascade,
  sort_order  integer not null default 0,
  primary key (business_id, service_id)
);

create table reviews (
  id          uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade,
  facility_id uuid references facilities(id) on delete cascade,
  author_bn   text,
  author_en   text,
  rating      numeric(2,1) not null check (rating >= 0 and rating <= 5),
  comment_bn  text,
  comment_en  text,
  reviewed_on date,
  status      record_status not null default 'published',
  created_at  timestamptz not null default now(),
  -- Belongs to exactly one parent.
  constraint reviews_one_parent check (num_nonnulls(business_id, facility_id) = 1)
);

-- -----------------------------------------------------------------------------
-- Rentals
-- -----------------------------------------------------------------------------

create table rentals (
  id            uuid primary key default uuid_generate_v4(),
  slug          text not null unique,
  category      text not null references categories(id),
  title_bn      text not null,
  title_en      text not null,
  description_bn text,
  description_en text,

  rent          integer not null,          -- monthly, BDT
  bedrooms      integer not null default 0,
  bathrooms     integer not null default 0,
  size_sqft     integer,
  floor         integer,
  tenant_type   tenant_type not null default 'any',
  furnished     boolean not null default false,

  address_bn    text,
  address_en    text,
  area_id       text references areas(id),
  lat           double precision,
  lng           double precision,

  owner_name    text,
  owner_phone   text,
  available_from date,

  image_seed    integer not null default 0,

  verified      boolean not null default false,
  status        record_status not null default 'draft',
  featured      boolean not null default false,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  published_at  timestamptz,
  created_by    uuid references admin_users(id) on delete set null,
  updated_by    uuid references admin_users(id) on delete set null
);

-- -----------------------------------------------------------------------------
-- Emergency contacts (§31)
-- -----------------------------------------------------------------------------

create table emergency_contacts (
  id             text primary key,          -- stable slug, referenced by the hero
  name_bn        text not null,
  name_en        text not null,
  short_bn       text,
  short_en       text,
  description_bn text,
  description_en text,
  phone          text not null,
  icon           text not null,
  scope          emergency_scope not null default 'local',
  tone           emergency_tone  not null default 'danger',
  available_24   boolean not null default true,
  address_bn     text,
  address_en     text,
  lat            double precision,
  lng            double precision,
  priority       integer not null default 0,
  status         record_status not null default 'draft',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references admin_users(id) on delete set null,
  updated_by     uuid references admin_users(id) on delete set null
);

-- -----------------------------------------------------------------------------
-- Service Category Bar (§32) — the hero marquee, admin-controlled
-- -----------------------------------------------------------------------------

create table category_bar_items (
  id          uuid primary key default uuid_generate_v4(),
  category_id text not null references categories(id) on delete cascade,
  label_bn    text,                      -- overrides the category name when set
  label_en    text,
  -- Where the chip goes. Defaults to the category search route when null.
  target_path text,
  active      boolean not null default true,
  sort_order  integer not null default 0,
  updated_at  timestamptz not null default now(),
  unique (category_id)
);

comment on table category_bar_items is
  'Drives the hero marquee. Reordering here reorders the public strip; the '
  'marquee duplicates whatever set this returns, so the loop stays seamless '
  'regardless of how many items are active.';

-- -----------------------------------------------------------------------------
-- Media (§34) — references only, never blobs
-- -----------------------------------------------------------------------------

create table media (
  id           uuid primary key default uuid_generate_v4(),
  bucket       text not null default 'elakai-media',
  path         text not null,             -- object key inside the bucket
  owner_kind   media_owner_kind not null,
  owner_id     uuid,                      -- null for homepage/global assets
  alt_bn       text,
  alt_en       text,
  mime_type    text not null,
  byte_size    integer not null,
  width        integer,
  height       integer,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  created_by   uuid references admin_users(id) on delete set null,
  unique (bucket, path)
);

alter table doctors
  add constraint doctors_profile_image_fk
  foreign key (profile_image_id) references media(id) on delete set null;

-- -----------------------------------------------------------------------------
-- Audit trail (§47)
-- -----------------------------------------------------------------------------

create table audit_log (
  id         bigserial primary key,
  actor_id   uuid references admin_users(id) on delete set null,
  actor_email text,
  action     text not null,               -- 'create' | 'update' | 'publish' | ...
  entity     text not null,               -- table name
  entity_id  text not null,
  summary    text,                        -- 'Phone changed'
  changes    jsonb,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- Indexes (§64)
--
-- Chosen for the queries the app actually issues: filter by category + area +
-- status, order by featured/updated, and fuzzy-match a name in either script.
-- =============================================================================

create index facilities_status_idx        on facilities (status) where status = 'published';
create index facilities_category_idx      on facilities (category, status);
create index facilities_area_idx          on facilities (area_id, status);
create index facilities_featured_idx      on facilities (featured, status) where featured;
create index facilities_updated_idx       on facilities (updated_at desc);
create index facilities_name_en_trgm      on facilities using gin (name_en gin_trgm_ops);
create index facilities_name_bn_trgm      on facilities using gin (name_bn gin_trgm_ops);
create index facilities_aliases_idx       on facilities using gin (aliases);

create index doctors_status_idx           on doctors (status) where status = 'published';
create index doctors_specialty_en_idx     on doctors (specialty_en);
create index doctors_area_idx             on doctors (area_id, status);
create index doctors_featured_idx         on doctors (featured, status) where featured;
create index doctors_name_en_trgm         on doctors using gin (name_en gin_trgm_ops);
create index doctors_name_bn_trgm         on doctors using gin (name_bn gin_trgm_ops);

create index chambers_doctor_idx          on chambers (doctor_id);
create index chambers_facility_idx        on chambers (facility_id);

create index businesses_status_idx        on businesses (status) where status = 'published';
create index businesses_category_idx      on businesses (category, status);
create index businesses_area_idx          on businesses (area_id, status);
create index businesses_featured_idx      on businesses (featured, status) where featured;
create index businesses_updated_idx       on businesses (updated_at desc);
create index businesses_name_en_trgm      on businesses using gin (name_en gin_trgm_ops);
create index businesses_name_bn_trgm      on businesses using gin (name_bn gin_trgm_ops);

create index rentals_status_idx           on rentals (status) where status = 'published';
create index rentals_category_idx         on rentals (category, status);
create index rentals_area_idx             on rentals (area_id, status);
create index rentals_rent_idx             on rentals (rent);
create index rentals_featured_idx         on rentals (featured, status) where featured;
create index rentals_updated_idx          on rentals (updated_at desc);

create index emergency_status_idx         on emergency_contacts (status, priority);
create index media_owner_idx              on media (owner_kind, owner_id, sort_order);
create index audit_log_entity_idx         on audit_log (entity, entity_id, created_at desc);
create index services_kind_idx            on services (kind, active);

-- =============================================================================
-- updated_at maintenance
-- =============================================================================

-- Two functions rather than one that introspects the row: `chambers` and
-- `category_bar_items` have no `status`, and `emergency_contacts` has no
-- `published_at`. Attaching the right trigger per table keeps the failure mode
-- at migration time instead of on some future UPDATE.
create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Stamps publication the first time a record actually goes public, and clears
-- it if the record is pulled back, so `published_at` always means "public since".
create or replace function touch_updated_at_and_published()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if new.status = 'published' and old.status is distinct from 'published' then
    new.published_at := coalesce(new.published_at, now());
  elsif new.status <> 'published' then
    new.published_at := null;
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['chambers','category_bar_items','emergency_contacts']
  loop
    execute format(
      'create trigger %I_touch before update on %I
         for each row execute function touch_updated_at()', t, t);
  end loop;

  foreach t in array array['facilities','doctors','businesses','rentals']
  loop
    execute format(
      'create trigger %I_touch before update on %I
         for each row execute function touch_updated_at_and_published()', t, t);
  end loop;
end;
$$;
