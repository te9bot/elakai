import { requireSupabase } from './supabase'
import { LISTING_SELECT, toListing, type Listing, type ListingRow, type ListingStatus } from './listings'
import { toStoredPhone } from './phone'

/* ==========================================================================
 * Admin data access for `public.listings` and the `elakai-images` bucket.
 *
 * Authorization is not attempted here. Every call runs as the signed-in user
 * and the existing RLS policies decide what it may change — an admin screen
 * that tried to query its way around them would simply come back refused. The
 * UID check in `lib/auth.tsx` decides which screen renders, nothing more.
 * ========================================================================== */

export const IMAGE_BUCKET = 'elakai-images'

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

/**
 * Postgres and the storage API speak to developers, not to the person filling
 * in a form. These are the failures an admin can actually cause and act on;
 * anything else passes through unchanged rather than being flattened into a
 * vague apology.
 */
function friendly(message: string): string {
  if (/row-level security|permission denied|not authorized|unauthorized/i.test(message)) {
    return 'Your account is not allowed to make that change.'
  }
  if (/duplicate key|unique constraint/i.test(message)) {
    return 'A listing with those details already exists.'
  }
  if (/payload too large|exceeded the maximum allowed size/i.test(message)) {
    return 'That file is larger than the storage bucket allows.'
  }
  if (/jwt|expired|invalid token/i.test(message)) {
    return 'Your session has expired. Sign in again and retry.'
  }
  if (/failed to fetch|networkerror|network request failed/i.test(message)) {
    return 'Could not reach the server. Check your connection and try again.'
  }
  return message
}

/** Turns anything thrown — Error, string, network rejection — into a message. */
export function errorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof Error) return friendly(error.message)
  if (typeof error === 'string') return friendly(error)
  return fallback
}

/* ------------------------------------------------------------------ */
/* Images                                                              */
/* ------------------------------------------------------------------ */

/** The bucket's own ceiling. Checked here so a doomed upload never starts. */
export const MAX_IMAGE_BYTES = 50 * 1024 * 1024

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const

/** For the file input's `accept`, which matches on extension as well as MIME. */
export const ACCEPT_ATTR = '.jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif'

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

/** Human-readable size for the file chip under the dropzone. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Rejects a file before it is uploaded, and says which rule it broke.
 *
 * Type is checked against the MIME the browser reports rather than the
 * extension, because the extension is the part a user can trivially get wrong.
 * Returns null when the file is acceptable.
 */
export function validateImage(file: File): string | null {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return 'That file type is not supported. Use JPG, PNG, WEBP or GIF.'
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `That image is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_IMAGE_BYTES)}.`
  }
  if (file.size === 0) return 'That file is empty.'
  return null
}

/**
 * Strips a filename down to something safe to put in a storage key.
 *
 * Storage paths are URL path segments, so anything that could change how the
 * path parses — slashes, dots, spaces, non-ASCII — is collapsed to a hyphen.
 * Bengali filenames are common here and would otherwise arrive percent-encoded
 * and unreadable in the bucket listing; when nothing survives the strip, the
 * unique prefix alone still names the object.
 */
function safeName(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

/**
 * Uploads one image and returns its public URL.
 *
 * The key is generated, never taken from the file alone: two people uploading
 * `shop.jpg` must not collide, and a caller must never be able to overwrite an
 * image belonging to another listing. `upsert: false` makes that a guarantee
 * rather than a convention — a name collision fails the upload instead of
 * silently replacing whatever was there.
 *
 * The timestamp and the sanitised original name are carried along purely so the
 * bucket stays legible: a folder of bare UUIDs is impossible to audit by eye.
 * Uniqueness comes from the UUID, not from either of them.
 */
export async function uploadListingImage(file: File): Promise<string> {
  const invalid = validateImage(file)
  if (invalid) throw new Error(invalid)

  const db = requireSupabase()
  const ext = EXT_BY_TYPE[file.type] ?? 'jpg'
  const unique =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

  const stamp = new Date().toISOString().slice(0, 10)
  const label = safeName(file.name)
  const path = `listings/${stamp}-${unique}${label ? `-${label}` : ''}.${ext}`

  const { error } = await db.storage.from(IMAGE_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
    cacheControl: '3600',
  })
  if (error) throw new Error(friendly(error.message))

  const { data } = db.storage.from(IMAGE_BUCKET).getPublicUrl(path)
  if (!data?.publicUrl) throw new Error('The image uploaded but no public URL came back.')
  return data.publicUrl
}

const PUBLIC_PREFIX = `/storage/v1/object/public/${IMAGE_BUCKET}/`

/**
 * The object path inside `elakai-images` for a stored public URL, or null.
 *
 * Null for anything this app did not put there — an image pasted in from
 * another host, or a URL shape we do not recognise. Callers use that to decide
 * whether a storage object is theirs to remove, so guessing wrong here would
 * mean deleting somebody else's file.
 */
export function storagePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const at = url.indexOf(PUBLIC_PREFIX)
  if (at === -1) return null
  const path = url.slice(at + PUBLIC_PREFIX.length).split(/[?#]/)[0]
  return path ? decodeURIComponent(path) : null
}

/**
 * Removes a stored image, if it is one of ours.
 *
 * Reports success as a boolean rather than throwing: this runs after the
 * database row is already gone, and a failure to tidy up a file must not be
 * reported to the admin as "the delete failed" when the delete did happen.
 */
export async function removeListingImage(url: string | null | undefined): Promise<boolean> {
  const path = storagePathFromUrl(url)
  if (!path) return false
  try {
    const { error } = await requireSupabase().storage.from(IMAGE_BUCKET).remove([path])
    if (error) {
      console.warn('[elakai] could not remove stored image:', error.message)
      return false
    }
    return true
  } catch (error) {
    console.warn('[elakai] could not remove stored image:', error)
    return false
  }
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export type ListingSort =
  | 'display_order'
  | 'created_at'
  | 'updated_at'
  | 'title'

export type AdminListParams = {
  search?: string
  section?: string
  category?: string
  status?: ListingStatus | 'all'
  sort?: ListingSort
  ascending?: boolean
}

const SEARCH_COLUMNS = ['title', 'description', 'address', 'location', 'category', 'phone', 'email']

/**
 * PostgREST parses `or=(...)` as structured text, so a raw search term can
 * break out of the filter it was meant to sit inside — a comma starts a new
 * condition, a parenthesis closes the group. Double quotes are the documented
 * escape, which in turn means embedded quotes and backslashes are escaped
 * first. (The same reasoning as `lib/admin-api.ts`, kept local so the two
 * tables' query code stays independent.)
 */
function quoteForOr(term: string): string {
  return `"${term.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/**
 * Every listing the admin can see, filtered and sorted in Postgres.
 *
 * Unpaginated on purpose: the admin table shows the whole directory at once so
 * `display_order` can be reasoned about as a single sequence. If this table
 * ever grows past a few thousand rows, this is the function that needs a range.
 */
export async function adminListListings(params: AdminListParams = {}): Promise<Listing[]> {
  const { search, section, category, status = 'all', sort = 'display_order', ascending = true } = params

  const db = requireSupabase()
  let q = db.from('listings').select(LISTING_SELECT)

  if (section) q = q.eq('section', section)
  if (category) q = q.eq('category', category)

  // 'inactive' means "anything that is not active", which has to include rows
  // whose status is null — `neq` alone would drop those, hiding listings that
  // are in fact not published.
  if (status === 'active') q = q.eq('status', 'active')
  else if (status === 'inactive') q = q.or('status.neq.active,status.is.null')

  const term = search?.trim()
  if (term) {
    // `%` and `_` are ilike wildcards; a user typing them means the literal
    // character, not "match anything".
    const escaped = term.replace(/[%_]/g, (c) => `\\${c}`)
    q = q.or(SEARCH_COLUMNS.map((c) => `${c}.ilike.${quoteForOr(`%${escaped}%`)}`).join(','))
  }

  // The id tiebreak keeps the order stable: without it, two rows sharing a
  // display_order can swap places between loads and make the table look like
  // it is reordering itself.
  q = q.order(sort, { ascending, nullsFirst: false }).order('id', { ascending: true })

  const { data, error } = await q
  if (error) throw new Error(`Could not load listings: ${friendly(error.message)}`)
  return ((data ?? []) as unknown as ListingRow[]).map(toListing)
}

/**
 * One listing by its primary key, for the edit route.
 *
 * Distinct from picking it out of `adminListListings` — that list is filtered
 * and sorted, so a row excluded by the current filters simply would not be in
 * it, and `/admin/listings/12/edit` opened from a bookmark or after a refresh
 * would find nothing. This asks for the row itself.
 *
 * No status filter, unlike the public `getListingById`: the whole point of the
 * admin screen is to reach rows the public site will not show.
 *
 * Returns null for a well-formed id with no row, and throws only when the query
 * itself failed — the caller renders "not found" and "could not load" as
 * different screens, because they need different actions from the admin.
 */
export async function adminGetListing(id: string | number): Promise<Listing | null> {
  const numeric = typeof id === 'number' ? id : /^\d+$/.test(id.trim()) ? Number(id.trim()) : NaN
  if (!Number.isSafeInteger(numeric) || numeric <= 0) return null

  const { data, error } = await requireSupabase()
    .from('listings')
    .select(LISTING_SELECT)
    .eq('id', numeric)
    .maybeSingle()

  if (error) throw new Error(`Could not load that listing: ${friendly(error.message)}`)
  return data ? toListing(data as unknown as ListingRow) : null
}

export type ListingStats = {
  total: number
  active: number
  inactive: number
  withImages: number
  /** Active listings per section, for the breakdown on the dashboard. */
  bySection: Record<string, number>
  recent: Listing[]
}

/**
 * Dashboard counts.
 *
 * Counted in Postgres with `head: true`, so cheap COUNT queries replace
 * shipping the table to the browser to call `.length` on it. `inactive` is
 * derived by subtraction rather than queried, because that is the only form
 * that counts a null status correctly.
 */
export async function fetchListingStats(): Promise<ListingStats> {
  const db = requireSupabase()
  const base = () => db.from('listings').select('id', { count: 'exact', head: true })

  const [total, active, images, recent, sections] = await Promise.all([
    base(),
    base().eq('status', 'active'),
    base().not('image_url', 'is', null).neq('image_url', ''),
    db.from('listings').select(LISTING_SELECT).order('updated_at', { ascending: false, nullsFirst: false }).limit(5),
    // One column for every active row, counted here rather than as one COUNT
    // per section: five HEAD requests cost five round trips, and this is a
    // single short column whose whole result is smaller than their headers.
    db.from('listings').select('section').eq('status', 'active'),
  ])

  const failed = total.error ?? active.error ?? images.error ?? recent.error ?? sections.error
  if (failed) throw new Error(`Could not load the dashboard: ${friendly(failed.message)}`)

  const bySection: Record<string, number> = {}
  for (const row of (sections.data ?? []) as { section: string | null }[]) {
    const key = row.section || 'unassigned'
    bySection[key] = (bySection[key] ?? 0) + 1
  }

  const totalCount = total.count ?? 0
  const activeCount = active.count ?? 0

  return {
    total: totalCount,
    active: activeCount,
    inactive: Math.max(0, totalCount - activeCount),
    withImages: images.count ?? 0,
    bySection,
    recent: ((recent.data ?? []) as unknown as ListingRow[]).map(toListing),
  }
}

/* ------------------------------------------------------------------ */
/* Writes                                                              */
/* ------------------------------------------------------------------ */

/** The editable half of a listing — everything except the keys and stamps. */
export type ListingInput = {
  section: string
  title: string
  description: string
  phone: string
  email: string
  address: string
  location: string
  category: string
  price: string
  availability: string
  image_url: string | null
  status: ListingStatus
  display_order: number
}

/** Blank optional text is stored as null rather than as an empty string. */
function nullable(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function toRow(input: ListingInput) {
  return {
    section: nullable(input.section),
    title: nullable(input.title),
    description: nullable(input.description),
    // Stored canonical (+8801XXXXXXXXX) so every reader — public card, detail
    // page, search — dials the same string regardless of how it was typed.
    // Unparseable input is kept verbatim rather than discarded; the form has
    // already warned about it and losing what someone entered is worse.
    phone: toStoredPhone(input.phone),
    email: nullable(input.email),
    address: nullable(input.address),
    location: nullable(input.location),
    category: nullable(input.category),
    price: nullable(input.price),
    availability: nullable(input.availability),
    image_url: input.image_url,
    status: input.status,
    display_order: Number.isFinite(input.display_order) ? input.display_order : 0,
  }
}

export async function createListing(input: ListingInput): Promise<Listing> {
  const db = requireSupabase()
  const { data, error } = await db
    .from('listings')
    .insert(toRow(input))
    .select(LISTING_SELECT)
    .single()

  if (error) throw new Error(friendly(error.message))
  return toListing(data as unknown as ListingRow)
}

/**
 * `updated_at` is set explicitly rather than left to the column default, which
 * only applies on insert. Without this the dashboard's "recently updated" and
 * the sort-by-updated column would both keep reporting creation time.
 */
export async function updateListing(id: number, input: ListingInput): Promise<Listing> {
  const db = requireSupabase()
  const { data, error } = await db
    .from('listings')
    .update({ ...toRow(input), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(LISTING_SELECT)
    .single()

  if (error) throw new Error(friendly(error.message))
  return toListing(data as unknown as ListingRow)
}

/** Flip one listing between active and inactive, straight from the table row. */
export async function setListingStatus(id: number, status: ListingStatus): Promise<void> {
  const db = requireSupabase()
  const { error } = await db
    .from('listings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(friendly(error.message))
}

/**
 * Deletes the row, then its image.
 *
 * That order matters. If the row goes first and the file cannot be removed, the
 * result is one unreferenced object in the bucket. The other order risks an
 * image disappearing from a listing that is still on the public site, which is
 * the failure a visitor would see.
 */
export async function deleteListing(listing: Pick<Listing, 'id' | 'imageUrl'>): Promise<void> {
  const db = requireSupabase()
  const { error } = await db.from('listings').delete().eq('id', listing.id)
  if (error) throw new Error(friendly(error.message))

  await removeListingImage(listing.imageUrl)
}
