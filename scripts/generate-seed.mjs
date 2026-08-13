/**
 * Generates `supabase/seed.sql` from the data the app already ships.
 *
 *   node scripts/generate-seed.mjs
 *
 * The existing `src/data/*.ts` modules are the source of truth for the initial
 * import — nothing here is retyped by hand, and nothing is invented. Records
 * carry their provenance across: a demonstration record arrives in Postgres
 * still marked `placeholder`, so the site keeps telling the truth about which
 * numbers have been checked and which have not.
 *
 * The output is idempotent (`on conflict do update`), so re-running it after
 * editing the source data refreshes the rows instead of duplicating them.
 * Admin-authored rows are never touched, because they have different ids.
 *
 * esbuild — already present as a Vite dependency — resolves the `@/` alias and
 * strips types so the modules can simply be imported here. No new tooling.
 */
import { build } from 'esbuild'
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/* ------------------------------------------------------------------ */
/* SQL literals                                                        */
/* ------------------------------------------------------------------ */

const NULL = 'null'

/** Quotes a string for SQL. Bengali passes through unchanged as UTF-8. */
function s(value) {
  if (value === undefined || value === null) return NULL
  return `'${String(value).replace(/'/g, "''")}'`
}

function num(value) {
  if (value === undefined || value === null || Number.isNaN(value)) return NULL
  return String(value)
}

function bool(value) {
  return value ? 'true' : 'false'
}

function arr(values) {
  if (!values?.length) return `'{}'`
  // array[...]::text[] rather than a brace literal: it needs no extra escaping
  // layer, which matters for keywords containing commas or quotes.
  return `array[${values.map(s).join(',')}]::text[]`
}

function json(value) {
  if (value === undefined || value === null) return NULL
  return `${s(JSON.stringify(value))}::jsonb`
}

/** Localized -> [bn, en]. Tolerates a plain string on either side. */
function loc(value) {
  if (value === undefined || value === null) return [NULL, NULL]
  if (typeof value === 'string') return [s(value), s(value)]
  return [s(value.bn), s(value.en)]
}

function row(values) {
  return `  (${values.join(', ')})`
}

/**
 * Builds an idempotent multi-row upsert. `update` lists the columns that get
 * refreshed on conflict — deliberately not every column, so admin-managed
 * fields such as `status` and `featured` survive a re-seed.
 */
function upsert(table, columns, rows, conflict, update) {
  if (!rows.length) return `-- ${table}: nothing to seed\n`
  const set = update.map((c) => `"${c}" = excluded."${c}"`).join(',\n    ')
  return (
    `insert into ${table} (${columns.map((c) => `"${c}"`).join(', ')}) values\n` +
    rows.join(',\n') +
    `\non conflict (${conflict}) do update set\n    ${set};\n`
  )
}

/* ------------------------------------------------------------------ */
/* Load the app's data modules                                         */
/* ------------------------------------------------------------------ */

async function loadData() {
  const dir = await mkdtemp(path.join(tmpdir(), 'elakai-seed-'))
  const entry = path.join(dir, 'entry.mjs')
  const out = path.join(dir, 'bundle.mjs')

  await writeFile(
    entry,
    `export { AREAS, CATEGORIES } from '@/data/categories'
     export { FALLBACK_COVERAGE } from '@/data/coverage'
     export { BUSINESSES } from '@/data/businesses'
     export { RENTALS } from '@/data/rentals'
     export { EMERGENCY_CONTACTS } from '@/data/emergency'
     export { HEALTH_FACILITIES, HEALTH_DOCTORS } from '@/data/healthcare'`,
    'utf8',
  )

  await build({
    entryPoints: [entry],
    outfile: out,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node18',
    logLevel: 'silent',
    alias: { '@': path.join(root, 'src') },
  })

  const mod = await import(pathToFileURL(out).href)
  const data = { ...mod }
  await rm(dir, { recursive: true, force: true })
  return data
}

/* ------------------------------------------------------------------ */
/* Section builders                                                    */
/* ------------------------------------------------------------------ */

function areasSql(AREAS) {
  const rows = AREAS.map((a, i) => {
    const [bn, en] = loc(a.name)
    return row([s(a.id), bn, en, en, s('Kushtia'), num(a.coords.lat), num(a.coords.lng), num(i)])
  })
  return upsert(
    'areas',
    ['id', 'name_bn', 'name_en', 'upazila_en', 'district', 'lat', 'lng', 'sort_order'],
    rows,
    'id',
    ['name_bn', 'name_en', 'upazila_en', 'lat', 'lng', 'sort_order'],
  )
}

function categoriesSql(CATEGORIES) {
  const rows = CATEGORIES.map((c, i) => {
    const [bn, en] = loc(c.name)
    return row([s(c.id), s(c.group), bn, en, s(c.emoji), s(c.icon), arr(c.keywords), 'true', num(i)])
  })
  return upsert(
    'categories',
    ['id', 'group', 'name_bn', 'name_en', 'emoji', 'icon', 'keywords', 'active', 'sort_order'],
    rows,
    'id',
    ['group', 'name_bn', 'name_en', 'emoji', 'icon', 'keywords'],
  )
}

/**
 * Both homepage bands, in the order the app currently declares (§32).
 *
 * One table, split on `band` — see supabase/migrations/0003_coverage_bands.sql.
 * The conflict target is `(band, category_id)` because a category legitimately
 * appears in both strips, and `status` is deliberately *not* in the update list:
 * re-seeding must never republish a chip an editor took down.
 */
function categoryBarSql(FALLBACK_COVERAGE) {
  const rows = Object.entries(FALLBACK_COVERAGE).flatMap(([band, ids]) =>
    ids.map((id, i) =>
      row([s(id), s(band), NULL, NULL, s(`/search?cat=${id}`), num(i), s('published')]),
    ),
  )
  return upsert(
    'category_bar_items',
    ['category_id', 'band', 'label_bn', 'label_en', 'target_path', 'sort_order', 'status'],
    rows,
    'band, category_id',
    ['target_path', 'sort_order'],
  )
}

function emergencySql(CONTACTS) {
  const rows = CONTACTS.map((c, i) => {
    const [nameBn, nameEn] = loc(c.name)
    const [shortBn, shortEn] = loc(c.short)
    const [descBn, descEn] = loc(c.description)
    const [addrBn, addrEn] = loc(c.address)
    return row([
      s(c.id), nameBn, nameEn, shortBn, shortEn, descBn, descEn,
      s(c.phone), s(c.icon), s(c.scope), s(c.tone), bool(c.available24),
      addrBn, addrEn, num(c.coords?.lat), num(c.coords?.lng),
      num(i), s('published'),
    ])
  })
  return upsert(
    'emergency_contacts',
    ['id', 'name_bn', 'name_en', 'short_bn', 'short_en', 'description_bn', 'description_en',
     'phone', 'icon', 'scope', 'tone', 'available_24', 'address_bn', 'address_en',
     'lat', 'lng', 'priority', 'status'],
    rows,
    'id',
    ['name_bn', 'name_en', 'short_bn', 'short_en', 'description_bn', 'description_en',
     'phone', 'icon', 'scope', 'tone', 'available_24'],
  )
}

function businessesSql(BUSINESSES) {
  const rows = BUSINESSES.map((b) => {
    const [nameBn, nameEn] = loc(b.name)
    const [descBn, descEn] = loc(b.description)
    const [addrBn, addrEn] = loc(b.address)
    const always = b.hours === 'always'
    return row([
      s(b.slug), s(b.category), s(b.group), nameBn, nameEn, descBn, descEn,
      s(b.phone), s(b.website), addrBn, addrEn, s(b.area),
      num(b.coords?.lat), num(b.coords?.lng),
      always ? NULL : json(b.hours), bool(always),
      num(b.rating), num(b.reviewCount), bool(b.verified),
      num(b.imageSeed ?? 0), num(b.photoCount ?? 0),
      s('published'), bool(b.featured),
      b.updatedAt ? `${s(b.updatedAt)}::timestamptz` : 'now()',
    ])
  })
  return upsert(
    'businesses',
    ['slug', 'category', 'group', 'name_bn', 'name_en', 'description_bn', 'description_en',
     'phone', 'website', 'address_bn', 'address_en', 'area_id', 'lat', 'lng',
     'hours', 'always_open', 'rating', 'review_count', 'verified',
     'image_seed', 'photo_count', 'status', 'featured', 'updated_at'],
    rows,
    'slug',
    ['category', 'group', 'name_bn', 'name_en', 'description_bn', 'description_en',
     'phone', 'website', 'address_bn', 'address_en', 'area_id', 'lat', 'lng',
     'hours', 'always_open', 'rating', 'review_count', 'verified',
     'image_seed', 'photo_count'],
  )
}

/**
 * Business services are category-derived in the source data (every electrician
 * carries the same list), but an admin needs to edit them per business — so
 * they land in the same shared catalogue as the healthcare ones and link
 * through `business_services`.
 */
function businessServicesSql(BUSINESSES) {
  const catalogue = new Map()
  const links = []

  for (const b of BUSINESSES) {
    ;(b.services ?? []).forEach((v, i) => {
      const [bn, en] = loc(v)
      if (en === NULL) return
      const key = `service::${en}`
      if (!catalogue.has(key)) catalogue.set(key, { bn, en })
      links.push({ slug: b.slug, en, order: i })
    })
  }

  if (!links.length) return '-- business services: nothing to seed\n'

  const catalogueSql = upsert(
    'services',
    ['kind', 'name_bn', 'name_en', 'active'],
    [...catalogue.values()].map((e) => row([s('service'), e.bn, e.en, 'true'])),
    'kind, name_en',
    ['name_bn', 'active'],
  )

  return (
    catalogueSql +
    `
insert into business_services (business_id, service_id, sort_order)
select b.id, sv.id, v.sort_order
from (values
${links.map((l) => `    (${s(l.slug)}, ${l.en}, ${num(l.order)})`).join(',\n')}
) as v(business_slug, name_en, sort_order)
join businesses b on b.slug = v.business_slug
join services  sv on sv.kind = 'service' and sv.name_en = v.name_en
on conflict (business_id, service_id) do update set sort_order = excluded.sort_order;
`
  )
}

/** Demo reviews travel with their listing so ratings stay explicable. */
function reviewsSql(BUSINESSES) {
  const rows = []
  for (const b of BUSINESSES) {
    for (const r of b.reviews ?? []) {
      const [authorBn, authorEn] = loc(r.author)
      const [commentBn, commentEn] = loc(r.comment)
      rows.push({ slug: b.slug, id: r.id, authorBn, authorEn, commentBn, commentEn, rating: r.rating, date: r.date })
    }
  }
  if (!rows.length) return '-- reviews: nothing to seed\n'

  // No natural key, so the seeded set is replaced wholesale per listing.
  return `
delete from reviews where business_id in (
  select id from businesses where slug in (${[...new Set(rows.map((r) => s(r.slug)))].join(', ')})
);

insert into reviews (business_id, author_bn, author_en, rating, comment_bn, comment_en, reviewed_on, status)
select b.id, v.author_bn, v.author_en, v.rating, v.comment_bn, v.comment_en, v.reviewed_on, 'published'
from (values
${rows
  .map(
    (r) =>
      `    (${s(r.slug)}, ${r.authorBn}, ${r.authorEn}, ${num(r.rating)}, ` +
      `${r.commentBn}, ${r.commentEn}, ${r.date ? `${s(r.date)}::date` : NULL})`,
  )
  .join(',\n')}
) as v(business_slug, author_bn, author_en, rating, comment_bn, comment_en, reviewed_on)
join businesses b on b.slug = v.business_slug;
`
}

function rentalsSql(RENTALS) {
  const rows = RENTALS.map((r) => {
    const [titleBn, titleEn] = loc(r.title)
    const [descBn, descEn] = loc(r.description)
    const [addrBn, addrEn] = loc(r.address)
    return row([
      s(r.slug), s(r.category), titleBn, titleEn, descBn, descEn,
      num(r.rent), num(r.bedrooms), num(r.bathrooms), num(r.sizeSqft), num(r.floor),
      s(r.tenantType), bool(r.furnished),
      addrBn, addrEn, s(r.area), num(r.coords?.lat), num(r.coords?.lng),
      s(r.phone), r.availableFrom ? `${s(r.availableFrom)}::date` : NULL,
      num(r.imageSeed ?? 0), bool(r.verified), s('published'),
      r.updatedAt ? `${s(r.updatedAt)}::timestamptz` : 'now()',
    ])
  })
  return upsert(
    'rentals',
    ['slug', 'category', 'title_bn', 'title_en', 'description_bn', 'description_en',
     'rent', 'bedrooms', 'bathrooms', 'size_sqft', 'floor', 'tenant_type', 'furnished',
     'address_bn', 'address_en', 'area_id', 'lat', 'lng',
     'owner_phone', 'available_from', 'image_seed', 'verified', 'status', 'updated_at'],
    rows,
    'slug',
    ['category', 'title_bn', 'title_en', 'description_bn', 'description_en',
     'rent', 'bedrooms', 'bathrooms', 'size_sqft', 'floor', 'tenant_type', 'furnished',
     'address_bn', 'address_en', 'area_id', 'lat', 'lng', 'owner_phone',
     'available_from', 'image_seed', 'verified'],
  )
}

function facilitiesSql(FACILITIES) {
  const rows = FACILITIES.map((f) => {
    const [nameBn, nameEn] = loc(f.name)
    const [descBn, descEn] = loc(f.description)
    const [addrBn, addrEn] = loc(f.address)
    const [noteBn, noteEn] = loc(f.source?.note)
    const always = f.hours === 'always'
    const c = f.contact ?? {}
    // Provenance decides the confidence label — a record whose only source is
    // a demonstration placeholder must never present as verified (§68).
    const verification =
      f.source?.kind === 'placeholder' ? 'unverified'
        : f.source?.verifiedAt ? 'verified'
        : 'partial'
    return row([
      s(f.slug), s(f.category), nameBn, nameEn, arr(f.aliases), descBn, descEn,
      addrBn, addrEn, s(f.area), num(f.coords?.lat), num(f.coords?.lng), bool(!f.coords),
      s(c.phone), s(c.appointmentPhone), s(c.emergencyPhone), s(c.email), s(c.website), s(c.facebook),
      always ? NULL : json(f.hours), bool(always), bool(f.emergency24),
      num(f.rating), num(f.reviewCount),
      s(verification), s(f.source?.kind ?? 'placeholder'), s(f.source?.url), noteBn, noteEn,
      f.source?.verifiedAt ? `${s(f.source.verifiedAt)}::date` : NULL,
      s('published'), bool(f.featured),
    ])
  })
  return upsert(
    'facilities',
    ['slug', 'category', 'name_bn', 'name_en', 'aliases', 'description_bn', 'description_en',
     'address_bn', 'address_en', 'area_id', 'lat', 'lng', 'coords_approx',
     'phone', 'appointment_phone', 'emergency_phone', 'email', 'website', 'facebook',
     'hours', 'always_open', 'emergency_24', 'rating', 'review_count',
     'verification', 'source_kind', 'source_url', 'source_note_bn', 'source_note_en',
     'source_verified_at', 'status', 'featured'],
    rows,
    'slug',
    ['category', 'name_bn', 'name_en', 'aliases', 'description_bn', 'description_en',
     'address_bn', 'address_en', 'area_id', 'lat', 'lng', 'coords_approx',
     'phone', 'appointment_phone', 'emergency_phone', 'email', 'website', 'facebook',
     'hours', 'always_open', 'emergency_24', 'rating', 'review_count',
     'verification', 'source_kind', 'source_url', 'source_verified_at'],
  )
}

function doctorsSql(DOCTORS) {
  const rows = DOCTORS.map((d) => {
    const [nameBn, nameEn] = loc(d.name)
    const [specBn, specEn] = loc(d.specialty)
    const [desigBn, desigEn] = loc(d.designation)
    const [noteBn, noteEn] = loc(d.source?.note)
    const c = d.contact ?? {}
    const verification =
      d.source?.kind === 'placeholder' ? 'unverified'
        : d.source?.verifiedAt ? 'verified'
        : 'partial'
    return row([
      s(d.slug), nameBn, nameEn, arr(d.aliases), arr(d.qualifications),
      specBn, specEn, desigBn, desigEn,
      s(c.phone), s(c.appointmentPhone), s(c.email), s(c.website), s(c.facebook),
      s(d.area),
      s(verification), s(d.source?.kind ?? 'placeholder'), s(d.source?.url), noteBn, noteEn,
      d.source?.verifiedAt ? `${s(d.source.verifiedAt)}::date` : NULL,
      s('published'), bool(d.featured),
    ])
  })
  return upsert(
    'doctors',
    ['slug', 'name_bn', 'name_en', 'aliases', 'qualifications',
     'specialty_bn', 'specialty_en', 'designation_bn', 'designation_en',
     'phone', 'appointment_phone', 'email', 'website', 'facebook', 'area_id',
     'verification', 'source_kind', 'source_url', 'source_note_bn', 'source_note_en',
     'source_verified_at', 'status', 'featured'],
    rows,
    'slug',
    ['name_bn', 'name_en', 'aliases', 'qualifications',
     'specialty_bn', 'specialty_en', 'designation_bn', 'designation_en',
     'phone', 'appointment_phone', 'email', 'website', 'facebook', 'area_id',
     'verification', 'source_kind', 'source_url', 'source_verified_at'],
  )
}

/**
 * Services / departments / tests become one deduplicated catalogue (§28), and
 * facilities reference it (§29) instead of repeating "Ultrasound" as free text
 * on every record. Keyed on (kind, name_en), which is the table's unique key.
 */
function servicesSql(FACILITIES) {
  const catalogue = new Map()
  const links = []

  const add = (kind, value, slug, order) => {
    const [bn, en] = loc(value)
    if (en === NULL) return
    const key = `${kind}::${en}`
    if (!catalogue.has(key)) catalogue.set(key, { kind, bn, en })
    links.push({ slug, key, kind, en, order })
  }

  for (const f of FACILITIES) {
    f.services?.forEach((v, i) => add('service', v, f.slug, i))
    f.departments?.forEach((v, i) => add('department', v, f.slug, i))
    f.tests?.forEach((v, i) => add('test', v, f.slug, i))
  }

  const entries = [...catalogue.values()]
  const catalogueSql = upsert(
    'services',
    ['kind', 'name_bn', 'name_en', 'active'],
    entries.map((e, i) => row([s(e.kind), e.bn, e.en, 'true'])),
    'kind, name_en',
    ['name_bn', 'active'],
  )

  if (!links.length) return catalogueSql

  // Resolved by lookup rather than by generated uuid, so the join survives a
  // re-seed without depending on insertion order.
  const linkRows = links
    .map((l) => `    (${s(l.slug)}, ${s(l.kind)}, ${l.en}, ${num(l.order)})`)
    .join(',\n')

  return (
    catalogueSql +
    `
insert into facility_services (facility_id, service_id, sort_order)
select f.id, sv.id, v.sort_order
from (values
${linkRows}
) as v(facility_slug, kind, name_en, sort_order)
join facilities f on f.slug = v.facility_slug
join services  sv on sv.kind = v.kind::service_kind and sv.name_en = v.name_en
on conflict (facility_id, service_id) do update set sort_order = excluded.sort_order;
`
  )
}

/** Doctor -> facility affiliations and chambers (§27). */
function chambersSql(DOCTORS, FACILITIES) {
  const bySlug = new Map(FACILITIES.map((f) => [f.id, f.slug]))
  const affiliations = []
  const chambers = []

  for (const d of DOCTORS) {
    for (const fid of d.facilityIds ?? []) {
      const slug = bySlug.get(fid)
      if (slug) affiliations.push({ doctor: d.slug, facility: slug })
    }
    ;(d.chambers ?? []).forEach((ch, i) => {
      const [placeBn, placeEn] = loc(ch.place)
      const [hoursBn, hoursEn] = loc(ch.hours)
      chambers.push({
        doctor: d.slug,
        facility: ch.facilityId ? bySlug.get(ch.facilityId) : null,
        placeBn, placeEn, hoursBn, hoursEn,
        area: ch.area, phone: ch.phone, order: i,
      })
    })
  }

  let sql = ''

  if (affiliations.length) {
    sql += `
insert into doctor_facilities (doctor_id, facility_id)
select d.id, f.id
from (values
${affiliations.map((a) => `    (${s(a.doctor)}, ${s(a.facility)})`).join(',\n')}
) as v(doctor_slug, facility_slug)
join doctors    d on d.slug = v.doctor_slug
join facilities f on f.slug = v.facility_slug
on conflict do nothing;
`
  }

  if (chambers.length) {
    // Chambers have no natural key, so a re-seed replaces the seeded set for
    // each doctor rather than accumulating duplicates. Admin-created chambers
    // for doctors not in this file are untouched.
    sql += `
delete from chambers
where doctor_id in (
  select id from doctors where slug in (${[...new Set(chambers.map((c) => s(c.doctor)))].join(', ')})
);

insert into chambers (doctor_id, facility_id, place_bn, place_en,
                      area_id, visiting_hours_bn, visiting_hours_en,
                      appointment_phone, sort_order)
select d.id, f.id, v.place_bn, v.place_en, v.area_id,
       v.hours_bn, v.hours_en, v.phone, v.sort_order
from (values
${chambers
  .map((c) =>
    `    (${s(c.doctor)}, ${s(c.facility)}, ${c.placeBn}, ${c.placeEn}, ${s(c.area)}, ` +
    `${c.hoursBn}, ${c.hoursEn}, ${s(c.phone)}, ${num(c.order)})`,
  )
  .join(',\n')}
) as v(doctor_slug, facility_slug, place_bn, place_en, area_id,
       hours_bn, hours_en, phone, sort_order)
join doctors d on d.slug = v.doctor_slug
left join facilities f on f.slug = v.facility_slug;
`
  }

  return sql
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

const d = await loadData()

const sections = [
  ['areas', areasSql(d.AREAS)],
  ['categories', categoriesSql(d.CATEGORIES)],
  ['category bar (homepage bands)', categoryBarSql(d.FALLBACK_COVERAGE)],
  ['emergency contacts', emergencySql(d.EMERGENCY_CONTACTS)],
  ['local services', businessesSql(d.BUSINESSES)],
  ['local service catalogue + links', businessServicesSql(d.BUSINESSES)],
  ['reviews', reviewsSql(d.BUSINESSES)],
  ['rentals', rentalsSql(d.RENTALS)],
  ['healthcare facilities', facilitiesSql(d.HEALTH_FACILITIES)],
  ['doctors', doctorsSql(d.HEALTH_DOCTORS)],
  ['service catalogue + facility links', servicesSql(d.HEALTH_FACILITIES)],
  ['doctor affiliations + chambers', chambersSql(d.HEALTH_DOCTORS, d.HEALTH_FACILITIES)],
]

const header = `-- =============================================================================
-- ELAKAI — seed data
--
-- GENERATED FILE. Do not edit by hand.
--   Regenerate with:  node scripts/generate-seed.mjs
--   Source of truth:  src/data/*.ts
--
-- Idempotent: re-running refreshes the seeded rows in place. Columns an admin
-- is expected to own — status, featured, and anything they typed — are left
-- alone on conflict, so re-seeding never silently republishes something that
-- was deliberately taken down.
--
-- Records keep the provenance they arrived with. Anything sourced from a
-- demonstration placeholder lands as verification = 'unverified'.
-- =============================================================================

begin;

`

const body = sections
  .map(([label, sql]) => `-- ---------- ${label} ----------\n${sql}`)
  .join('\n')

await mkdir(path.join(root, 'supabase'), { recursive: true })
await writeFile(path.join(root, 'supabase', 'seed.sql'), header + body + '\ncommit;\n', 'utf8')

const counts = {
  areas: d.AREAS.length,
  categories: d.CATEGORIES.length,
  emergency: d.EMERGENCY_CONTACTS.length,
  businesses: d.BUSINESSES.length,
  rentals: d.RENTALS.length,
  facilities: d.HEALTH_FACILITIES.length,
  doctors: d.HEALTH_DOCTORS.length,
}
console.log('wrote supabase/seed.sql')
for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(12)} ${v}`)
