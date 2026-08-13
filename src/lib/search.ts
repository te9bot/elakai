import { BUSINESSES } from '@/data/businesses'
import { AREA_MAP, CATEGORY_MAP } from '@/data/categories'
import type { Business, CategoryId, LatLng, ScoredBusiness } from '@/data/types'
import { KUSHTIA_CENTER } from './config'
import { getOpenState, haversineKm } from './format'

/* ==========================================================================
 * Ranking
 *
 * The brief fixes the priority order: relevance, then location, then
 * availability, then verification, then rating. These weights encode exactly
 * that ordering — each term dominates every term below it in practice, so the
 * lower signals only ever break ties among comparably relevant results.
 * ========================================================================== */
const WEIGHTS = {
  relevance: 0.45,
  proximity: 0.2,
  availability: 0.15,
  verified: 0.12,
  rating: 0.08,
} as const

/** Distance beyond which proximity stops discriminating (the district is ~40km wide). */
const MAX_USEFUL_KM = 25

/* ------------------------------------------------------------------ */
/* Index                                                               */
/* ------------------------------------------------------------------ */

/**
 * Tokens are kept in tiers rather than one flat bag, because *where* a word
 * matched changes what the user meant. "ambulance" appearing in a hospital's
 * service list is a weaker signal than it being the category of a dedicated
 * ambulance operator — and in an emergency that ordering matters.
 */
type IndexEntry = {
  business: Business
  tiers: { tokens: Set<string>; weight: number }[]
  /** Flat set, used only for coverage checks. */
  allTokens: Set<string>
}

const FIELD_WEIGHTS = {
  name: 1,
  category: 0.95,
  keywords: 0.88,
  services: 0.6,
  area: 0.5,
  description: 0.38,
} as const

function tokenize(s: string): string[] {
  return (
    s
      .toLowerCase()
      // \p{M} is essential, not optional: Bengali vowel signs and the hasanta
      // are combining marks. Dropping them collapses every Bangla word to a
      // consonant skeleton ("অ্যাম্বুলেন্স" → "অযামবলনস"), which then fuzzy-matches
      // unrelated words. Bangla is the default locale, so this must stay.
      .replace(/[^\p{L}\p{N}\p{M}\s]/gu, ' ')
      .split(/\s+/)
      .filter(Boolean)
  )
}

function buildEntry(business: Business): IndexEntry {
  const cat = CATEGORY_MAP[business.category]
  const area = AREA_MAP[business.area]

  const tier = (weight: number, ...parts: string[]) => ({
    tokens: new Set(tokenize(parts.filter(Boolean).join(' '))),
    weight,
  })

  const tiers = [
    tier(FIELD_WEIGHTS.name, business.name.bn, business.name.en),
    tier(FIELD_WEIGHTS.category, cat.name.bn, cat.name.en),
    tier(FIELD_WEIGHTS.keywords, ...cat.keywords),
    tier(FIELD_WEIGHTS.services, ...business.services.flatMap((s) => [s.bn, s.en])),
    tier(FIELD_WEIGHTS.area, area.name.bn, area.name.en, business.address.bn, business.address.en),
    tier(FIELD_WEIGHTS.description, business.description.bn, business.description.en),
  ]

  const allTokens = new Set<string>()
  for (const t of tiers) for (const tok of t.tokens) allTokens.add(tok)

  return { business, tiers, allTokens }
}

/**
 * The live corpus.
 *
 * Seeded from the bundled data so the app renders before — or entirely
 * without — a backend, and replaced by `setBusinessCorpus` once the real
 * listings arrive. A linear scan over a few hundred entries costs nothing on a
 * budget device, and the tiered fuzzy matching this drives is what makes a
 * misspelt Bangla query still find the right listing.
 *
 * Ceiling: this is a client-side index, so the whole published corpus is held
 * in memory. Past a few thousand listings the fetch, not the scan, becomes the
 * problem — at that point this moves behind a Postgres RPC using the pg_trgm
 * indexes already declared in the schema migration, and `rankBusinesses` keeps
 * its signature.
 */
let INDEX: IndexEntry[] = BUSINESSES.map(buildEntry)

export function setBusinessCorpus(businesses: Business[]): void {
  INDEX = businesses.map(buildEntry)
}

/* ------------------------------------------------------------------ */
/* Text relevance                                                      */
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
 * 0–1 relevance for a query against one index entry.
 * Exact token match > prefix > substring > single-typo fuzzy.
 */
function relevanceOf(entry: IndexEntry, queryTokens: string[], rawQuery: string): number {
  if (queryTokens.length === 0) return 0

  // A direct hit on the business name is the strongest possible signal.
  const nameBn = entry.business.name.bn.toLowerCase()
  const nameEn = entry.business.name.en.toLowerCase()
  if (nameBn.startsWith(rawQuery) || nameEn.startsWith(rawQuery)) return 1

  let total = 0
  for (const q of queryTokens) {
    let best = 0

    // Take the strongest match across all tiers, scaled by that tier's weight,
    // so a category hit beats the same word buried in a service list.
    for (const { tokens, weight } of entry.tiers) {
      let local = 0
      for (const t of tokens) {
        if (t === q) {
          local = 1
          break
        }
        if (t.startsWith(q)) local = Math.max(local, 0.85)
        else if (q.length >= 3 && t.includes(q)) local = Math.max(local, 0.6)
        else if (q.length >= 4 && withinOneEdit(t, q)) local = Math.max(local, 0.45)
      }
      best = Math.max(best, local * weight)
    }
    total += best
  }

  const avg = total / queryTokens.length
  // Reward matching every token rather than just one of several.
  const coverage = queryTokens.filter((q) =>
    Array.from(entry.allTokens).some((t) => t.startsWith(q)),
  ).length
  const coverageBonus = (coverage / queryTokens.length) * 0.15
  return Math.min(1, avg * 0.85 + coverageBonus)
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export type SearchOptions = {
  query?: string
  category?: CategoryId | null
  categories?: CategoryId[]
  origin?: LatLng
  openOnly?: boolean
  verifiedOnly?: boolean
  sort?: 'best' | 'nearest' | 'rating' | 'open'
  limit?: number
  now?: Date
}

export function rankBusinesses(options: SearchOptions = {}): ScoredBusiness[] {
  const {
    query = '',
    category = null,
    categories,
    origin = KUSHTIA_CENTER,
    openOnly = false,
    verifiedOnly = false,
    sort = 'best',
    limit,
    now = new Date(),
  } = options

  const raw = query.trim().toLowerCase()
  const queryTokens = tokenize(raw)
  const hasQuery = queryTokens.length > 0

  const allowed = categories?.length ? new Set(categories) : category ? new Set([category]) : null

  const out: ScoredBusiness[] = []

  for (const entry of INDEX) {
    const b = entry.business
    if (allowed && !allowed.has(b.category)) continue
    if (verifiedOnly && !b.verified) continue

    const { isOpen } = getOpenState(b.hours, now)
    if (openOnly && !isOpen) continue

    const relevance = hasQuery ? relevanceOf(entry, queryTokens, raw) : 0

    // A query that matches nothing at all should drop the listing entirely,
    // otherwise "xyz" would return the whole directory ordered by rating.
    if (hasQuery && relevance < 0.3) continue

    const distanceKm = haversineKm(origin, b.coords)
    const proximity = Math.max(0, 1 - distanceKm / MAX_USEFUL_KM)
    const availability = b.hours === 'always' ? 1 : isOpen ? 0.8 : 0
    const verified = b.verified ? 1 : 0
    const rating = b.rating > 0 ? (b.rating - 3) / 2 : 0 // 3.0–5.0 mapped to 0–1

    const secondary =
      proximity * WEIGHTS.proximity +
      availability * WEIGHTS.availability +
      verified * WEIGHTS.verified +
      Math.max(0, Math.min(1, rating)) * WEIGHTS.rating

    /**
     * Relevance gates everything below it rather than merely outweighing it.
     * Additive weighting let a near, verified hospital overtake a genuine
     * ambulance operator for the query "ambulance" — the lower-priority signals
     * combined can outvote the top one. Scaling the secondary signals by
     * relevance keeps the brief's stated order intact: they only ever reorder
     * results that are comparably relevant.
     */
    const rel = hasQuery ? relevance : 1
    const score = rel * (WEIGHTS.relevance + secondary)

    out.push({ business: b, score, distanceKm, isOpen })
  }

  switch (sort) {
    case 'nearest':
      out.sort((a, z) => a.distanceKm - z.distanceKm || z.score - a.score)
      break
    case 'rating':
      out.sort((a, z) => z.business.rating - a.business.rating || z.score - a.score)
      break
    case 'open':
      out.sort(
        (a, z) => Number(z.isOpen) - Number(a.isOpen) || z.score - a.score,
      )
      break
    default:
      out.sort((a, z) => z.score - a.score)
  }

  return limit ? out.slice(0, limit) : out
}

/* ------------------------------------------------------------------ */
/* Typeahead                                                           */
/* ------------------------------------------------------------------ */

export type Suggestion =
  | { kind: 'category'; id: CategoryId; label: { bn: string; en: string }; emoji: string }
  | { kind: 'business'; slug: string; label: { bn: string; en: string }; category: CategoryId }

export function suggest(query: string, limit = 6): Suggestion[] {
  const raw = query.trim().toLowerCase()
  if (!raw) return []

  const out: Suggestion[] = []

  // Categories first — tapping one is usually what the user actually wants.
  for (const cat of Object.values(CATEGORY_MAP)) {
    const hit =
      cat.name.bn.toLowerCase().includes(raw) ||
      cat.name.en.toLowerCase().includes(raw) ||
      cat.keywords.some((k) => k.toLowerCase().startsWith(raw))
    if (hit) {
      out.push({ kind: 'category', id: cat.id, label: cat.name, emoji: cat.emoji })
    }
    if (out.length >= 3) break
  }

  for (const entry of INDEX) {
    if (out.length >= limit) break
    const b = entry.business
    if (
      b.name.bn.toLowerCase().includes(raw) ||
      b.name.en.toLowerCase().includes(raw)
    ) {
      out.push({ kind: 'business', slug: b.slug, label: b.name, category: b.category })
    }
  }

  return out.slice(0, limit)
}

/**
 * Rentals are a separate dataset with their own filters, so a query like
 * "ফ্ল্যাট" / "flat" finds nothing in the business index. Rather than showing a
 * dead end, detect that intent and let the caller route the user to /rentals.
 */
export function matchesRentalIntent(query: string): CategoryId | null {
  const raw = query.trim().toLowerCase()
  if (!raw) return null

  for (const cat of Object.values(CATEGORY_MAP)) {
    if (cat.group !== 'rentals') continue
    const hit =
      cat.name.bn.toLowerCase().includes(raw) ||
      cat.name.en.toLowerCase().includes(raw) ||
      cat.keywords.some((k) => k.toLowerCase().startsWith(raw) || raw.startsWith(k.toLowerCase()))
    if (hit) return cat.id
  }
  return null
}

/** Static popular queries shown on the empty search screen. */
export const POPULAR_QUERIES: { bn: string; en: string }[] = [
  { bn: 'অ্যাম্বুলেন্স', en: 'Ambulance' },
  { bn: 'হাসপাতাল', en: 'Hospital' },
  { bn: 'ব্লাড ব্যাংক', en: 'Blood bank' },
  { bn: 'ইলেকট্রিশিয়ান', en: 'Electrician' },
  { bn: 'ফার্মেসি', en: 'Pharmacy' },
  { bn: 'ফ্ল্যাট ভাড়া', en: 'Flat rent' },
]
