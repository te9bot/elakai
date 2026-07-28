/**
 * ==========================================================================
 * DEMO MODE — SAFETY CRITICAL. READ BEFORE CHANGING.
 * ==========================================================================
 *
 * Every phone number in `src/data/` is a placeholder. None of them reach a
 * real hospital, ambulance, police station, or business.
 *
 * A wrong emergency number causes real harm: someone dials it during an actual
 * emergency and loses time they do not have. So while DEMO_MODE is true the app
 * renders NO `tel:` links anywhere. Call buttons stay visually identical but
 * open a dialog explaining the data is not real.
 *
 * To go live:
 *   1. Replace every `phone` field in src/data/ with a verified real number.
 *   2. Verify them by actually dialling each one.
 *   3. Only then set DEMO_MODE to false.
 *
 * Do not flip this flag to "make the demo feel realistic". The dialog is the
 * feature, not a placeholder for one.
 */
export const DEMO_MODE = true

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
  demoBannerDismissed: 'elakai-demo-dismissed',
} as const
