import type { Localized } from '@/lib/i18n'

export type { Localized }

export type LatLng = { lat: number; lng: number }

/** Top-level sections of the app. */
export type CategoryGroup = 'emergency' | 'healthcare' | 'services' | 'rentals' | 'utilities'

export type CategoryId =
  // healthcare
  | 'hospital'
  | 'clinic'
  | 'doctor'
  | 'blood-bank'
  | 'pharmacy'
  | 'diagnostic'
  | 'ambulance'
  // services
  | 'electrician'
  | 'plumber'
  | 'mechanic'
  | 'ac-repair'
  | 'generator-repair'
  | 'computer-repair'
  | 'mobile-repair'
  | 'internet'
  | 'water-supply'
  | 'lawyer'
  | 'tailor'
  | 'cleaning'
  // rentals
  | 'house'
  | 'apartment'
  | 'bachelor'
  | 'office'
  | 'shop'
  | 'warehouse'

export type Category = {
  id: CategoryId
  group: CategoryGroup
  name: Localized
  /** Emoji used on the home chips — renders everywhere with no icon payload. */
  emoji: string
  /** Lucide icon name, resolved through the icon registry. */
  icon: IconName
  /** Extra English + Bangla terms that should match this category in search. */
  keywords: string[]
}

export type IconName =
  | 'ambulance'
  | 'hospital'
  | 'stethoscope'
  | 'pill'
  | 'droplet'
  | 'microscope'
  | 'heart-pulse'
  | 'zap'
  | 'wrench'
  | 'car'
  | 'wind'
  | 'fuel'
  | 'laptop'
  | 'smartphone'
  | 'wifi'
  | 'droplets'
  | 'scale'
  | 'scissors'
  | 'sparkles'
  | 'home'
  | 'building'
  | 'building-2'
  | 'store'
  | 'warehouse'
  | 'bed'
  | 'shield'
  | 'flame'
  | 'phone'

/** One open/close window in 24h minutes-from-midnight. */
export type HoursWindow = { open: number; close: number }

/**
 * Index 0 is Sunday, matching `Date.getDay()`.
 * `null` means closed that day. `ALWAYS_OPEN` marks a 24/7 service.
 */
export type WeeklyHours = HoursWindow[][] | 'always'

export type Review = {
  id: string
  author: Localized
  rating: number
  comment: Localized
  /** ISO date. */
  date: string
}

export type Business = {
  id: string
  slug: string
  name: Localized
  category: CategoryId
  group: CategoryGroup
  description: Localized
  /** PLACEHOLDER. Never dialable while DEMO_MODE is true. See lib/config.ts. */
  phone: string
  website?: string
  address: Localized
  area: AreaId
  coords: LatLng
  verified: boolean
  rating: number
  reviewCount: number
  hours: WeeklyHours
  services: Localized[]
  /** Seeded index into the generated-artwork palette, so imagery is stable. */
  imageSeed: number
  photoCount: number
  reviews: Review[]
  /** ISO date the listing was last checked. */
  updatedAt: string
  featured?: boolean
}

export type TenantType = 'family' | 'bachelor' | 'any'

export type Rental = {
  id: string
  slug: string
  title: Localized
  category: Extract<
    CategoryId,
    'house' | 'apartment' | 'bachelor' | 'office' | 'shop' | 'warehouse'
  >
  description: Localized
  /** PLACEHOLDER. See lib/config.ts. */
  phone: string
  /** Monthly rent in BDT. */
  rent: number
  bedrooms: number
  bathrooms: number
  sizeSqft: number
  tenantType: TenantType
  furnished: boolean
  floor?: number
  area: AreaId
  address: Localized
  coords: LatLng
  verified: boolean
  imageSeed: number
  availableFrom: string
  updatedAt: string
}

export type EmergencyScope = 'national' | 'local'

export type EmergencyContact = {
  id: string
  name: Localized
  /** One or two words, for tiles too narrow to carry the full name. */
  short?: Localized
  description: Localized
  /** PLACEHOLDER. Never dialable while DEMO_MODE is true. */
  phone: string
  icon: IconName
  scope: EmergencyScope
  /** Drives the card treatment. */
  tone: 'danger' | 'primary' | 'neutral'
  available24: boolean
  coords?: LatLng
  address?: Localized
}

export type AreaId =
  | 'kushtia-sadar'
  | 'kumarkhali'
  | 'bheramara'
  | 'mirpur'
  | 'daulatpur'
  | 'khoksa'

export type Area = {
  id: AreaId
  name: Localized
  coords: LatLng
}

/** Shape returned by the search layer. */
export type ScoredBusiness = {
  business: Business
  score: number
  distanceKm: number
  isOpen: boolean
}
