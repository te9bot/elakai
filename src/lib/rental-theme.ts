import { ART_PALETTE } from './format'
import type { Rental } from '@/data/types'

/* ==========================================================================
 * Rental category themes.
 *
 * NO NEW COLOUR IS INTRODUCED HERE.
 *
 * Every value below is an index into ART_PALETTE (src/lib/format.ts) — the
 * gradient set that already draws the artwork on every listing card in the
 * app. Pinning a category to one of those pairs means the card's art, its
 * accent chrome and its stacked hover layers all read as one colour instead of
 * three unrelated ones, and it keeps the rentals grid inside the palette the
 * rest of the site already uses.
 *
 * The six assignments follow the roles the brief describes, using the hues
 * already present in the project:
 *
 *   house      → blue    (the pair nearest --primary, the brand accent)
 *   apartment  → emerald (the pair nearest --success, the secondary accent)
 *   bachelor   → orange  (the existing warm accent)
 *   office     → cyan    (the existing cool accent)
 *   shop       → violet  (the existing alternate accent)
 *   warehouse  → indigo  (the existing neutral-leaning accent)
 *
 * To retheme a category, change its index. Do not paste in a hex.
 * ========================================================================== */

type RentalCategory = Rental['category']

const PALETTE_INDEX: Record<RentalCategory, number> = {
  house: 0, // #2563EB / #60A5FA
  apartment: 3, // #059669 / #34D399
  bachelor: 7, // #EA580C / #FB923C
  office: 2, // #0891B2 / #22D3EE
  shop: 4, // #7C3AED / #A78BFA
  warehouse: 9, // #4F46E5 / #818CF8
}

export type RentalTheme = {
  /** Index into ART_PALETTE — pass to ListingArt so the art matches the chrome. */
  paletteIndex: number
  /** The deeper half of the pair. Carries white text at AA. */
  base: string
  /** The lighter half of the pair. Decoration only — never behind white text. */
  light: string
}

export function rentalTheme(category: RentalCategory): RentalTheme {
  const paletteIndex = PALETTE_INDEX[category]
  const [base, light] = ART_PALETTE[paletteIndex]
  return { paletteIndex, base, light }
}

/**
 * `#RRGGBB` → `rgb(r g b / a)`.
 *
 * The stacked hover layers and the hover glow are translucent shades of the
 * card's own accent, which is what makes the stack read as depth on one colour
 * rather than as a second palette sitting underneath.
 */
export function withAlpha(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgb(${r} ${g} ${b} / ${alpha})`
}
