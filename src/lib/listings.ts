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
    status: r.status === 'active' ? 'active' : 'inactive',
    displayOrder: r.display_order ?? 0,
    createdAt: r.created_at ?? '',
    updatedAt: r.updated_at ?? r.created_at ?? '',
  }
}
