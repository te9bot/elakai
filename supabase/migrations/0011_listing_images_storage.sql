-- =============================================================================
-- 0011 — let administrators manage listing images again
--
-- THE BUG THIS FIXES
--
-- `public.listings` moved to the profiles-based authorization model in 0008:
-- every policy on the table now asks `public.is_admin()`, which reads
-- `public.profiles.role`. The `elakai-images` bucket did not move with it. Its
-- policies on `storage.objects` were written before `profiles` existed and
-- still test the single hard-coded administrator id that `src/lib/config.ts`
-- used to carry, so any administrator promoted since — anyone whose
-- `profiles.role` is 'admin' but whose id is not that one — is refused by
-- storage while being accepted by every table.
--
-- Verified against the live project on 2026-08-18 with the anon key and a
-- signed-in administrator session (`profiles.role = 'admin'`,
-- `public.is_admin()` returns true):
--
--     PATCH  /rest/v1/listings?id=eq.5           200   update accepted
--     POST   /rest/v1/listings                   201   insert accepted
--     DELETE /rest/v1/listings?id=eq.<new>       200   delete accepted
--     POST   /storage/v1/object/elakai-images/…  403   "new row violates
--                                                       row-level security
--                                                       policy"
--
-- The upload is the only refused operation, and the browser reported it as
-- "Your account is not allowed to make that change." — a role error for what
-- is a storage-policy problem. src/lib/listings-admin.ts now words the two
-- differently; this file removes the cause.
--
-- WHAT IT CHANGES
--
--   * `storage.buckets`: ensures `elakai-images` exists, is public, and keeps
--     the 50MB ceiling and image MIME list the admin panel already validates
--     against. `on conflict do update` — an existing bucket is not recreated,
--     and no object is touched.
--   * `storage.objects`: replaces the policies that govern that one bucket with
--     four that ask `public.is_admin()`.
--
-- WHAT IT DOES NOT CHANGE
--
--   * No table is created, altered or dropped. No row of `public.listings` is
--     read or written. The 145 listings are not touched.
--   * Policies belonging to the other two buckets — `elakai-media` (0002) and
--     `elakai-submissions` (0008) — are left exactly as they are. The drop
--     below is discovered from the catalogue and filtered to policies whose own
--     definition names `elakai-images`, so it cannot reach them.
--   * RLS on `storage.objects` stays enabled. It is Supabase-managed and this
--     file never disables it.
--
-- Safe to run more than once.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. The bucket
--
-- Public read is deliberate and unchanged: these are photographs of shops and
-- hospitals shown to every visitor of a static site, and their URLs are already
-- stored in `public.listings.image_url`. Nothing private is kept here — a
-- contributor's own uploads live in `elakai-submissions`, which is not public.
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'elakai-images', 'elakai-images', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update
  set public             = true,
      file_size_limit    = greatest(coalesce(storage.buckets.file_size_limit, 0), 52428800),
      allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- 2. Out with the old
--
-- By name, discovered from the catalogue rather than guessed, because a policy
-- left behind under a name this file does not know is a permissive policy that
-- silently keeps granting whatever it granted. The filter is the policy's own
-- text: only ones that mention this bucket are dropped.
-- -----------------------------------------------------------------------------

do $$
declare
  p record;
begin
  for p in
    select policyname
      from pg_policies
     where schemaname = 'storage'
       and tablename  = 'objects'
       and (coalesce(qual, '') like '%elakai-images%'
            or coalesce(with_check, '') like '%elakai-images%')
  loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
    raise notice 'dropped storage policy %', p.policyname;
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- 3. In with the new
--
-- One predicate, `public.is_admin()`, the same one every policy on
-- `public.listings` uses and the same one `approve_submission()` checks. There
-- is now exactly one answer in this database to "is this account an
-- administrator", and storage asks it too.
--
-- Note what is NOT granted: `authenticated` gets nothing here. A contributor
-- uploads to `elakai-submissions` under the owner-scoped policies in 0008, and
-- their image is copied into a listing by `approve_submission()` — which runs
-- as an administrator's action, not as theirs. So a contributor still cannot
-- write to, overwrite, or delete anything in this bucket, before or after this
-- migration.
-- -----------------------------------------------------------------------------

create policy listing_images_public_read on storage.objects
  for select using (bucket_id = 'elakai-images');

create policy listing_images_admin_insert on storage.objects
  for insert with check (bucket_id = 'elakai-images' and public.is_admin());

-- Both halves. `using` decides which existing objects may be updated and
-- `with_check` decides what they may become; a policy with only the first lets
-- an update move a row out of the bucket it was allowed in.
create policy listing_images_admin_update on storage.objects
  for update using (bucket_id = 'elakai-images' and public.is_admin())
          with check (bucket_id = 'elakai-images' and public.is_admin());

-- Separate from update on purpose. Replacing a listing image is upload-then-
-- delete in the admin panel (see `uploadListingImage` / `removeListingImage`),
-- so a missing DELETE policy shows up as an image that cannot be removed and an
-- orphaned object in the bucket, not as a failed save.
create policy listing_images_admin_delete on storage.objects
  for delete using (bucket_id = 'elakai-images' and public.is_admin());

-- -----------------------------------------------------------------------------
-- 4. Verify
--
-- Expect four rows: listing_images_admin_delete, listing_images_admin_insert,
-- listing_images_admin_update, listing_images_public_read.
-- -----------------------------------------------------------------------------

select policyname, cmd
  from pg_policies
 where schemaname = 'storage'
   and tablename  = 'objects'
   and policyname like 'listing_images_%'
 order by policyname;
