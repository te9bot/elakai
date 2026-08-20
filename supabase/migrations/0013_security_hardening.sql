-- =============================================================================
-- 0013 — security hardening
--
-- STATUS: NOT APPLIED. Additive and idempotent. Safe to run more than once.
-- DEPENDS ON 0008 (it calls public.is_admin()).
--
-- This migration changes no table, adds no column and removes no capability the
-- application uses. It closes four specific gaps found by reading the policies
-- that are actually installed, rather than the ones each migration meant to
-- leave behind.
--
--   1. TWO DEFINITIONS OF "ADMIN"
--
--      0001 created is_active_admin(), which reads `public.admin_users`.
--      0008 created is_admin(), which reads `public.profiles.role`, and moved
--      `listings` onto it — but only `listings`. Every other table policied by
--      0002 (areas, categories, services, facilities, doctors, chambers,
--      businesses, rentals, emergency_contacts, reviews, media, the join
--      tables, and the `elakai-media` bucket) still asks the old one.
--
--      That is a second authority for the one question this schema exists to
--      answer, and the two can disagree in both directions: a row in
--      `admin_users` grants write access to eleven content tables to somebody
--      whose `profiles.role` is 'user', and an administrator promoted properly
--      in `profiles` cannot touch any of them. Section 7 of 0008 says that
--      leaving two definitions "is how they come to disagree", and then leaves
--      two definitions.
--
--      is_active_admin() is redefined below to return is_admin(). One column
--      decides, everywhere. `admin_users` stops being an authorization surface
--      without being dropped — the rows stay for reference.
--
--   2. AN AUDIT LOG THE AUDITED COULD WRITE FOR EACH OTHER
--
--      0002 created `audit_admin_insert` (with check is_active_admin()) and
--      0008 created `audit_self_write` (with check actor_id = auth.uid()) and
--      dropped only `audit_admin_read`. Both INSERT policies are therefore live
--      and, being permissive, they are OR'd: `audit_admin_insert` lets an admin
--      insert a row naming ANY actor_id, and `audit_self_write` lets any
--      signed-in user insert a row with any `action` — including
--      'ADMIN_APPROVED_SUBMISSION'.
--
--      Neither is a privilege escalation, but both let somebody write history
--      that did not happen, which is the whole of what an audit log is for. The
--      forgeable-actor policy is dropped and the self-write policy is narrowed
--      so a client cannot mint an ADMIN_ entry. Every real administrative entry
--      is written inside approve_submission() and reject_submission(), which
--      are SECURITY DEFINER and not subject to either policy.
--
--   3. NOTHING ASKED WHETHER THE EMAIL WAS EVER CONFIRMED
--
--      Supabase Auth refuses signInWithPassword for an unconfirmed address, so
--      in practice an unverified account had no session to attack with. That is
--      a property of the auth server's current configuration, not of this
--      schema — turn "Confirm email" off in the dashboard, or add a sign-in
--      path that does not check it, and every policy below would have accepted
--      an unverified account without ever asking.
--
--      is_email_verified() makes the question explicit, and the two policies
--      that create content ask it. It reads auth.users.email_confirmed_at,
--      which Supabase writes when a confirmation link is opened OR when
--      verifyOtp() succeeds — so the OTP flow added alongside this migration is
--      what satisfies it, and a client that skips the OTP screen has nothing to
--      skip it with.
--
--   4. NO WAY TO ASSERT ANY OF THIS
--
--      verify_security() at the bottom answers the security test matrix from
--      inside the database, so "can a normal user become an admin" has an
--      answer that is checked rather than argued.
-- =============================================================================


-- =============================================================================
-- 1. ONE AUTHORITY
-- =============================================================================

-- Deliberately no longer references public.admin_users. Redefining the body
-- rather than dropping the function keeps all eleven 0002 policies working
-- exactly as written — they still call is_active_admin(), it still returns a
-- boolean, and the boolean now comes from the one column that decides.
create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select public.is_admin();
$fn$;

comment on function public.is_active_admin() is
  'Legacy name kept for the policies created in 0002. Delegates to is_admin() '
  'so public.profiles.role is the only place a role is decided. Does not read '
  'public.admin_users; a row there grants nothing.';


-- =============================================================================
-- 2. EMAIL VERIFICATION AS A DATABASE-SIDE PREDICATE
--
-- SECURITY DEFINER because `authenticated` cannot select from auth.users, and
-- STABLE so it is evaluated once per statement rather than once per row.
--
-- Coalesced to false: no session, no row, no verification. A predicate whose
-- failure mode is null disappears from a policy's AND and grants exactly what
-- it was written to refuse.
-- =============================================================================

create or replace function public.is_email_verified()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $fn$
  select coalesce(
    (select u.email_confirmed_at is not null
       from auth.users u
      where u.id = auth.uid()),
    false
  );
$fn$;

comment on function public.is_email_verified() is
  'True when Supabase Auth has confirmed this session''s email address, by a '
  'confirmation link or by a successful verifyOtp(). The frontend never '
  'decides this: auth.users.email_confirmed_at is written by the auth server.';

revoke all on function public.is_email_verified() from public, anon;
grant execute on function public.is_email_verified() to authenticated;


-- =============================================================================
-- 3. SUBMISSIONS — UNVERIFIED ACCOUNTS CREATE NOTHING
--
-- Restated in full rather than altered: a policy cannot be amended in place,
-- and restating it is also the only way to be certain what the installed
-- predicate actually is. Every clause below except `is_email_verified()` is
-- 0008's, unchanged.
-- =============================================================================

drop policy if exists submissions_own_insert on public.submissions;

create policy submissions_own_insert on public.submissions
  for insert with check (
    submitted_by = auth.uid()
    and public.is_email_verified()
    and status = 'pending'
    and reviewed_by is null
    and approved_at is null
    and published_listing_id is null
  );

-- The same gate on the upload half. Without it an unverified session could not
-- file a submission but could still put arbitrary images in the bucket.
drop policy if exists submission_images_owner_insert on storage.objects;

create policy submission_images_owner_insert on storage.objects
  for insert with check (
    bucket_id = 'elakai-submissions'
    and auth.uid() is not null
    and public.is_email_verified()
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- =============================================================================
-- 4. AUDIT LOG — NOBODY WRITES SOMEBODY ELSE'S HISTORY
-- =============================================================================

-- 0002's. `with check (is_active_admin())` says nothing about actor_id, so an
-- administrator could record an action against any account. Dropped outright:
-- every administrative entry is written by the two SECURITY DEFINER moderation
-- functions, which set actor_id from auth.uid() themselves.
drop policy if exists audit_admin_insert on public.audit_log;

drop policy if exists audit_self_write on public.audit_log;

create policy audit_self_write on public.audit_log
  for insert with check (
    actor_id = auth.uid()
    -- ADMIN_ is the prefix both moderation functions use. Refusing it here
    -- means a forged approval cannot be written by a client at all, so an
    -- ADMIN_ row in this table is always one Postgres wrote.
    and left(coalesce(action, ''), 6) <> 'ADMIN_'
  );

comment on policy audit_self_write on public.audit_log is
  'A signed-in user may record their own actions under their own id, and may '
  'not mint an ADMIN_ entry. Administrative history is written inside '
  'approve_submission() and reject_submission().';


-- =============================================================================
-- 5. VERIFICATION — read only, run after the above
--
--   select * from public.verify_security();
--
-- Every row should read 'ok'. This is the security test matrix expressed as
-- queries against the catalogue, so the answers come from what is installed
-- rather than from what a migration intended to install.
-- =============================================================================

create or replace function public.verify_security()
returns table (check_name text, result text, detail text)
language plpgsql
stable
security definer
set search_path = public
as $fn$
begin
  -- Role escalation. The column grant, not the policy, is what stops it.
  return query
  select 'role/points not writable by users'::text,
         case when count(*) = 0 then 'ok' else 'WRITABLE — escalation possible' end,
         coalesce(string_agg(column_name::text, ', '), 'no update grant on role or points')
    from information_schema.column_privileges
   where table_schema = 'public' and table_name = 'profiles'
     and grantee = 'authenticated' and privilege_type = 'UPDATE'
     and column_name in ('role', 'points');

  -- Self-approval. `status` is not in the UPDATE grant, and submissions_guard
  -- refuses a transition outside the moderation functions regardless.
  return query
  select 'submission status not writable'::text,
         case when count(*) = 0 then 'ok' else 'WRITABLE — self-approval possible' end,
         coalesce(string_agg(column_name::text, ', '), 'no update grant on status')
    from information_schema.column_privileges
   where table_schema = 'public' and table_name = 'submissions'
     and grantee = 'authenticated' and privilege_type = 'UPDATE'
     and column_name in ('status', 'reviewed_by', 'approved_at', 'published_listing_id');

  return query
  select 'status guard trigger'::text,
         case when count(*) = 1 then 'ok' else 'MISSING — status is an ordinary column' end,
         'submissions_guard'
    from pg_trigger
   where tgrelid = 'public.submissions'::regclass
     and tgname = 'submissions_guard' and not tgisinternal;

  -- RP Points. No INSERT, UPDATE or DELETE policy exists on the ledger, so the
  -- only writer is approve_submission(), which is SECURITY DEFINER.
  return query
  select 'points ledger closed to clients'::text,
         case when count(*) = 0 then 'ok' else 'WRITABLE — ' || count(*) || ' write policy' end,
         coalesce(string_agg(policyname || ':' || cmd, ', '), 'select-only')
    from pg_policies
   where schemaname = 'public' and tablename = 'points_transactions'
     and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL');

  return query
  select 'points write grants revoked'::text,
         case when count(*) = 0 then 'ok' else 'GRANTED — ' || count(*) end,
         coalesce(string_agg(distinct privilege_type::text, ', '), 'none')
    from information_schema.table_privileges
   where table_schema = 'public' and table_name = 'points_transactions'
     and grantee in ('authenticated', 'anon')
     and privilege_type in ('INSERT', 'UPDATE', 'DELETE');

  -- One authority. Two function names, one answer.
  return query
  select 'one admin predicate'::text,
         case when count(*) = 0 then 'ok' else 'SPLIT — is_active_admin reads admin_users' end,
         'is_active_admin() delegates to is_admin()'
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'is_active_admin'
     and pg_get_functiondef(p.oid) ilike '%admin_users%';

  -- Data isolation. RLS must be on, or the anon key reads the lot.
  return query
  select 'rls enabled on private tables'::text,
         case when bool_and(rowsecurity) then 'ok' else 'NOT ENFORCED' end,
         string_agg(tablename || '=' || rowsecurity::text, ', ' order by tablename)
    from pg_tables
   where schemaname = 'public'
     and tablename in ('profiles', 'submissions', 'points_transactions',
                       'audit_log', 'listings');

  return query
  select 'no public read of submissions'::text,
         case when count(*) = 0 then 'ok' else 'LEAKING — ' || count(*) || ' anon policy' end,
         coalesce(string_agg(policyname, ', '), 'contributor and admin only')
    from pg_policies
   where schemaname = 'public' and tablename = 'submissions'
     and 'anon' = any(roles);

  -- Verification. Both content-creating policies must ask.
  return query
  select 'submission insert requires verified email'::text,
         case when count(*) = 1 then 'ok' else 'NOT CHECKED' end,
         'submissions_own_insert'
    from pg_policies
   where schemaname = 'public' and tablename = 'submissions'
     and policyname = 'submissions_own_insert'
     and with_check ilike '%is_email_verified%';

  return query
  select 'image upload requires verified email'::text,
         case when count(*) = 1 then 'ok' else 'NOT CHECKED' end,
         'submission_images_owner_insert'
    from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and policyname = 'submission_images_owner_insert'
     and with_check ilike '%is_email_verified%';

  -- Audit integrity.
  return query
  select 'audit actor cannot be forged'::text,
         case when count(*) = 0 then 'ok' else 'FORGEABLE — ' || string_agg(policyname, ', ') end,
         'no INSERT policy omits actor_id = auth.uid()'
    from pg_policies
   where schemaname = 'public' and tablename = 'audit_log'
     and cmd in ('INSERT', 'ALL')
     and coalesce(with_check, '') not ilike '%auth.uid()%';

  return query
  select 'audit log append-only'::text,
         case when count(*) = 0 then 'ok' else 'REWRITABLE — ' || count(*) || ' policy' end,
         coalesce(string_agg(policyname || ':' || cmd, ', '), 'no update or delete policy')
    from pg_policies
   where schemaname = 'public' and tablename = 'audit_log'
     and cmd in ('UPDATE', 'DELETE');

  -- Moderation reachability. anon must not even reach the authorization check.
  return query
  select 'moderation functions closed to anon'::text,
         case when bool_and(not has_function_privilege('anon', p.oid, 'execute'))
              then 'ok' else 'EXECUTABLE BY ANON' end,
         string_agg(p.proname::text, ', ' order by p.proname::text)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('approve_submission', 'reject_submission');

  return query
  select 'at least one admin'::text,
         case when count(*) >= 1 then 'ok' else 'NONE — nobody can moderate' end,
         count(*)::text || ' admin profile(s)'
    from public.profiles where role = 'admin';
end;
$fn$;

revoke all on function public.verify_security() from public, anon;
