-- =============================================================================
-- 0010 — deleting a contribution takes its points back
--
-- STATUS: NOT APPLIED. Additive only. Safe to run more than once.
--
-- THE DECISION THIS ENCODES
--
-- 0009 withdrew a contribution from the contributor's dashboard when an admin
-- deleted the listing it had published, and deliberately left the fifty points
-- alone — the work had been done and verified at the time, and the ledger is
-- append-only. That left a contributor reading "Total 0, Points 50", which the
-- site owner has since called wrong. Deleting a contribution now takes its
-- points back.
--
-- A COMPENSATING ENTRY, NOT A DELETION
--
-- `points_transactions` has no UPDATE and no DELETE policy, and
-- `profiles.points` is a trigger-maintained sum of it. So the reversal is a new
-- row of -50 rather than the removal of the +50, which keeps three things true:
-- the balance stays derivable from the ledger, "why do I have these points"
-- still has a complete answer, and the approval that earned them is still on
-- the record.
--
-- `apply_points_transaction()` already clamps with greatest(0, ...), so a
-- balance cannot go negative even if a reversal outruns its award.
--
-- The amount is read from the original award rather than hard-coded at 50, so
-- if the reward is ever changed the reversal still matches what was actually
-- given.
--
-- IDEMPOTENT
--
-- The insert is guarded by a NOT EXISTS on an existing 'contribution_removed'
-- row for the same submission, so re-running the trigger — or this migration —
-- cannot double-reverse. The partial unique index from 0008 only covers
-- 'submission_approved', so these rows do not collide with it.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. The trigger, extended
--
-- Same BEFORE DELETE trigger as 0009 with the reversal added. The UPDATE now
-- runs inside a data-modifying CTE so the ids it withdrew are captured in one
-- statement and the reversal can be joined against exactly those rows, rather
-- than re-querying and risking a race with a concurrent delete.
-- -----------------------------------------------------------------------------

create or replace function public.listings_soft_delete_subs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := auth.uid();
  v_email    text;
  v_ids      uuid[];
  v_count    integer;
  v_reversed integer := 0;
begin
  perform set_config('elakai.moderating', 'on', true);

  with withdrawn as (
    update public.submissions
       set deleted_at = now(),
           updated_at = now()
     where published_listing_id = old.id
       and deleted_at is null
    returning id
  )
  select array_agg(id) into v_ids from withdrawn;

  v_count := coalesce(array_length(v_ids, 1), 0);

  if v_count > 0 then
    -- Reverse each award, once, for the exact amount that was granted.
    insert into public.points_transactions
      (user_id, submission_id, points, reason, created_by)
    select s.submitted_by, s.id, -pt.points, 'contribution_removed', v_actor
      from public.submissions s
      join public.points_transactions pt
        on pt.submission_id = s.id
       and pt.reason = 'submission_approved'
     where s.id = any(v_ids)
       and not exists (
         select 1 from public.points_transactions r
          where r.submission_id = s.id
            and r.reason = 'contribution_removed'
       );

    get diagnostics v_reversed = row_count;

    select email into v_email from public.profiles where id = v_actor;

    insert into public.audit_log
      (actor_id, actor_email, action, entity, entity_id, summary, changes)
    values (v_actor, v_email, 'ADMIN_DELETED_LISTING', 'listings', old.id::text,
            format('Listing deleted; %s submission(s) withdrawn, %s points reversal(s)',
                   v_count, v_reversed),
            jsonb_build_object('listing_id', old.id,
                               'submissions_marked', v_count,
                               'points_reversed', v_reversed));
  end if;

  return old;
end;
$$;


-- -----------------------------------------------------------------------------
-- 2. Backfill
--
-- Anything already withdrawn by 0009 still carries its award. One reversal per
-- such submission, guarded by the same NOT EXISTS, so running this twice is a
-- no-op. `created_by` is null: no administrator performed this particular
-- entry, the migration did, and inventing an actor would put a false name in
-- the audit trail.
-- -----------------------------------------------------------------------------

insert into public.points_transactions
  (user_id, submission_id, points, reason, created_by)
select s.submitted_by, s.id, -pt.points, 'contribution_removed', null
  from public.submissions s
  join public.points_transactions pt
    on pt.submission_id = s.id
   and pt.reason = 'submission_approved'
 where s.deleted_at is not null
   and not exists (
     select 1 from public.points_transactions r
      where r.submission_id = s.id
        and r.reason = 'contribution_removed'
   );


-- =============================================================================
-- VERIFICATION — read only
--
--   select * from public.verify_points_reversal();
-- =============================================================================

create or replace function public.verify_points_reversal()
returns table (check_name text, result text, detail text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  select 'trigger reverses points'::text,
         case when count(*) = 1 then 'ok' else 'MISSING' end,
         'listings_soft_delete_subs mentions contribution_removed'
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = 'listings_soft_delete_subs'
     and pg_get_functiondef(p.oid) like '%contribution_removed%';

  return query
  select 'withdrawn awards reversed'::text,
         case when count(*) = 0 then 'ok' else 'UNREVERSED' end,
         count(*)::text || ' withdrawn submission(s) still holding points'
    from public.submissions s
    join public.points_transactions pt
      on pt.submission_id = s.id and pt.reason = 'submission_approved'
   where s.deleted_at is not null
     and not exists (
       select 1 from public.points_transactions r
        where r.submission_id = s.id and r.reason = 'contribution_removed');

  return query
  select 'balances match ledger'::text,
         case when count(*) = 0 then 'ok' else 'DRIFTED' end,
         count(*)::text || ' profile(s) whose points differ from their ledger sum'
    from public.profiles pr
   where pr.points <> greatest(0, coalesce(
           (select sum(points) from public.points_transactions t where t.user_id = pr.id), 0));
end;
$$;
