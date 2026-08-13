-- =============================================================================
-- ELAKAI — Row Level Security
--
-- The public site is a static SPA talking to Postgres directly, so these
-- policies ARE the server-side authorization layer. There is no API tier that
-- could be trusted to filter drafts out; if a policy is missing, the anon key
-- can read the table. Every table below is therefore explicitly enabled and
-- explicitly policied, including the join tables.
--
-- Two principals:
--   anon           — the public website. Read-only, published rows only.
--   active admin   — a row in admin_users with active = true. Full CRUD.
--
-- The anon key is designed to be published and is safe in the bundle. The
-- service_role key bypasses every policy here and must never reach the client.
-- =============================================================================

alter table admin_users        enable row level security;
alter table areas              enable row level security;
alter table categories         enable row level security;
alter table services           enable row level security;
alter table facilities         enable row level security;
alter table facility_services  enable row level security;
alter table doctors            enable row level security;
alter table chambers           enable row level security;
alter table doctor_facilities  enable row level security;
alter table businesses         enable row level security;
alter table business_services  enable row level security;
alter table reviews            enable row level security;
alter table rentals            enable row level security;
alter table emergency_contacts enable row level security;
alter table category_bar_items enable row level security;
alter table media              enable row level security;
alter table audit_log          enable row level security;

-- -----------------------------------------------------------------------------
-- Admin identity
-- -----------------------------------------------------------------------------

-- Readable by the owner and by admins. is_active_admin() is SECURITY DEFINER
-- precisely so this policy cannot recurse into itself.
create policy admin_users_self_read on admin_users
  for select using (id = auth.uid() or is_active_admin());

create policy admin_users_admin_write on admin_users
  for all using (is_active_admin()) with check (is_active_admin());

-- -----------------------------------------------------------------------------
-- Reference data — public, but only the active rows
-- -----------------------------------------------------------------------------

create policy areas_public_read on areas
  for select using (true);
create policy areas_admin_write on areas
  for all using (is_active_admin()) with check (is_active_admin());

create policy categories_public_read on categories
  for select using (active or is_active_admin());
create policy categories_admin_write on categories
  for all using (is_active_admin()) with check (is_active_admin());

create policy services_public_read on services
  for select using (active or is_active_admin());
create policy services_admin_write on services
  for all using (is_active_admin()) with check (is_active_admin());

create policy category_bar_public_read on category_bar_items
  for select using (active or is_active_admin());
create policy category_bar_admin_write on category_bar_items
  for all using (is_active_admin()) with check (is_active_admin());

-- -----------------------------------------------------------------------------
-- Content tables
--
-- Unpublishing is what makes a record vanish from the public site (§24): the
-- row stays, `status` changes, and this predicate stops returning it.
-- -----------------------------------------------------------------------------

create policy facilities_public_read on facilities
  for select using (status = 'published' or is_active_admin());
create policy facilities_admin_write on facilities
  for all using (is_active_admin()) with check (is_active_admin());

create policy doctors_public_read on doctors
  for select using (status = 'published' or is_active_admin());
create policy doctors_admin_write on doctors
  for all using (is_active_admin()) with check (is_active_admin());

create policy businesses_public_read on businesses
  for select using (status = 'published' or is_active_admin());
create policy businesses_admin_write on businesses
  for all using (is_active_admin()) with check (is_active_admin());

create policy rentals_public_read on rentals
  for select using (status = 'published' or is_active_admin());
create policy rentals_admin_write on rentals
  for all using (is_active_admin()) with check (is_active_admin());

create policy emergency_public_read on emergency_contacts
  for select using (status = 'published' or is_active_admin());
create policy emergency_admin_write on emergency_contacts
  for all using (is_active_admin()) with check (is_active_admin());

-- -----------------------------------------------------------------------------
-- Relations
--
-- Gated on the parent rather than left open: a join row leaks the existence of
-- an unpublished record, and "it's only ids" stops being true as soon as one of
-- those ids is a draft doctor attached to a named hospital.
-- -----------------------------------------------------------------------------

create policy chambers_public_read on chambers
  for select using (
    is_active_admin() or exists (
      select 1 from doctors d where d.id = chambers.doctor_id and d.status = 'published'
    )
  );
create policy chambers_admin_write on chambers
  for all using (is_active_admin()) with check (is_active_admin());

create policy facility_services_public_read on facility_services
  for select using (
    is_active_admin() or exists (
      select 1 from facilities f
      where f.id = facility_services.facility_id and f.status = 'published'
    )
  );
create policy facility_services_admin_write on facility_services
  for all using (is_active_admin()) with check (is_active_admin());

create policy business_services_public_read on business_services
  for select using (
    is_active_admin() or exists (
      select 1 from businesses b
      where b.id = business_services.business_id and b.status = 'published'
    )
  );
create policy business_services_admin_write on business_services
  for all using (is_active_admin()) with check (is_active_admin());

create policy doctor_facilities_public_read on doctor_facilities
  for select using (
    is_active_admin() or exists (
      select 1 from doctors d
      where d.id = doctor_facilities.doctor_id and d.status = 'published'
    )
  );
create policy doctor_facilities_admin_write on doctor_facilities
  for all using (is_active_admin()) with check (is_active_admin());

create policy reviews_public_read on reviews
  for select using (
    is_active_admin() or (
      status = 'published' and (
        (business_id is not null and exists (
          select 1 from businesses b where b.id = reviews.business_id and b.status = 'published'))
        or
        (facility_id is not null and exists (
          select 1 from facilities f where f.id = reviews.facility_id and f.status = 'published'))
      )
    )
  );
create policy reviews_admin_write on reviews
  for all using (is_active_admin()) with check (is_active_admin());

-- Media rows are public metadata pointing at a public bucket; the object itself
-- is what carries the content, and storage policies below govern that.
create policy media_public_read on media
  for select using (true);
create policy media_admin_write on media
  for all using (is_active_admin()) with check (is_active_admin());

-- -----------------------------------------------------------------------------
-- Audit log — admin-visible, append-only
-- -----------------------------------------------------------------------------

create policy audit_admin_read on audit_log
  for select using (is_active_admin());
create policy audit_admin_insert on audit_log
  for insert with check (is_active_admin());
-- Deliberately no update/delete policy: an audit trail that can be rewritten
-- by the people it audits is decoration.

-- =============================================================================
-- Storage
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'elakai-media', 'elakai-media', true, 5242880,
  array['image/jpeg','image/png','image/webp','image/avif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy media_objects_public_read on storage.objects
  for select using (bucket_id = 'elakai-media');

create policy media_objects_admin_insert on storage.objects
  for insert with check (bucket_id = 'elakai-media' and is_active_admin());

create policy media_objects_admin_update on storage.objects
  for update using (bucket_id = 'elakai-media' and is_active_admin());

create policy media_objects_admin_delete on storage.objects
  for delete using (bucket_id = 'elakai-media' and is_active_admin());
