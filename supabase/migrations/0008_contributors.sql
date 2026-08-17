-- =============================================================================
-- 0008 — the contributor system
--
-- STATUS: NOT APPLIED. Additive only. Safe to run more than once.
--
-- WHAT THIS ADDS
--
--   profiles              one row per auth user: role, points, display name
--   submissions           contributor-entered information awaiting review
--   points_transactions   the ledger the points balance is derived from
--   audit_log             who did what to which record, and when
--
--   approve_submission()  the only way a submission becomes public
--   reject_submission()   the only way a submission is refused
--
-- WHAT THIS DOES NOT DO
--
-- It does not touch the 147 rows in `public.listings`, does not drop or rename
-- any column, and does not require 0004/0005/0007. It reads `public.listings`
-- only to discover the type of its primary key, and writes to it only from
-- inside approve_submission(), one row at a time, on an explicit admin action.
--
-- WHY EVERYTHING IMPORTANT IS A FUNCTION
--
-- This project is a static SPA talking to PostgREST. There is no server tier
-- that could be trusted to check "is this person an admin" or "has this
-- submission already been paid for". So the two operations that must not be
-- forgeable — publishing a submission, and awarding points — are SECURITY
-- DEFINER functions that do their own authorization, and the tables underneath
-- them are closed to direct writes that would bypass them:
--
--   * `profiles.role` and `profiles.points` are removed from the UPDATE grant
--     held by `authenticated`, so no policy, no forged request and no crafted
--     PATCH can change either. A contributor can edit their own display name
--     and nothing else on that row.
--
--   * `submissions.status` cannot be changed by any direct UPDATE, admin
--     included. A trigger rejects it unless the transaction is running inside
--     one of the two moderation functions, which announce themselves with a
--     transaction-local setting.
--
--   * `points_transactions` has no UPDATE and no DELETE policy at all, and a
--     partial unique index makes a second approval reward for the same
--     submission a constraint violation rather than a second fifty points.
--
-- ORDER OF APPLICATION
--
-- Independent of 0004/0005/0007. Run it whenever; run those whenever. The
-- application asks the database which of these objects exist before using them
-- (src/lib/contrib-schema.ts), exactly as it already does for 0007, so the site
-- works before and after and no second deploy is needed.
-- =============================================================================

-- gen_random_uuid(). Present by default on Supabase; asserted so this file
-- stands alone on a project where it is not.
create extension if not exists pgcrypto;


-- =============================================================================
-- 1. PROFILES
--
-- Supabase Auth owns credentials. This table owns role and points, and nothing
-- else about a person. It is deliberately thin: everything here is either
-- needed to authorize an action or needed to render the contributor dashboard.
-- =============================================================================

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,

  -- The whole of the authorization model. Text with a CHECK rather than an enum
  -- so adding a third role later is an ALTER on the constraint, not a type
  -- migration with a rewrite behind it.
  --
  -- DEFAULT 'user' is load-bearing: handle_new_user() below never names this
  -- column, so a registration cannot carry a role in with it no matter what the
  -- client puts in the signup metadata.
  role        text not null default 'user' check (role in ('user', 'admin')),

  -- A cache of sum(points_transactions.points), maintained by trigger. The
  -- ledger is the truth; this exists so the dashboard does not aggregate the
  -- whole table on every load. Never written directly — see the grant below.
  points      integer not null default 0,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Role and points for an auth user. Credentials live in auth.users, never here.';
comment on column public.profiles.role is
  'user | admin. Cannot be set at registration and cannot be changed by the '
  'account holder: authenticated has no UPDATE grant on this column.';
comment on column public.profiles.points is
  'Derived cache of the points_transactions ledger, maintained by trigger.';

-- -----------------------------------------------------------------------------
-- Registration
--
-- A profile is created by the database when the auth user is created, not by
-- the client afterwards. Two reasons: a client that closes the tab between the
-- two would leave an account with no profile and no way to make one, and a
-- client-side insert would need an INSERT policy on this table, which is one
-- more surface on which somebody could try to name a role.
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- `role` and `points` are deliberately absent from this list. They take their
  -- column defaults ('user', 0), so the signup payload cannot influence either.
  --
  -- The name is looked for under four keys because four sources write it under
  -- different ones: this app's own signup form sends `full_name`, Google sends
  -- `full_name` and `name`, Facebook sends `name`, and a user created by hand in
  -- the dashboard has none of them. The first non-empty one wins; a profile with
  -- no name is valid and the dashboard falls back to the email address.
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
      nullif(trim(coalesce(new.raw_user_meta_data ->> 'name', '')), ''),
      nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), ''),
      nullif(trim(coalesce(new.raw_user_meta_data ->> 'preferred_username', '')), '')
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: anyone who registered before this migration ran, including the
-- existing administrator. Same rule — role takes its default.
insert into public.profiles (id, email)
select u.id, u.email from auth.users u
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- The administrator
--
-- This is the id src/lib/config.ts has been comparing against in the browser.
-- Promoting it here is what moves that check from the client, where it decides
-- which screen renders, to Postgres, where it decides what may actually happen.
--
-- To add another administrator later, run this same UPDATE with their id. There
-- is deliberately no in-app screen that grants this: an app that can promote an
-- account is an app whose compromise is a full compromise.
-- -----------------------------------------------------------------------------

update public.profiles
   set role = 'admin', updated_at = now()
 where id = 'd97b7d76-720c-4c6f-94f4-647b33f39ef4'
   and role <> 'admin';

-- -----------------------------------------------------------------------------
-- The authorization predicate
--
-- SECURITY DEFINER so that policies on `profiles` itself can call it without
-- recursing into the policy that is currently being evaluated.
-- -----------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

comment on function public.is_admin() is
  'True when the caller holds an admin profile. The one authorization predicate '
  'in this schema; every admin policy and both moderation functions call it.';


-- =============================================================================
-- 2. SUBMISSIONS
--
-- Contributor-entered information. Shaped to mirror the editable columns of
-- `public.listings` rather than to invent a parallel vocabulary, so approving
-- one is a copy rather than a translation, and so an admin reviewing a
-- submission is looking at the same fields they would edit on a live listing.
-- =============================================================================

create table if not exists public.submissions (
  id            uuid primary key default gen_random_uuid(),

  -- References `profiles`, not `auth.users`, even though profiles.id IS a
  -- reference to auth.users and the two are always the same value.
  --
  -- The reason is PostgREST. An admin reviewing a queue needs the contributor's
  -- name and points alongside each submission, and PostgREST can only embed
  -- across a foreign key it can see. It cannot see into the `auth` schema, so a
  -- reference to auth.users leaves `submissions?select=*,profiles(*)` with no
  -- path to follow, and the review screen would need a second round trip and a
  -- client-side join to show who submitted what.
  --
  -- Cascade behaviour is unchanged: profiles cascades from auth.users, so
  -- deleting the auth user still removes the submissions.
  submitted_by  uuid not null references public.profiles(id) on delete cascade,

  -- Where it would appear. Same vocabulary as listings.section, unconstrained
  -- here for the same reason it is unconstrained there: the list lives in
  -- src/data/categories.ts, where it changes without a migration.
  section       text not null,
  category      text,
  subcategory   text,

  -- The payload. One column per editable listing column.
  title         text not null,
  description   text,
  phone         text,
  alt_phone     text,
  email         text,
  address       text,
  location      text,
  maps_url      text,
  price         text,
  availability  text,
  services      jsonb,
  image_url     text,

  -- Moderation.
  status        text not null default 'pending'
                  check (status in ('pending', 'approved', 'rejected')),

  submitted_at  timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  reviewed_by   uuid references public.profiles(id) on delete set null,
  reviewed_at   timestamptz,
  approved_at   timestamptz,

  rejection_reason text,   -- one of the fixed reasons offered in the admin UI
  rejection_detail text,   -- the admin's own words, shown to the contributor

  -- Set by the duplicate check below. Advisory only: it flags a submission for
  -- a closer look and never refuses one. A real second branch of a real
  -- pharmacy is not spam, and an automatic rejection would be wrong more often
  -- than a human glance is.
  duplicate_hint text
);

comment on table public.submissions is
  'Contributor-entered information awaiting review. Never public: only '
  'approve_submission() copies a row from here into public.listings.';

-- The two references into `public.listings`.
--
-- Added in a DO block that reads the live type of `listings.id` rather than
-- assuming it. This project's table was created by hand, so its key could be
-- integer or bigint, and a foreign key declared against the wrong one fails the
-- whole migration for a reason that reads as unrelated.
do $$
declare
  key_type text;
begin
  select format_type(a.atttypid, a.atttypmod)
    into key_type
    from pg_attribute a
   where a.attrelid = 'public.listings'::regclass
     and a.attname  = 'id'
     and a.attnum   > 0;

  if key_type is null then
    raise exception 'public.listings has no id column — is this the right project?';
  end if;

  -- The listing this submission proposes a change to. Null on a new
  -- submission; set when a contributor edits something already published.
  if not exists (
    select 1 from pg_attribute
     where attrelid = 'public.submissions'::regclass
       and attname = 'target_listing_id' and attnum > 0 and not attisdropped
  ) then
    execute format(
      'alter table public.submissions add column target_listing_id %s '
      'references public.listings(id) on delete set null', key_type);
  end if;

  -- The listing this submission became, once approved. Null until then. This
  -- is what makes the contributor''s "view it live" link possible, and what
  -- lets a later edit find the row it is editing.
  if not exists (
    select 1 from pg_attribute
     where attrelid = 'public.submissions'::regclass
       and attname = 'published_listing_id' and attnum > 0 and not attisdropped
  ) then
    execute format(
      'alter table public.submissions add column published_listing_id %s '
      'references public.listings(id) on delete set null', key_type);
  end if;
end;
$$;

create index if not exists submissions_status_idx
  on public.submissions (status, submitted_at desc);
create index if not exists submissions_contributor_idx
  on public.submissions (submitted_by, submitted_at desc);
create index if not exists submissions_pending_idx
  on public.submissions (submitted_at desc) where status = 'pending';

-- -----------------------------------------------------------------------------
-- Status is not an ordinary column
--
-- Everything about a submission except its status can be edited directly: a
-- contributor fixes a typo in their own pending row, an admin corrects a phone
-- number before approving. But a status change means "publish this" or "refuse
-- this", and those carry a listing write and a points award with them.
--
-- So a direct UPDATE that moves `status` is refused, for everyone, including an
-- admin. The two moderation functions set a transaction-local flag before they
-- do it, which is the only way past this trigger and cannot be set from
-- PostgREST — `set_config(..., true)` is scoped to the transaction, and a
-- PostgREST request cannot call it without also calling a function that does.
-- -----------------------------------------------------------------------------

create or replace function public.guard_submission_status()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status
     and coalesce(current_setting('elakai.moderating', true), '') <> 'on' then
    raise exception
      'submission status is changed by approve_submission() or reject_submission(), not by UPDATE'
      using errcode = 'check_violation';
  end if;

  -- An approved submission is a published record. Editing it in place would
  -- change what the public sees with no review, which is the whole thing §35 of
  -- the brief exists to prevent. A contributor who wants to change it submits
  -- a new row with target_listing_id set.
  if old.status = 'approved'
     and coalesce(current_setting('elakai.moderating', true), '') <> 'on' then
    raise exception 'an approved submission is a record of what was approved and cannot be edited'
      using errcode = 'check_violation';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists submissions_guard on public.submissions;
create trigger submissions_guard
  before update on public.submissions
  for each row execute function public.guard_submission_status();

-- -----------------------------------------------------------------------------
-- Rate limit and duplicate hint
--
-- Both run on insert. The rate limit refuses; the duplicate check only
-- annotates. The numbers are deliberately generous — a motivated contributor
-- adding their neighbourhood's pharmacies in one sitting must not hit them.
-- -----------------------------------------------------------------------------

create or replace function public.check_submission_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  last_hour integer;
  last_day  integer;
begin
  select count(*) into last_hour
    from public.submissions
   where submitted_by = new.submitted_by
     and submitted_at > now() - interval '1 hour';

  if last_hour >= 15 then
    raise exception 'Too many submissions in the last hour. Please try again shortly.'
      using errcode = 'check_violation';
  end if;

  select count(*) into last_day
    from public.submissions
   where submitted_by = new.submitted_by
     and submitted_at > now() - interval '1 day';

  if last_day >= 60 then
    raise exception 'Daily submission limit reached. Please try again tomorrow.'
      using errcode = 'check_violation';
  end if;

  -- Advisory duplicate flag. Compares the two fields that actually identify a
  -- place -- its name and its phone number -- against what is already public.
  select case
           when exists (
             select 1 from public.listings l
              where lower(trim(coalesce(l.title, ''))) = lower(trim(new.title))
                and coalesce(l.section, '') = new.section
           ) then 'A published listing already uses this name in this section.'
           when new.phone is not null and trim(new.phone) <> '' and exists (
             select 1 from public.listings l
              where regexp_replace(coalesce(l.phone, ''), '[^0-9]', '', 'g')
                  = regexp_replace(new.phone, '[^0-9]', '', 'g')
                and regexp_replace(new.phone, '[^0-9]', '', 'g') <> ''
           ) then 'A published listing already uses this phone number.'
           else null
         end
    into new.duplicate_hint;

  return new;
end;
$$;

drop trigger if exists submissions_limits on public.submissions;
create trigger submissions_limits
  before insert on public.submissions
  for each row execute function public.check_submission_limits();


-- =============================================================================
-- 3. POINTS
--
-- A ledger, not a counter. The balance on `profiles` is derived from these rows
-- by trigger, so "why do I have 250 points" always has an answer, and so a
-- balance can never drift away from the events that produced it.
-- =============================================================================

create table if not exists public.points_transactions (
  id            bigserial primary key,
  -- profiles rather than auth.users, for the same PostgREST-embedding reason
  -- given on submissions.submitted_by above.
  user_id       uuid not null references public.profiles(id) on delete cascade,
  submission_id uuid references public.submissions(id) on delete set null,
  points        integer not null,
  reason        text not null,
  created_at    timestamptz not null default now(),
  created_by    uuid references public.profiles(id) on delete set null
);

create index if not exists points_tx_user_idx
  on public.points_transactions (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Duplicate reward protection (§39 of the brief)
--
-- This index is the mechanism, not a check in application code. Approving the
-- same submission twice — a double-click, a retried request, two admins on the
-- same queue — raises a unique violation on the second insert, which
-- approve_submission() swallows with ON CONFLICT DO NOTHING. First approval:
-- +50. Every attempt after it: +0, and no error shown to the admin.
--
-- Partial on the reason so a future manual adjustment against the same
-- submission ("corrected after re-review") is still possible.
-- -----------------------------------------------------------------------------

create unique index if not exists points_tx_one_award_per_submission
  on public.points_transactions (submission_id)
  where reason = 'submission_approved';

comment on index public.points_tx_one_award_per_submission is
  'One approval reward per submission, ever. This is what makes a repeated '
  'approval award zero additional points.';

-- The balance follows the ledger, in the same transaction as the entry.
create or replace function public.apply_points_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set points = greatest(0, points + new.points),
         updated_at = now()
   where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists points_tx_apply on public.points_transactions;
create trigger points_tx_apply
  after insert on public.points_transactions
  for each row execute function public.apply_points_transaction();


-- =============================================================================
-- 4. AUDIT LOG
-- =============================================================================

create table if not exists public.audit_log (
  id          bigserial primary key,
  actor_id    uuid references public.profiles(id) on delete set null,
  actor_email text,
  action      text not null,
  entity      text not null,
  entity_id   text not null,
  summary     text,
  changes     jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists audit_log_entity_idx
  on public.audit_log (entity, entity_id, created_at desc);
create index if not exists audit_log_created_idx
  on public.audit_log (created_at desc);


-- =============================================================================
-- 5. MODERATION
--
-- The two operations the whole design exists to protect. Both are SECURITY
-- DEFINER, so they run with the table owner's rights and can write to
-- `listings` and `points_transactions` that the caller cannot write directly.
-- Both therefore begin by checking who the caller actually is.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- approve_submission(id, edits)
--
-- `edits` is the admin's corrections, as a jsonb object keyed by submission
-- column name — the "fix the typo before approving" case (§34). Applied to the
-- submission row first, so the record of what was approved matches what was
-- published. Null or '{}' approves the submission exactly as it was sent.
--
-- Returns the listing id it published to.
-- -----------------------------------------------------------------------------

create or replace function public.approve_submission(
  p_submission_id uuid,
  p_edits jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s            public.submissions%rowtype;
  v_listing_id bigint;
  v_admin      uuid := auth.uid();
  v_email      text;
begin
  -- 1. Is the caller an admin?
  if not public.is_admin() then
    raise exception 'Only an administrator can approve a submission.'
      using errcode = 'insufficient_privilege';
  end if;

  -- 2. Does the submission exist, and can we hold it still while we work?
  --    FOR UPDATE serialises two admins approving the same row at once: the
  --    second waits, then finds status = 'approved' and stops at step 3.
  select * into s
    from public.submissions
   where id = p_submission_id
   for update;

  if not found then
    raise exception 'That submission no longer exists.' using errcode = 'no_data_found';
  end if;

  -- 3. Is it still pending? An already-approved submission is not re-approved,
  --    and — critically — is not paid for a second time.
  if s.status <> 'pending' then
    return jsonb_build_object(
      'status', s.status,
      'listing_id', s.published_listing_id,
      'points_awarded', 0,
      'already_reviewed', true
    );
  end if;

  -- 4. The admin's corrections, applied to the stored submission so the audit
  --    trail records what was actually published. Unknown keys are ignored
  --    rather than errored: this is a whitelist, and a client that invents a
  --    column name gets it dropped, not executed.
  perform set_config('elakai.moderating', 'on', true);

  if p_edits is not null and jsonb_typeof(p_edits) = 'object' then
    update public.submissions
       set title        = coalesce(p_edits ->> 'title', title),
           description  = coalesce(p_edits ->> 'description', description),
           phone        = coalesce(p_edits ->> 'phone', phone),
           alt_phone    = coalesce(p_edits ->> 'alt_phone', alt_phone),
           email        = coalesce(p_edits ->> 'email', email),
           address      = coalesce(p_edits ->> 'address', address),
           location     = coalesce(p_edits ->> 'location', location),
           maps_url     = coalesce(p_edits ->> 'maps_url', maps_url),
           price        = coalesce(p_edits ->> 'price', price),
           availability = coalesce(p_edits ->> 'availability', availability),
           section      = coalesce(p_edits ->> 'section', section),
           category     = coalesce(p_edits ->> 'category', category),
           subcategory  = coalesce(p_edits ->> 'subcategory', subcategory),
           image_url    = case when p_edits ? 'image_url'
                               then nullif(p_edits ->> 'image_url', '')
                               else image_url end,
           services     = case when p_edits ? 'services'
                               then p_edits -> 'services'
                               else services end
     where id = p_submission_id;

    select * into s from public.submissions where id = p_submission_id;
  end if;

  -- 5. Validate what is about to go public. A blank title would publish an
  --    unclickable row on the live site.
  if coalesce(trim(s.title), '') = '' then
    raise exception 'This submission has no title and cannot be published.'
      using errcode = 'check_violation';
  end if;

  -- 6. Publish. An edit to an existing listing updates that row; a new
  --    submission inserts one. Either way `status = 'active'` is what makes it
  --    visible, and it is set here and nowhere a contributor can reach.
  if s.target_listing_id is not null
     and exists (select 1 from public.listings where id = s.target_listing_id) then

    update public.listings
       set section      = s.section,
           category     = s.category,
           title        = s.title,
           description  = s.description,
           phone        = s.phone,
           email        = s.email,
           address      = s.address,
           location     = s.location,
           price        = s.price,
           availability = s.availability,
           image_url    = coalesce(s.image_url, image_url),
           status       = 'active',
           updated_at   = now()
     where id = s.target_listing_id
    returning id into v_listing_id;

  else
    insert into public.listings
      (section, category, title, description, phone, email, address, location,
       price, availability, image_url, status, display_order, updated_at)
    values
      (s.section, s.category, s.title, s.description, s.phone, s.email, s.address,
       s.location, s.price, s.availability, s.image_url, 'active', 0, now())
    returning id into v_listing_id;
  end if;

  -- 6b. The two columns migration 0007 adds. Written separately and only if
  --     they exist, so this function works on a project that has not applied
  --     0007 — the same reason src/lib/listing-columns.ts exists.
  if exists (
    select 1 from pg_attribute
     where attrelid = 'public.listings'::regclass
       and attname = 'maps_url' and attnum > 0 and not attisdropped
  ) then
    execute 'update public.listings set maps_url = $1 where id = $2'
      using s.maps_url, v_listing_id;
  end if;

  if exists (
    select 1 from pg_attribute
     where attrelid = 'public.listings'::regclass
       and attname = 'services' and attnum > 0 and not attisdropped
  ) then
    execute 'update public.listings set services = $1 where id = $2'
      using s.services, v_listing_id;
  end if;

  -- 7. Mark the submission reviewed.
  update public.submissions
     set status               = 'approved',
         reviewed_by          = v_admin,
         reviewed_at          = now(),
         approved_at          = now(),
         published_listing_id = v_listing_id,
         rejection_reason     = null,
         rejection_detail     = null
   where id = p_submission_id;

  -- 8. Pay the contributor. Exactly fifty points, exactly once — the ON
  --    CONFLICT is what makes a repeated approval free, and it fires against
  --    points_tx_one_award_per_submission above.
  insert into public.points_transactions
    (user_id, submission_id, points, reason, created_by)
  values
    (s.submitted_by, p_submission_id, 50, 'submission_approved', v_admin)
  on conflict do nothing;

  select email into v_email from public.profiles where id = v_admin;

  insert into public.audit_log (actor_id, actor_email, action, entity, entity_id, summary, changes)
  values (v_admin, v_email, 'ADMIN_APPROVED_SUBMISSION', 'submissions', p_submission_id::text,
          format('Published as listing %s', v_listing_id),
          jsonb_build_object('listing_id', v_listing_id, 'edits', p_edits));

  return jsonb_build_object(
    'status', 'approved',
    'listing_id', v_listing_id,
    'points_awarded', 50,
    'already_reviewed', false
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- reject_submission(id, reason, detail)
--
-- Publishes nothing, awards nothing, and records why in a field the contributor
-- can read. The reason is required: a rejection with no explanation teaches the
-- contributor nothing and produces the same submission again next week.
-- -----------------------------------------------------------------------------

create or replace function public.reject_submission(
  p_submission_id uuid,
  p_reason text,
  p_detail text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s       public.submissions%rowtype;
  v_admin uuid := auth.uid();
  v_email text;
begin
  if not public.is_admin() then
    raise exception 'Only an administrator can reject a submission.'
      using errcode = 'insufficient_privilege';
  end if;

  if coalesce(trim(p_reason), '') = '' then
    raise exception 'A rejection needs a reason.' using errcode = 'check_violation';
  end if;

  select * into s from public.submissions where id = p_submission_id for update;
  if not found then
    raise exception 'That submission no longer exists.' using errcode = 'no_data_found';
  end if;

  if s.status <> 'pending' then
    return jsonb_build_object('status', s.status, 'already_reviewed', true);
  end if;

  perform set_config('elakai.moderating', 'on', true);

  update public.submissions
     set status           = 'rejected',
         reviewed_by      = v_admin,
         reviewed_at      = now(),
         approved_at      = null,
         rejection_reason = trim(p_reason),
         rejection_detail = nullif(trim(coalesce(p_detail, '')), '')
   where id = p_submission_id;

  select email into v_email from public.profiles where id = v_admin;

  insert into public.audit_log (actor_id, actor_email, action, entity, entity_id, summary)
  values (v_admin, v_email, 'ADMIN_REJECTED_SUBMISSION', 'submissions',
          p_submission_id::text, trim(p_reason));

  return jsonb_build_object('status', 'rejected', 'already_reviewed', false);
end;
$$;

-- Callable by any signed-in user; both refuse a non-admin on their first line.
-- Explicitly revoked from anon so an unauthenticated request cannot even reach
-- the authorization check.
revoke all on function public.approve_submission(uuid, jsonb) from public, anon;
revoke all on function public.reject_submission(uuid, text, text) from public, anon;
grant execute on function public.approve_submission(uuid, jsonb) to authenticated;
grant execute on function public.reject_submission(uuid, text, text) to authenticated;


-- =============================================================================
-- 6. ROW LEVEL SECURITY
-- =============================================================================

alter table public.profiles            enable row level security;
alter table public.submissions         enable row level security;
alter table public.points_transactions enable row level security;
alter table public.audit_log           enable row level security;

-- -----------------------------------------------------------------------------
-- profiles
--
-- Note what is NOT here: no INSERT policy. Profiles are created by the trigger
-- on auth.users and by nothing else, so there is no path by which a client
-- supplies the initial row — and therefore no path by which it supplies a role.
-- -----------------------------------------------------------------------------

drop policy if exists profiles_self_read   on public.profiles;
drop policy if exists profiles_admin_read  on public.profiles;
drop policy if exists profiles_self_update on public.profiles;
drop policy if exists profiles_admin_write on public.profiles;

create policy profiles_self_read on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy profiles_self_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_admin_write on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- The column grant is the actual protection on role and points; the policy
-- above only decides which ROWS are updatable, and a policy cannot express
-- "every column except these two".
--
-- Supabase grants ALL on public tables to `authenticated` by default, so this
-- narrows an existing grant rather than adding one. After this, an UPDATE that
-- names `role` or `points` is refused by the grant system before RLS is even
-- consulted — including one issued by an admin, which is why promoting an
-- administrator is a dashboard SQL statement and not an app feature.
revoke update on public.profiles from authenticated;
grant  update (full_name) on public.profiles to authenticated;

-- -----------------------------------------------------------------------------
-- submissions
--
-- A contributor sees their own and no one else's. There is deliberately no
-- policy granting the public any read at all: a pending submission is private
-- until an admin publishes a copy of it into `listings`.
-- -----------------------------------------------------------------------------

drop policy if exists submissions_own_read    on public.submissions;
drop policy if exists submissions_own_insert  on public.submissions;
drop policy if exists submissions_own_update  on public.submissions;
drop policy if exists submissions_own_delete  on public.submissions;
drop policy if exists submissions_admin_all   on public.submissions;

create policy submissions_own_read on public.submissions
  for select using (submitted_by = auth.uid() or public.is_admin());

-- `submitted_by = auth.uid()` in WITH CHECK is what stops a contributor filing
-- a submission in somebody else's name. `status = 'pending'` stops a crafted
-- insert arriving pre-approved — the trigger guards transitions, and this
-- guards the initial value.
create policy submissions_own_insert on public.submissions
  for insert with check (
    submitted_by = auth.uid()
    and status = 'pending'
    and reviewed_by is null
    and approved_at is null
    and published_listing_id is null
  );

-- Only while pending. Once reviewed, the row is the record of what was
-- reviewed, and the contributor's route to a change is a new submission.
create policy submissions_own_update on public.submissions
  for update using (submitted_by = auth.uid() and status = 'pending')
           with check (submitted_by = auth.uid());

create policy submissions_own_delete on public.submissions
  for delete using (
    (submitted_by = auth.uid() and status = 'pending') or public.is_admin()
  );

-- Admins edit a submission before approving it. They cannot move its status
-- this way — submissions_guard refuses that outside the two functions.
create policy submissions_admin_all on public.submissions
  for update using (public.is_admin()) with check (public.is_admin());

-- Belt and braces alongside the insert policy: even a future policy mistake
-- cannot let a client set these.
revoke insert, update on public.submissions from authenticated;
grant insert (submitted_by, section, category, subcategory, title, description,
              phone, alt_phone, email, address, location, maps_url, price,
              availability, services, image_url, target_listing_id)
  on public.submissions to authenticated;
grant update (section, category, subcategory, title, description, phone,
              alt_phone, email, address, location, maps_url, price,
              availability, services, image_url)
  on public.submissions to authenticated;

-- -----------------------------------------------------------------------------
-- points_transactions
--
-- Read-only to everyone through PostgREST. There is no INSERT policy, no UPDATE
-- policy and no DELETE policy, so the only writer is approve_submission(),
-- which is SECURITY DEFINER and therefore not subject to these at all. A
-- contributor POSTing `{points: 5000}` at this table is refused by the absence
-- of a policy, not by a check they might find a way around.
-- -----------------------------------------------------------------------------

drop policy if exists points_tx_own_read on public.points_transactions;

create policy points_tx_own_read on public.points_transactions
  for select using (user_id = auth.uid() or public.is_admin());

revoke insert, update, delete on public.points_transactions from authenticated, anon;

-- -----------------------------------------------------------------------------
-- audit_log — admin-readable, append-only
-- -----------------------------------------------------------------------------

drop policy if exists audit_admin_read on public.audit_log;
drop policy if exists audit_self_write on public.audit_log;

create policy audit_admin_read on public.audit_log
  for select using (public.is_admin());

-- A signed-in user may record their own actions and may not forge somebody
-- else's. No UPDATE and no DELETE policy: a trail the audited can rewrite is
-- decoration.
create policy audit_self_write on public.audit_log
  for insert with check (actor_id = auth.uid());

revoke update, delete on public.audit_log from authenticated, anon;


-- =============================================================================
-- 7. public.listings — authoritative policies
--
-- These already exist on this project, created by hand, and they work. They are
-- restated here for two reasons. First, they compare against a hard-coded uuid,
-- and after this migration the answer to "is this an admin" lives in `profiles`
-- — leaving two definitions of admin in the system is how they come to
-- disagree. Second, their exact current shape is not recorded anywhere in this
-- repository, so nothing today can state what the public can and cannot do.
--
-- The hard-coded id is not lost: the UPDATE in section 1 gave that account
-- role = 'admin', so `is_admin()` returns true for exactly the account the old
-- policies named. Nothing about who can edit changes on the day this runs.
--
-- Every existing policy on the table is dropped first, by name, discovered from
-- the catalogue — a leftover permissive policy would silently keep granting
-- whatever it granted, which is precisely the state this section exists to end.
-- =============================================================================

alter table public.listings enable row level security;

do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
     where schemaname = 'public' and tablename = 'listings'
  loop
    execute format('drop policy if exists %I on public.listings', p.policyname);
  end loop;
end;
$$;

-- The public site. `status = 'active'` is the whole of what a visitor may see,
-- and it is enforced here rather than by the frontend filter that also applies.
create policy listings_public_read on public.listings
  for select using (status = 'active' or public.is_admin());

create policy listings_admin_write on public.listings
  for all using (public.is_admin()) with check (public.is_admin());


-- =============================================================================
-- 8. STORAGE
--
-- Two buckets.
--
--   elakai-images        already exists, holds admin-uploaded listing images.
--                        Left exactly as it is.
--
--   elakai-submissions   new. Contributor uploads, one folder per contributor.
--
-- OWNERSHIP IS THE FIRST PATH SEGMENT
--
-- Every object a contributor uploads lands at
--
--     <their auth uid>/<uuid>-<name>.<ext>
--
-- and the policies below compare `(storage.foldername(name))[1]` to
-- `auth.uid()`. That is what makes "you cannot overwrite or delete another
-- contributor's image" a database rule rather than a convention the client
-- happens to follow.
--
-- ON THE BUCKET BEING PUBLIC-READ
--
-- Stated plainly because it is a real tradeoff, not an oversight. An approved
-- submission's image has to render on the public site from a stable URL that
-- never expires, which a signed URL cannot do. So the bucket is public-read and
-- a *pending* submission's image is reachable by anyone holding its exact path
-- — a 36-character random uuid that appears nowhere until an admin opens the
-- review screen. The submission row itself, with the contributor's name, phone
-- number and address, stays strictly private under the RLS above.
--
-- Unlisted, in other words, not secret. If that is not good enough for a future
-- category of submission, the fix is a private bucket plus an approval-time
-- copy into the public one, which needs an edge function this project does not
-- have.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'elakai-submissions', 'elakai-submissions', true,
  5242880,                                            -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- `allowed_mime_types` and `file_size_limit` above are the server-side half of
-- §24: the browser check in src/lib/submission-images.ts is a courtesy that
-- explains the problem before the upload starts, and this is what actually
-- refuses a renamed .exe or a 40 MB photograph.

drop policy if exists submission_images_public_read   on storage.objects;
drop policy if exists submission_images_owner_insert  on storage.objects;
drop policy if exists submission_images_owner_update  on storage.objects;
drop policy if exists submission_images_owner_delete  on storage.objects;
drop policy if exists submission_images_admin_manage  on storage.objects;

create policy submission_images_public_read on storage.objects
  for select using (bucket_id = 'elakai-submissions');

create policy submission_images_owner_insert on storage.objects
  for insert with check (
    bucket_id = 'elakai-submissions'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy submission_images_owner_update on storage.objects
  for update using (
    bucket_id = 'elakai-submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy submission_images_owner_delete on storage.objects
  for delete using (
    bucket_id = 'elakai-submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Moderation: an admin removes an image that should not have been uploaded.
create policy submission_images_admin_manage on storage.objects
  for all using (bucket_id = 'elakai-submissions' and public.is_admin())
      with check (bucket_id = 'elakai-submissions' and public.is_admin());


-- =============================================================================
-- 9. CONTRIBUTOR-FACING READS
--
-- The dashboard needs three counts and a balance. Aggregating in Postgres
-- rather than shipping every submission to the browser to call .length on it.
-- SECURITY INVOKER — this reads only rows the caller's own policies already
-- allow, so it needs no elevated rights and must not have any.
-- =============================================================================

create or replace function public.my_contribution_stats()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'total',    count(*),
    'pending',  count(*) filter (where status = 'pending'),
    'approved', count(*) filter (where status = 'approved'),
    'rejected', count(*) filter (where status = 'rejected'),
    'points',   coalesce((select points from public.profiles where id = auth.uid()), 0)
  )
  from public.submissions
  where submitted_by = auth.uid();
$$;

revoke all on function public.my_contribution_stats() from public, anon;
grant execute on function public.my_contribution_stats() to authenticated;


-- =============================================================================
-- 10. VERIFICATION — read only, run after the above
--
--   select * from public.verify_contributor_schema();
--
-- Every row should read 'ok'. Kept as a function rather than a comment block so
-- it can be re-run at any time, including months from now when somebody wonders
-- whether a policy was ever dropped by hand.
-- =============================================================================

create or replace function public.verify_contributor_schema()
returns table (check_name text, result text, detail text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  select 'tables exist'::text,
         case when count(*) = 4 then 'ok' else 'MISSING' end,
         string_agg(tablename, ', ' order by tablename)
    from pg_tables
   where schemaname = 'public'
     and tablename in ('profiles', 'submissions', 'points_transactions', 'audit_log');

  return query
  select 'rls enabled'::text,
         case when bool_and(rowsecurity) then 'ok' else 'NOT ENFORCED' end,
         string_agg(tablename || '=' || rowsecurity::text, ', ' order by tablename)
    from pg_tables
   where schemaname = 'public'
     and tablename in ('profiles', 'submissions', 'points_transactions',
                       'audit_log', 'listings');

  return query
  select 'duplicate-reward index'::text,
         case when count(*) = 1 then 'ok' else 'MISSING' end,
         'points_tx_one_award_per_submission'
    from pg_indexes
   where schemaname = 'public' and indexname = 'points_tx_one_award_per_submission';

  return query
  select 'moderation functions'::text,
         case when count(*) = 2 then 'ok' else 'MISSING' end,
         string_agg(proname, ', ' order by proname)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname in ('approve_submission', 'reject_submission');

  return query
  select 'at least one admin'::text,
         case when count(*) >= 1 then 'ok' else 'NONE — nobody can moderate' end,
         count(*)::text || ' admin profile(s)'
    from public.profiles where role = 'admin';

  return query
  select 'profiles.role not writable by users'::text,
         case when count(*) = 0 then 'ok' else 'WRITABLE — role escalation possible' end,
         coalesce(string_agg(column_name, ', '), 'no update grant on role/points')
    from information_schema.column_privileges
   where table_schema = 'public' and table_name = 'profiles'
     and grantee = 'authenticated' and privilege_type = 'UPDATE'
     and column_name in ('role', 'points');

  return query
  select 'submissions bucket'::text,
         case when count(*) = 1 then 'ok' else 'MISSING' end,
         'elakai-submissions'
    from storage.buckets where id = 'elakai-submissions';

  return query
  select 'listings policies'::text,
         case when count(*) = 2 then 'ok' else 'UNEXPECTED (' || count(*) || ')' end,
         string_agg(policyname, ', ' order by policyname)
    from pg_policies where schemaname = 'public' and tablename = 'listings';
end;
$$;
