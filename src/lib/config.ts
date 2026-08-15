/**
 * ==========================================================================
 * DIALING SAFETY — READ BEFORE CHANGING. See `src/lib/phone.ts`.
 * ==========================================================================
 *
 * Every phone number bundled in `src/data/` is a placeholder in the reserved
 * +880 1700-000-XXX range. None of them reach a real hospital, ambulance,
 * police station, or business.
 *
 * A wrong emergency number causes real harm: someone dials it during an actual
 * emergency and loses time they do not have. This used to be enforced by a
 * `DEMO_MODE` constant here that suppressed every `tel:` link in the app.
 *
 * That was the right instinct and the wrong mechanism. Because it keyed on a
 * build flag rather than on the data, it could not tell a placeholder from the
 * real number an admin types into the admin panel — so protecting against the
 * former meant refusing to dial the latter, and the listings published from the
 * admin panel had call buttons that did nothing.
 *
 * The rule now lives in `lib/phone.ts` and keys on the number itself: anything
 * in the reserved range never produces a `tel:` link, and no flag anywhere can
 * make it. Real numbers dial. Adding a placeholder to `src/data/` cannot
 * accidentally go live, and there is no longer a switch to flip carelessly.
 */

/**
 * The one Supabase auth user allowed into /admin.
 *
 * Not a secret, and not the security boundary — a user id is public information
 * and this constant only decides which screen renders. The enforcement is the
 * RLS policies on `public.listings` and on `storage.objects`, which compare
 * `auth.uid()` to this same id inside Postgres. Editing the line below gets
 * someone a rendered sidebar whose every query comes back empty or refused.
 */
export const ADMIN_USER_ID = 'd97b7d76-720c-4c6f-94f4-647b33f39ef4'

/** Central Kushtia, used as the distance origin when geolocation is unavailable. */
export const KUSHTIA_CENTER = { lat: 23.9013, lng: 89.1206 } as const

export const MAP_DEFAULTS = {
  zoom: 14,
  detailZoom: 16,
  tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; OpenStreetMap contributors',
} as const

export const SEARCH = {
  debounceMs: 150,
  maxResults: 60,
  maxSuggestions: 6,
} as const

/** Artificial latency so loading skeletons exercise real code paths. */
export const FAKE_LATENCY_MS = 220

export const STORAGE_KEYS = {
  theme: 'elakai-theme',
  lang: 'elakai-lang',
  recentSearches: 'elakai-recent',
} as const
