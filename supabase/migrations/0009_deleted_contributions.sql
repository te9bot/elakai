-- =============================================================================
-- 0009 — deleting a published listing removes it from the contributor too
--
-- STATUS: NOT APPLIED. Additive only. Safe to run more than once.
--
-- THE BUG
--
-- `submissions` and `listings` are two tables on purpose: the submission is the
-- record of what a contributor sent and what an admin approved, and the listing
-- is the live directory row published from it. Nothing joined their lifecycles,
-- so an admin deleting a listing left the submission untouched — gone from the
-- admin's listing table, still sitting in the contributor's My Contributions
-- marked APPROVED, still counted in their statistics, and still there after a
-- refresh or a fresh login because the database really did still hold it.
--
-- WHAT THIS ADDS
--
--   submissions.deleted_at        when the published listing was removed
--   listings_soft_delete_subs()   a BEFORE DELETE trigger that sets it
--
-- and narrows the contributor's read policy so a deleted submission is invisible
-- to them while an admin can still audit it.
--
-- SOFT, NOT HARD
--
-- The submission is the audit trail. Section 8 of the contributor brief and the
-- `audit_log` table both exist so "who approved what, and when" survives, and
-- hard-deleting the row would take the approval record and the points
-- provenance with it. So the row stays, stops being the contributor's, and
-- remains visible to an administrator.
--
-- ON POINTS
--
-- Deliberately NOT reversed. `points_transactions` is append-only by design —
-- it has no UPDATE and no DELETE policy at all — and the balance on `profiles`
-- is derived from it by trigger. The fifty points were awarded for work that
-- was genuinely done and genuinely verified at the time; withdrawing them
-- later would also mean deleting a ledger row, which is the one thing that
-- schema refuses to allow.
--
-- If the owner wants deletion to claw the points back, the honest way is a
-- compensating entry rather than a deletion:
--
--   insert into public.points_transactions (user_id, submission_id, points, reason, created_by)
--   values (<contributor>, <submission>, -50, 'contribution_removed', auth.uid());
--
-- The trigger on that table applies it to the balance, `greatest(0, ...)` keeps
-- it from going negative, and the history still reads correctly. That is a
-- product decision, so it is written here rather than done.
-- =============================================================================

alter table public.submissions
  add column if not exists deleted_at timestamptz;

comment on column public.submissions.deleted_at is
  'Set when the listing published from this submission was deleted by an admin. '
  'The row is retained as the approval record; contributors no longer see it.';

-- The contributor's queries all filter on this, so it belongs in the index they
-- already use rather than in one of its own.
create index if not exists submissions_contributor_live_idx
  on public.submissions (submitted_by, submitted_at desc)
  where deleted_at is null;


-- -----------------------------------------------------------------------------
-- The link between the two lifecycles
--
-- BEFORE DELETE, not AFTER. `submissions.published_listing_id` carries
-- `on delete set null`, so by the time an AFTER trigger ran the pointer would
-- already be null and there would be nothing left to match on.
--
-- SECURITY DEFINER because `authenticated` holds an UPDATE grant on a specific
-- list of submission columns and `deleted_at` is deliberately not one of them —
-- this is the only thing allowed to set it.
--
-- The `elakai.moderating` flag is what gets the write past
-- `guard_submission_status()`, which otherwise refuses any UPDATE touching an
-- approved submission. Same mechanism approve_submission() uses, and it is
-- transaction-local so it cannot leak to anything else.
-- -----------------------------------------------------------------------------

create or replace function public.listings_soft_delete_subs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_email text;
  v_count integer;
begin
  perform set_config('elakai.moderating', 'on', true);

  update public.submissions
     set deleted_at = now(),
         updated_at = now()
   where published_listing_id = old.id
     and deleted_at is null;

  get diagnostics v_count = row_count;

  if v_count > 0 then
    select email into v_email from public.profiles where id = v_actor;
    insert into public.audit_log (actor_id, actor_email, action, entity, entity_id, summary, changes)
    values (v_actor, v_email, 'ADMIN_DELETED_LISTING', 'listings', old.id::text,
            format('Listing deleted; %s contributor submission(s) withdrawn', v_count),
            jsonb_build_object('listing_id', old.id, 'submissions_marked', v_count));
  end if;

  return old;
end;
$$;

drop trigger if exists listings_cascade_submissions on public.listings;
create trigger listings_cascade_submissions
  before delete on public.listings
  for each row execute function public.listings_soft_delete_subs();


-- -----------------------------------------------------------------------------
-- The contributor stops seeing it; the admin does not
--
-- One policy change, and it is what makes every contributor-facing query
-- correct at once — the dashboard list, My Contributions, Recent Activity and
-- `my_contribution_stats()` all read this table through this policy, and the
-- stats function is SECURITY INVOKER precisely so it obeys it. There is no
-- second place to remember to filter.
-- -----------------------------------------------------------------------------

drop policy if exists submissions_own_read on public.submissions;

create policy submissions_own_read on public.submissions
  for select using (
    (submitted_by = auth.uid() and deleted_at is null)
    or public.is_admin()
  );

-- A contributor can no longer edit a withdrawn submission either. Without this
-- the row is invisible to them but still writable by id.
drop policy if exists submissions_own_update on public.submissions;

create policy submissions_own_update on public.submissions
  for update using (
    submitted_by = auth.uid() and status = 'pending' and deleted_at is null
  ) with check (submitted_by = auth.uid());


-- =============================================================================
-- VERIFICATION — read only
--
--   select * from public.verify_deletion_sync();
-- =============================================================================

create or replace function public.verify_deletion_sync()
returns table (check_name text, result text, detail text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  select 'deleted_at column'::text,
         case when count(*) = 1 then 'ok' else 'MISSING' end,
         'submissions.deleted_at'
    from information_schema.columns
   where table_schema = 'public' and table_name = 'submissions'
     and column_name = 'deleted_at';

  return query
  select 'cascade trigger'::text,
         case when count(*) = 1 then 'ok' else 'MISSING' end,
         'listings_cascade_submissions'
    from pg_trigger
   where tgname = 'listings_cascade_submissions' and not tgisinternal;

  return query
  select 'read policy filters deleted'::text,
         case when count(*) = 1 then 'ok' else 'NOT FILTERED' end,
         coalesce(max(qual), '(none)')
    from pg_policies
   where schemaname = 'public' and tablename = 'submissions'
     and policyname = 'submissions_own_read'
     and qual like '%deleted_at%';

  return query
  select 'orphaned approved submissions'::text,
         case when count(*) = 0 then 'ok' else 'FOUND' end,
         count(*)::text || ' approved submission(s) whose listing no longer exists'
    from public.submissions s
   where s.status = 'approved'
     and s.deleted_at is null
     and s.published_listing_id is not null
     and not exists (select 1 from public.listings l where l.id = s.published_listing_id);
end;
$$;
