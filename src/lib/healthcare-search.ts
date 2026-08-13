import { AREA_MAP, CATEGORY_MAP } from '@/data/categories'
import { HEALTH_RECORDS } from '@/data/healthcare'
import type {
  Doctor,
  HealthCategoryId,
  HealthFacility,
  HealthRecord,
} from '@/data/healthcare-types'
import type { AreaId, Localized } from '@/data/types'

/* ==========================================================================
 * Healthcare directory — search, filter and lookup.
 *
 * This module is the healthcare section's data seam: nothing in the UI reads
 * `src/data/healthcare.ts` directly, so swapping the dataset for a fetch later
 * touches this file only.
 *
 * Unlike the main business search, this runs synchronously. The dataset is a
 * few dozen records, the whole index is built once at module load, and a query
 * scan costs well under a millisecond — routing it through a promise would add
 * latency to the one interaction the brief says must feel instant.
 * ========================================================================== */

/* ------------------------------------------------------------------ */
/* Tokenising                                                          */
/* ------------------------------------------------------------------ */

/**
 * `\p{M}` is essential, not optional: Bengali vowel signs and the hasanta are
 * combining marks. Dropping them collapses every Bangla word to a consonant
 * skeleton, which then fuzzy-matches unrelated words.
 */
function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function digitsOf(s: string): string {
  return s.replace(/\D/g, '')
}

/* ------------------------------------------------------------------ */
/* Index                                                               */
/* ------------------------------------------------------------------ */

/**
 * Tokens live in tiers rather than one flat bag, because *where* a word matched
 * changes what the user meant. "Cardiology" as a doctor's specialty is a
 * stronger signal than the same word buried in a hospital's department list.
 */
type Tier = { tokens: Set<string>; weight: number }

type Entry = {
  record: HealthRecord
  tiers: Tier[]
  /** Lowercased full names, for the "starts with the query" shortcut. */
  names: string[]
  /** Every searchable string joined — powers the multi-word substring check. */
  haystack: string
  allTokens: Set<string>
  digits: string
}

const FIELD = {
  name: 1,
  alias: 0.95,
  specialty: 0.92,
  category: 0.9,
  keywords: 0.82,
  service: 0.72,
  test: 0.72,
  department: 0.72,
  qualification: 0.6,
  linked: 0.55,
  area: 0.5,
  description: 0.35,
} as const

function loc(...values: (Localized | undefined)[]): string[] {
  return values.flatMap((v) => (v ? [v.bn, v.en] : []))
}

// `byId` is threaded in rather than read from a module constant because the
// cross-links below (a doctor's hospitals, a hospital's doctors) have to
// resolve against the *same* corpus the entry belongs to — otherwise a
// backend-loaded record would look its neighbours up in the bundled data.
function buildEntry(record: HealthRecord, byId: Record<string, HealthRecord>): Entry {
  const cat = CATEGORY_MAP[record.category]
  const area = AREA_MAP[record.area]

  const parts: { weight: number; text: string[] }[] = [
    { weight: FIELD.name, text: loc(record.name) },
    { weight: FIELD.alias, text: record.aliases ?? [] },
    { weight: FIELD.category, text: loc(cat.name) },
    { weight: FIELD.keywords, text: cat.keywords },
    { weight: FIELD.area, text: loc(area?.name) },
  ]

  if (record.kind === 'facility') {
    parts.push(
      { weight: FIELD.service, text: loc(...(record.services ?? [])) },
      { weight: FIELD.department, text: loc(...(record.departments ?? [])) },
      { weight: FIELD.test, text: loc(...(record.tests ?? [])) },
      { weight: FIELD.area, text: loc(record.address) },
      { weight: FIELD.description, text: loc(record.description) },
      // Searching a doctor's name should surface the hospital they sit in.
      {
        weight: FIELD.linked,
        text: (record.doctorIds ?? []).flatMap((id) => {
          const d = byId[id]
          return d ? loc(d.name) : []
        }),
      },
    )
  } else {
    parts.push(
      { weight: FIELD.specialty, text: loc(record.specialty, record.designation) },
      { weight: FIELD.qualification, text: record.qualifications },
      {
        weight: FIELD.linked,
        text: [
          ...(record.facilityIds ?? []).flatMap((id) => {
            const f = byId[id]
            return f ? loc(f.name) : []
          }),
          ...loc(...(record.chambers ?? []).map((c) => c.place)),
        ],
      },
      { weight: FIELD.area, text: (record.chambers ?? []).map((c) => AREA_MAP[c.area]?.name.en ?? '') },
    )
  }

  const tiers: Tier[] = parts.map((p) => ({
    tokens: new Set(tokenize(p.text.join(' '))),
    weight: p.weight,
  }))

  const allTokens = new Set<string>()
  for (const t of tiers) for (const tok of t.tokens) allTokens.add(tok)

  const haystack = parts
    .flatMap((p) => p.text)
    .join(' ')
    .toLowerCase()

  const phones =
    record.kind === 'facility'
      ? Object.values(record.contact)
      : [
          ...Object.values(record.contact ?? {}),
          ...(record.chambers ?? []).map((c) => c.phone ?? ''),
        ]

  return {
    record,
    tiers,
    names: loc(record.name).map((s) => s.toLowerCase()),
    haystack,
    allTokens,
    digits: digitsOf(phones.join(' ')),
  }
}

/* ------------------------------------------------------------------ */
/* Corpus                                                              */
/* ------------------------------------------------------------------ */

/**
 * Everything below reads the healthcare dataset through this one structure,
 * so swapping the bundled records for backend ones is a single assignment
 * rather than a rewrite of ten lookup functions.
 *
 * Seeded from the bundled data so the section renders without a backend, and
 * replaced by `setHealthCorpus` once the live records land.
 */
type Corpus = {
  records: HealthRecord[]
  facilities: HealthFacility[]
  doctors: Doctor[]
  bySlug: Record<string, HealthRecord>
  byId: Record<string, HealthRecord>
  index: Entry[]
}

function buildCorpus(records: HealthRecord[]): Corpus {
  // Maps first: the index needs them to resolve cross-links while it builds.
  const byId = Object.fromEntries(records.map((r) => [r.id, r]))
  const bySlug = Object.fromEntries(records.map((r) => [r.slug, r]))

  return {
    records,
    facilities: records.filter((r): r is HealthFacility => r.kind === 'facility'),
    doctors: records.filter((r): r is Doctor => r.kind === 'doctor'),
    byId,
    bySlug,
    index: records.map((r) => buildEntry(r, byId)),
  }
}

let corpus: Corpus = buildCorpus(HEALTH_RECORDS)

export function setHealthCorpus(records: HealthRecord[]): void {
  corpus = buildCorpus(records)
}

/* ------------------------------------------------------------------ */
/* Relevance                                                           */
/* ------------------------------------------------------------------ */

/** Levenshtein capped at 1 — enough for a single typo, cheap to compute. */
function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  let j = 0
  let edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++
      j++
      continue
    }
    if (++edits > 1) return false
    if (a.length > b.length) i++
    else if (a.length < b.length) j++
    else {
      i++
      j++
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1
}

/**
 * 0–1 relevance for one query against one entry.
 * Exact token > prefix > substring > single-typo fuzzy, scaled by which field
 * the hit landed in.
 */
function relevanceOf(entry: Entry, queryTokens: string[], raw: string): number {
  if (queryTokens.length === 0) return 0

  // Whole-query hits on the name are the strongest signal there is, so
  // "sono" pins Sono Hospital and "sono diagnostic" pins Sono Diagnostic.
  for (const name of entry.names) {
    if (name === raw) return 1
    if (name.startsWith(raw)) return 0.98
  }
  if (raw.length >= 3 && entry.haystack.includes(raw)) {
    // A multi-word phrase found intact is worth more than its tokens apart.
    if (raw.includes(' ')) return 0.9
  }

  const rawDigits = digitsOf(raw)
  if (rawDigits.length >= 4 && entry.digits.includes(rawDigits)) return 0.9

  let total = 0
  for (const q of queryTokens) {
    let best = 0

    for (const { tokens, weight } of entry.tiers) {
      let local = 0
      for (const t of tokens) {
        if (t === q) {
          local = 1
          break
        }
        // "cardio" → "cardiology"; "cardiologist" → "cardiology" needs both
        // directions, hence the second startsWith.
        if (t.startsWith(q)) local = Math.max(local, 0.86)
        else if (q.length >= 4 && q.startsWith(t) && t.length >= 4) local = Math.max(local, 0.7)
        else if (q.length >= 3 && t.includes(q)) local = Math.max(local, 0.62)
        else if (q.length >= 4 && withinOneEdit(t, q)) local = Math.max(local, 0.45)
      }
      best = Math.max(best, local * weight)
    }
    total += best
  }

  const avg = total / queryTokens.length

  // Reward matching every token rather than just one of several.
  const covered = queryTokens.filter((q) =>
    [...entry.allTokens].some((t) => t.startsWith(q) || (q.length >= 4 && q.startsWith(t))),
  ).length
  const coverage = (covered / queryTokens.length) * 0.16

  return Math.min(1, avg * 0.86 + coverage)
}

/* ------------------------------------------------------------------ */
/* Public search API                                                   */
/* ------------------------------------------------------------------ */

export type HealthFilters = {
  area?: AreaId | null
  /** Matches a department (facility) or a specialty (doctor), by English label. */
  specialty?: string | null
  /** Matches a service or a diagnostic test, by English label. */
  service?: string | null
  openNow?: boolean
}

export type HealthQuery = HealthFilters & {
  query?: string
  category?: HealthCategoryId | null
  limit?: number
}

export type HealthResult = {
  record: HealthRecord
  score: number
}

/** Relevance floor. Below this a "match" is noise, and an empty state is kinder. */
const MIN_RELEVANCE = 0.32

function facilityHasSpecialty(f: HealthFacility, specialty: string): boolean {
  return (f.departments ?? []).some((d) => d.en === specialty)
}

function facilityHasService(f: HealthFacility, service: string): boolean {
  return (
    (f.services ?? []).some((s) => s.en === service) ||
    (f.tests ?? []).some((t) => t.en === service)
  )
}

export function matchesHealthFilters(record: HealthRecord, filters: HealthFilters): boolean {
  const { area, specialty, service } = filters

  if (area) {
    const areas =
      record.kind === 'doctor'
        ? [record.area, ...(record.chambers ?? []).map((c) => c.area)]
        : [record.area]
    if (!areas.includes(area)) return false
  }

  if (specialty) {
    if (record.kind === 'doctor') {
      if (record.specialty.en !== specialty) return false
    } else if (!facilityHasSpecialty(record, specialty)) return false
  }

  if (service) {
    if (record.kind === 'doctor') return false
    if (!facilityHasService(record, service)) return false
  }

  return true
}

export function searchHealthcare(options: HealthQuery = {}): HealthResult[] {
  const { query = '', category = null, limit, ...filters } = options

  const raw = query.trim().toLowerCase()
  const tokens = tokenize(raw)
  const hasQuery = tokens.length > 0

  const out: HealthResult[] = []

  for (const entry of corpus.index) {
    const record = entry.record
    if (category && record.category !== category) continue
    if (!matchesHealthFilters(record, filters)) continue

    let score = 0
    if (hasQuery) {
      const relevance = relevanceOf(entry, tokens, raw)
      if (relevance < MIN_RELEVANCE) continue
      score = relevance
    } else {
      // No query: sourced records first, then featured, then alphabetical —
      // a stable order that never depends on array position.
      score =
        (record.source.kind === 'placeholder' ? 0 : 0.2) + (record.featured ? 0.1 : 0)
    }

    out.push({ record, score })
  }

  out.sort(
    (a, z) =>
      z.score - a.score ||
      Number(a.record.source.kind === 'placeholder') -
        Number(z.record.source.kind === 'placeholder') ||
      a.record.name.en.localeCompare(z.record.name.en),
  )

  return limit ? out.slice(0, limit) : out
}

/* ------------------------------------------------------------------ */
/* Filter options                                                      */
/*                                                                     */
/* Derived from the data, never hardcoded — adding a facility with a    */
/* new department makes that department filterable with no UI change.  */
/* ------------------------------------------------------------------ */

export type FilterOption = { value: string; label: Localized; count: number }

export type FilterGroups = {
  areas: FilterOption[]
  specialties: FilterOption[]
  services: FilterOption[]
}

function tally(items: { value: string; label: Localized }[]): FilterOption[] {
  const map = new Map<string, FilterOption>()
  for (const { value, label } of items) {
    const hit = map.get(value)
    if (hit) hit.count += 1
    else map.set(value, { value, label, count: 1 })
  }
  return [...map.values()].sort((a, z) => z.count - a.count || a.value.localeCompare(z.value))
}

/**
 * Only the filters that mean something for the selected category, and only the
 * values that actually occur in it. Doctors have no service list, so they get
 * specialties and areas alone.
 *
 * `candidates` narrows the counts to what the current query actually returned —
 * a chip reading "Kushtia Sadar 40" beside four results is a lie about the
 * list the user is looking at. Pass the query result *before* filters are
 * applied, so selecting one chip does not make the others vanish.
 */
export function filterOptionsFor(
  category: HealthCategoryId | null,
  candidates?: HealthRecord[],
): FilterGroups {
  const pool = (candidates ?? corpus.records).filter((r) => !category || r.category === category)

  const areas = tally(
    pool.flatMap((r) => {
      const ids =
        r.kind === 'doctor' ? [r.area, ...(r.chambers ?? []).map((c) => c.area)] : [r.area]
      return [...new Set(ids)].flatMap((id) => {
        const area = AREA_MAP[id]
        return area ? [{ value: id as string, label: area.name }] : []
      })
    }),
  )

  const specialties = tally(
    pool.flatMap((r) =>
      r.kind === 'doctor'
        ? [{ value: r.specialty.en, label: r.specialty }]
        : (r.departments ?? []).map((d) => ({ value: d.en, label: d })),
    ),
  )

  const services = tally(
    pool.flatMap((r) =>
      r.kind === 'doctor'
        ? []
        : [...(r.services ?? []), ...(r.tests ?? [])].map((s) => ({ value: s.en, label: s })),
    ),
  )

  return { areas, specialties, services }
}

/* ------------------------------------------------------------------ */
/* Lookups                                                             */
/* ------------------------------------------------------------------ */

export function getHealthRecord(slug: string | undefined): HealthRecord | null {
  return slug ? (corpus.bySlug[slug] ?? null) : null
}

export function getFacility(id: string): HealthFacility | null {
  const r = corpus.byId[id]
  return r && r.kind === 'facility' ? r : null
}

export function getDoctor(id: string): Doctor | null {
  const r = corpus.byId[id]
  return r && r.kind === 'doctor' ? r : null
}

/** Doctors attached to a facility, either by its list or by their own. */
export function doctorsAt(facility: HealthFacility): Doctor[] {
  const seen = new Set<string>()
  const out: Doctor[] = []

  for (const id of facility.doctorIds ?? []) {
    const d = getDoctor(id)
    if (d && !seen.has(d.id)) {
      seen.add(d.id)
      out.push(d)
    }
  }
  for (const d of corpus.doctors) {
    if (seen.has(d.id)) continue
    const linked =
      (d.facilityIds ?? []).includes(facility.id) ||
      (d.chambers ?? []).some((c) => c.facilityId === facility.id)
    if (linked) {
      seen.add(d.id)
      out.push(d)
    }
  }
  return out
}

/** Facilities in the same category, shown at the foot of a profile. */
export function relatedTo(record: HealthRecord, limit = 3): HealthRecord[] {
  return corpus.records
    .filter((r) => r.category === record.category && r.id !== record.id && r.area === record.area)
    .slice(0, limit)
}

/** Small set shown on the landing screen, before any search or category. */
export function featuredHealthcare(limit = 6): HealthRecord[] {
  return corpus.records.filter((r) => r.featured).slice(0, limit)
}

export function healthcareCounts(): { total: number; facilities: number; doctors: number } {
  return {
    total: corpus.records.length,
    facilities: corpus.facilities.length,
    doctors: corpus.doctors.length,
  }
}

/** Per-category totals, used on the category buttons. */
export function categoryCounts(): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of corpus.records) out[r.category] = (out[r.category] ?? 0) + 1
  return out
}
