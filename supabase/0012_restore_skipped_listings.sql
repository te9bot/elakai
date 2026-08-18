-- =============================================================================
-- 0012 — restore the two bundled records the importer skipped
--
-- ALREADY APPLIED to the live project on 2026-08-18. Kept here because a change
-- to production data that exists only in someone's terminal history is not a
-- change anyone else can audit, reproduce on a second project, or undo.
--
-- WHAT WAS WRONG
--
-- `public.listings` held 145 rows against a bundled dataset of 147. Missing:
--
--     healthcare / Niramoy General Hospital   (bundle position 1)
--     healthcare / Amin Pharmacy              (bundle position 129)
--
-- They were never deleted. They were never inserted.
--
-- The evidence is in the shape of what is there, not in a log:
--
--   * Ids ran 5..149 with NO gaps. A deleted row leaves a hole in a serial
--     sequence; these two left none, so nothing was ever removed.
--   * `display_order` within `healthcare` ran 1..55, then 57..N. Position 0 and
--     position 56 — exactly the two slots these records own — were empty.
--   * The importer is skip-not-overwrite (see `importListings` in
--     src/lib/listings-import.ts): it reads the existing rows first and passes
--     over any whose `(section, title)` key is already present. Ids 1-4 existed
--     before the import and are gone now. Two of them evidently carried these
--     two titles, so the importer skipped the bundled copies as duplicates, and
--     when those early rows were later deleted the records went with them.
--
-- So this is an accidental absence with a mundane cause, not a deliberate
-- removal — nothing in the dataset, the admin panel or the audit log suggests
-- anyone chose to take a hospital and a pharmacy off the directory.
--
-- WHAT THIS DOES
--
-- Inserts exactly those two rows, with the values `buildImportRows()` produces
-- from the bundled dataset — the same function that produced the other 145, so
-- the phone numbers, addresses, categories and display orders are the ones they
-- would have had on the day of the import, not new ones invented now.
-- `created_at` is set to the import batch's own timestamp so they sort with
-- their cohort rather than appearing as today's additions.
--
-- SAFE TO RUN TWICE. The `where not exists` guard is the importer's own dedupe
-- key, so a second run inserts nothing. It touches no other row, updates
-- nothing, and deletes nothing.
-- =============================================================================

insert into public.listings
  (section, title, description, phone, email, address, location, category,
   price, availability, image_url, status, display_order, created_at, updated_at)
select v.*
  from (values
    (
      'healthcare',
      'Niramoy General Hospital',
      'Round-the-clock emergency, indoor and outdoor care with experienced physicians on duty.',
      '+880 1700-000-001',
      null::text,
      'Holding 72, N.S. Road, Kushtia Sadar',
      'Kushtia Sadar',
      'hospital',
      null::text,
      'Open 24 hours',
      null::text,
      'active',
      0,
      timestamptz '2026-08-15 06:59:47.97495+00',
      timestamptz '2026-08-15 06:59:47.97495+00'
    ),
    (
      'healthcare',
      'Amin Pharmacy',
      'A Kushtia pharmacy stocking prescription and general medicine.',
      '+880 1700-000-231',
      null,
      null,
      'Kushtia Sadar',
      'pharmacy',
      null,
      null,
      null,
      'active',
      56,
      timestamptz '2026-08-15 06:59:47.97495+00',
      timestamptz '2026-08-15 06:59:47.97495+00'
    )
  ) as v (section, title, description, phone, email, address, location, category,
          price, availability, image_url, status, display_order, created_at, updated_at)
 where not exists (
   select 1
     from public.listings l
    where lower(trim(l.section)) = lower(trim(v.section))
      and lower(trim(l.title))   = lower(trim(v.title))
 );

-- Verify: expect 147, and one row for each title.
select count(*) as listings from public.listings;

select id, section, title, category, display_order, status
  from public.listings
 where title in ('Niramoy General Hospital', 'Amin Pharmacy')
 order by display_order;
