import { CATEGORIES, CATEGORY_MAP } from '@/data/categories'
import type { CategoryGroup, CategoryId } from '@/data/types'

/* ==========================================================================
 * `public.listings` — row shape, vocabulary and mappers.
 *
 * This is the one table in the Supabase project, and the only content the
 * admin panel writes. It is deliberately flat: every column is text apart from
 * the id, the ordering key and the timestamps, which is what lets one form and
 * one table screen edit every section of the site.
 *
 * Kept separate from the queries for the same reason `db.ts` is: the public
 * site reads these rows and the admin panel writes them, and both need the same
 * translation without either importing the other's query code.
 * ========================================================================== */

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

/**
 * `status` is free text in Postgres, so these two values are a convention this
 * app maintains rather than a constraint the database enforces. Anything that
 * is not exactly 'active' is treated as inactive and stays off the public site
 * — failing closed, so a typo hides a listing rather than publishing one.
 */
export type ListingStatus = 'active' | 'inactive'

/**
 * `section` is likewise free text, and is bound here to the category groups the
 * site already organises itself by. Reusing them rather than inventing a
 * parallel set means every listing an admin creates has somewhere to appear:
 * each section below is a real page, and the public queries key off exactly
 * these strings.
 */
export type ListingSection = CategoryGroup

export const LISTING_SECTIONS: { id: ListingSection; label: string; path: string }[] = [
  { id: 'healthcare', label: 'Healthcare', path: '/healthcare' },
  { id: 'services', label: 'Local services', path: '/services' },
  { id: 'rentals', label: 'Rentals', path: '/rentals' },
  { id: 'utilities', label: 'Utilities', path: '/services' },
  { id: 'emergency', label: 'Emergency', path: '/emergency' },
]

const SECTION_IDS = new Set<string>(LISTING_SECTIONS.map((s) => s.id))

export function isListingSection(value: string | null | undefined): value is ListingSection {
  return !!value && SECTION_IDS.has(value)
}

export function sectionLabel(id: string): string {
  return LISTING_SECTIONS.find((s) => s.id === id)?.label ?? id
}

/**
 * The categories offered for a given section.
 *
 * Driven from the site's own catalogue so a listing's category resolves to a
 * name, emoji and icon on the public side instead of rendering as a bare
 * string. 'emergency' has no categories of its own in the catalogue, so it
 * falls back to the full list rather than offering an empty dropdown.
 */
export function categoriesForSection(section: string): CategoryId[] {
  const scoped = CATEGORIES.filter((c) => c.group === section).map((c) => c.id)
  return scoped.length ? scoped : CATEGORIES.map((c) => c.id)
}

/** Display name for a category id, falling back to the raw stored string. */
export function categoryLabel(id: string): string {
  return CATEGORY_MAP[id as CategoryId]?.name.en ?? id
}

/* ------------------------------------------------------------------ */
/* Row shape                                                           */
/* ------------------------------------------------------------------ */

/**
 * Exactly the columns of `public.listings`.
 *
 * Only `id` is guaranteed present, so every other field is typed nullable —
 * a row written by hand in the Supabase dashboard, or one saved from a form
 * with optional fields left blank, legitimately arrives with nulls.
 */
export type ListingRow = {
  id: number
  created_at: string | null
  section: string | null
  title: string | null
  description: string | null
  phone: string | null
  /** Added by migration 0005; absent on projects that have not applied it. */
  subcategory?: string | null
  alt_phone?: string | null
  email: string | null
  address: string | null
  location: string | null
  category: string | null
  price: string | null
  availability: string | null
  image_url: string | null
  status: string | null
  display_order: number | null
  updated_at: string | null
  /**
   * Added by migration 0007. Absent — not null — on a project that has not
   * applied it, which is why the select that names them is chosen at runtime.
   * See src/lib/listing-columns.ts.
   */
  services?: unknown
  maps_url?: string | null
}

/**
 * Explicit column list rather than `*`, matching the convention in `db.ts`:
 * adding an internal column later must not silently start shipping it to every
 * visitor of the public site.
 */
export const LISTING_SELECT =
  'id, created_at, section, title, description, phone, email, address, location, ' +
  'category, price, availability, image_url, status, display_order, updated_at'

/** What the UI works with: same data, nulls resolved, names in app casing. */
export type Listing = {
  id: number
  section: string
  title: string
  description: string
  phone: string
  /** Empty string when the column is absent or unset — see migration 0005. */
  subcategory: string
  altPhone: string
  email: string
  address: string
  location: string
  category: string
  price: string
  availability: string
  imageUrl: string | null
  /**
   * What this listing offers, one entry per service. Empty when the column is
   * absent or unset — see migration 0007.
   */
  services: string[]
  /** A Google Maps link for this listing, or empty. See migration 0007. */
  mapsUrl: string
  status: ListingStatus
  displayOrder: number
  createdAt: string
  updatedAt: string
}

/**
 * Filters admin-managed listings for the public search page.
 *
 * Deliberately a plain substring match rather than the tiered fuzzy ranker in
 * `lib/search.ts`. That ranker scores against `Business` records — name pairs,
 * keywords, category metadata, distance — and a `Listing` has none of that
 * shape. Running these through it would mean inventing the missing fields, and
 * a wrong relevance order is harder to notice than a plain one.
 *
 * Matching is case-insensitive across every text column an editor actually
 * fills in, so a search for a phone number or an area name finds the listing
 * just as a search for its title does.
 */
export function matchListings(
  listings: Listing[],
  query: string,
  category?: string | null,
): Listing[] {
  const term = query.trim().toLowerCase()
  return listings.filter((l) => {
    if (category && l.category !== category) return false
    if (!term) return true
    return [l.title, l.description, l.category, l.section, l.location, l.address, l.phone]
      .some((field) => field.toLowerCase().includes(term))
  })
}

/* ------------------------------------------------------------------ */
/* Presentation helpers                                                */
/* ------------------------------------------------------------------ */

/**
 * Whether a stored value is a link rather than a piece of prose.
 *
 * `location` and `address` are free text, and editors legitimately paste a
 * Google Maps share link into either — it is the most precise thing they have.
 * Rendered as text that is a 60-character URL sitting where an area name
 * belongs; rendered as a link it is the most useful control on the page. This
 * tells the two apart so each can be presented as what it is.
 *
 * Deliberately narrow: only an explicit http(s) URL counts. A bare "kushtia.gov
 * .bd" written in an address line is prose, and linkifying it would be guessing.
 */
export function isLink(value: string | null | undefined): boolean {
  if (!value) return false
  const trimmed = value.trim()
  if (!/^https?:\/\//i.test(trimmed)) return false
  try {
    new URL(trimmed)
    return true
  } catch {
    return false
  }
}

/**
 * The shortest human-readable place for a listing, skipping any value that is
 * really a URL — so a card's location line never becomes a wall of query
 * string. Returns an empty string when neither field holds a readable place.
 */
export function placeLabel(listing: Pick<Listing, 'location' | 'address'>): string {
  if (listing.location && !isLink(listing.location)) return listing.location
  if (listing.address && !isLink(listing.address)) return listing.address
  return ''
}

/**
 * The map link for a listing.
 *
 * `maps_url` (migration 0007) is the column that means this, so it wins. The
 * two fallbacks are for data written before that column existed, when the only
 * place to put a share link was the area or address field — those rows are
 * still live and must not lose their link on the day the migration is applied.
 */
export function mapLink(
  listing: Pick<Listing, 'location' | 'address'> & Partial<Pick<Listing, 'mapsUrl'>>,
): string | null {
  if (isLink(listing.mapsUrl)) return listing.mapsUrl!.trim()
  if (isLink(listing.location)) return listing.location.trim()
  if (isLink(listing.address)) return listing.address.trim()
  return null
}

/**
 * Reads the `services` jsonb column into the flat list this form edits.
 *
 * The column is shared with the rich schema, where each entry is a `{ bn, en }`
 * pair, so both shapes have to be accepted: a row written by 0004's importer
 * carries objects, one written by this admin form carries the same string in
 * both halves, and a row typed by hand in the Supabase dashboard might carry
 * bare strings. Anything else in the array is skipped rather than rendered as
 * "[object Object]" on the public site.
 */
export function toServiceList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const entry of value) {
    if (typeof entry === 'string') {
      if (entry.trim()) out.push(entry.trim())
      continue
    }
    if (entry && typeof entry === 'object') {
      const pair = entry as { en?: unknown; bn?: unknown }
      const text = typeof pair.en === 'string' && pair.en.trim()
        ? pair.en
        : typeof pair.bn === 'string'
          ? pair.bn
          : ''
      if (text.trim()) out.push(text.trim())
    }
  }
  return out
}

/**
 * The stored form of a service list.
 *
 * Written as `{ bn, en }` pairs so the rich mappers in listings-rich.ts read it
 * unchanged. The simple form is monolingual, so the one string fills both
 * halves — the same fallback the flat `title` and `description` columns already
 * rely on, which keeps a record readable in both languages instead of blank in
 * one. Null for an empty list, matching how every other optional column here
 * stores "nothing".
 */
export function fromServiceList(services: string[]): { bn: string; en: string }[] | null {
  const clean = services.map((s) => s.trim()).filter(Boolean)
  return clean.length ? clean.map((s) => ({ bn: s, en: s })) : null
}

export function toListing(r: ListingRow): Listing {
  return {
    id: r.id,
    section: r.section ?? '',
    // An untitled row still has to render as something an admin can click on
    // and fix, rather than as a blank line in the table.
    title: r.title ?? '',
    description: r.description ?? '',
    phone: r.phone ?? '',
    subcategory: r.subcategory ?? '',
    altPhone: r.alt_phone ?? '',
    email: r.email ?? '',
    address: r.address ?? '',
    location: r.location ?? '',
    category: r.category ?? '',
    price: r.price ?? '',
    availability: r.availability ?? '',
    imageUrl: r.image_url || null,
    services: toServiceList(r.services),
    mapsUrl: r.maps_url?.trim() ?? '',
    status: r.status === 'active' ? 'active' : 'inactive',
    displayOrder: r.display_order ?? 0,
    createdAt: r.created_at ?? '',
    updatedAt: r.updated_at ?? r.created_at ?? '',
  }
}
