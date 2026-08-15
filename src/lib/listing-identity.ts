import { buildImportRows, listingKey } from './listings-import'
import type { Listing } from './listings'

/* ==========================================================================
 * One real-world entity, one canonical listing.
 *
 * THE BUG THIS EXISTS TO PREVENT
 *
 * The emergency page rendered all fourteen services twice: once from the
 * bundled dataset, through `listEmergency()`, and once from `public.listings`,
 * through the admin-managed block underneath. Twenty-eight cards, fourteen real
 * services, two runtime copies of each.
 *
 * The database was never at fault — it holds 147 rows with zero duplicates.
 * Two *sources* were rendering the same entities into one page, which is a
 * pipeline problem and cannot be fixed by hiding cards.
 *
 * IDENTITY
 *
 * `public.listings.id` is the canonical identity and is what
 * `dedupeById` uses whenever a collection is assembled from more than one
 * query. That covers every case where both sides are database rows.
 *
 * It does not cover the bundled dataset, whose records predate the table and
 * carry no database id. For those, identity falls back to the same composite
 * the importer already dedupes on — `section` + `title`, normalised for case
 * and padding. That pair was measured across all 147 records: unique for every
 * one of them, where `title` alone collides once. It is the strongest signal
 * available without inventing a mapping table, and it is the same rule that
 * decides whether an import inserts or skips, so the two can never disagree
 * about what counts as the same record.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 *
 * It does not merge on normalised name alone, and it does not merge on phone or
 * coordinates. "Kushtia Sadar Hospital" and "Kushtia Sadar Hospital —
 * Emergency" may well be one organisation, but they may equally be a hospital
 * and its separately-staffed emergency line with different numbers — and two
 * services sharing a switchboard number is normal, not evidence of duplication.
 * Guessing wrong there silently removes a listing somebody needs. Anything
 * short of certain identity is reported by `auditDuplicates` for a human to
 * judge, never merged automatically.
 * ========================================================================== */

/**
 * The identity of a listing for deduplication.
 *
 * Prefers nothing else over the database id: two rows with different ids are
 * different records by definition, whatever they are called.
 */
export function identityOf(listing: Pick<Listing, 'id' | 'section' | 'title'>): string {
  return listing.id > 0 ? `id:${listing.id}` : listingKey(listing.section, listing.title)
}

/**
 * Removes repeats from a collection assembled from several queries.
 *
 * Order is preserved and the first occurrence wins, so a listing that arrives
 * from a higher-priority source keeps that source's position.
 */
export function dedupeById<T extends Pick<Listing, 'id' | 'section' | 'title'>>(
  listings: T[],
): T[] {
  const seen = new Set<string>()
  return listings.filter((listing) => {
    const key = identityOf(listing)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/* ------------------------------------------------------------------ */
/* Bundled correspondence                                              */
/* ------------------------------------------------------------------ */

/**
 * Every bundled record's composite key, computed once.
 *
 * Derived from `buildImportRows` rather than from the source arrays directly,
 * so the section and title used here are byte-for-byte the ones the importer
 * wrote — a record whose section is decided by a mapper (a business's `group`,
 * say) cannot be classified differently by the two callers.
 */
let bundledKeys: Set<string> | null = null

function bundledIdentities(): Set<string> {
  bundledKeys ??= new Set(buildImportRows().map((r) => listingKey(r.section, r.title)))
  return bundledKeys
}

/**
 * Whether this database row is the bundled directory's copy of a record.
 *
 * True means the main page sections are already rendering this entity from the
 * bundled dataset, so rendering it again from the database would duplicate it.
 * False means it was created in the admin panel and exists nowhere else, which
 * is precisely what the admin-managed block is for.
 */
export function isFromBundledDirectory(listing: Pick<Listing, 'section' | 'title'>): boolean {
  return bundledIdentities().has(listingKey(listing.section, listing.title))
}

/* ------------------------------------------------------------------ */
/* Diagnostic                                                          */
/* ------------------------------------------------------------------ */

export type DuplicateClass = 'exact' | 'possible' | 'distinct'

export type DuplicateFinding = {
  classification: DuplicateClass
  reason: string
  listings: { id: number; title: string; section: string; phone: string }[]
}

/**
 * Classifies possible duplicates without touching anything.
 *
 * Reports rather than merges, and separates certainty from suspicion, because
 * the two need different handling: an exact repeat of the identity key is a
 * genuine fault, whereas a shared phone number across a hospital and its
 * ambulance line is ordinary. Nothing here deletes, merges or writes.
 */
export function auditDuplicates(listings: Listing[]): DuplicateFinding[] {
  const findings: DuplicateFinding[] = []
  const describe = (l: Listing) => ({
    id: l.id,
    title: l.title,
    section: l.section,
    phone: l.phone,
  })

  const group = <K>(key: (l: Listing) => K | null) => {
    const map = new Map<K, Listing[]>()
    for (const l of listings) {
      const k = key(l)
      if (k === null) continue
      const list = map.get(k) ?? []
      list.push(l)
      map.set(k, list)
    }
    return [...map.values()].filter((group) => group.length > 1)
  }

  // Certain: the same identity twice is a duplicate by definition.
  for (const dupes of group((l) => listingKey(l.section, l.title))) {
    findings.push({
      classification: 'exact',
      reason: 'Same section and title — these are the same record stored twice.',
      listings: dupes.map(describe),
    })
  }

  // Suspicious: same name in different sections. Often one organisation listed
  // under two capabilities, which is what should be one record with metadata.
  for (const dupes of group((l) => (l.title.trim() ? l.title.trim().toLowerCase() : null))) {
    if (new Set(dupes.map((l) => l.section)).size < 2) continue
    findings.push({
      classification: 'possible',
      reason: `Same title across ${dupes.length} sections — may be one organisation listed under several capabilities.`,
      listings: dupes.map(describe),
    })
  }

  // Weak signal only. A shared switchboard is normal, so this is never grounds
  // to merge on its own — it is listed so a human can look.
  for (const dupes of group((l) => (l.phone.trim() ? l.phone.replace(/\D/g, '') : null))) {
    if (new Set(dupes.map((l) => l.title.trim().toLowerCase())).size < 2) continue
    findings.push({
      classification: 'distinct',
      reason: 'Shared phone number but different names — commonly one switchboard, not a duplicate.',
      listings: dupes.map(describe),
    })
  }

  return findings
}
