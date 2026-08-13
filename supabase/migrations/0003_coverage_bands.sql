-- =============================================================================
-- ELAKAI — 0003: category_bar_items drives *both* homepage bands
--
-- `category_bar_items` was written for one strip: the hero marquee. The
-- homepage now has two, and they are the same idea at two scales —
--
--   "Covering"                  the hero strip, one track, editorial pace
--   "Everything ELAKAI covers"  the coverage band, two tracks, energetic
--
-- — so they should be one table an editor reorders, not two lists in two
-- places. Two things stood in the way:
--
--  1. `unique (category_id)` allowed a category to appear once in the whole
--     table. Both bands legitimately want Ambulance, Hospital and Pharmacy in
--     them; the constraint made that impossible to express.
--
--  2. There was no column saying which band a row belonged to.
--
-- This migration adds `band`, re-scopes the uniqueness to (band, category_id),
-- and moves the table from `active boolean` to the `record_status` enum every
-- other admin-managed table uses — which is what lets the shared admin list
-- (components/admin/resource-list.tsx) publish, unpublish and archive these
-- rows with the same controls as everything else.
--
-- Existing rows are the hero marquee, so they land in 'covering' and keep
-- their order.
--
-- The frontend needs no coordination with this: the bands measure whatever
-- they are handed, so adding, removing or reordering rows here changes the
-- loop without a deploy. See src/components/infinite-track.tsx.
-- =============================================================================

begin;

create type coverage_band as enum ('covering', 'covers');

alter table category_bar_items
  add column band coverage_band not null default 'covering';

-- Postgres named this when the constraint was declared inline in 0001, but the
-- name is an implementation detail and this migration runs against a live
-- project. Find it by shape — the unique constraint whose only column is
-- category_id — so a differently-named equivalent is still removed.
do $$
declare
  target text;
begin
  select con.conname into target
  from pg_constraint con
  where con.conrelid = 'category_bar_items'::regclass
    and con.contype = 'u'
    and con.conkey = array[
      (select attnum from pg_attribute
        where attrelid = con.conrelid and attname = 'category_id')
    ];

  if target is not null then
    execute format('alter table category_bar_items drop constraint %I', target);
  end if;
end $$;

alter table category_bar_items
  add constraint category_bar_items_band_category_key unique (band, category_id);

-- ---------------------------------------------------------------------------
-- active boolean -> status record_status
--
-- Same meaning, one more state. 'draft' is the one that was missing: an editor
-- building next month's strip needs somewhere to put a row that is neither
-- live nor deleted, and `active = false` could not tell "not ready yet" from
-- "taken down".
-- ---------------------------------------------------------------------------

alter table category_bar_items
  add column status record_status not null default 'published';

update category_bar_items
  set status = case when active then 'published'::record_status
                    else 'archived'::record_status end;

alter table category_bar_items drop column active;

-- The read policy referenced `active`, so it has to be replaced rather than
-- altered. Same shape as every other public-read policy in 0002.
drop policy if exists category_bar_public_read on category_bar_items;
create policy category_bar_public_read on category_bar_items
  for select using (status = 'published' or is_active_admin());

create index category_bar_items_band_order_idx
  on category_bar_items (band, sort_order);

comment on table category_bar_items is
  'Drives both homepage bands — "Covering" (band = covering) and "Everything '
  'ELAKAI covers" (band = covers). Reordering here reorders the public strip; '
  'the bands measure and duplicate whatever set this returns, so the loop '
  'stays seamless regardless of how many rows are published.';

comment on column category_bar_items.band is
  'Which homepage strip the row belongs to. A category may appear in both.';

commit;
