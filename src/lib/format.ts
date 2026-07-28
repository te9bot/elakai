import type { LatLng, WeeklyHours } from '@/data/types'

/* ------------------------------------------------------------------ */
/* Distance                                                            */
/* ------------------------------------------------------------------ */

const EARTH_RADIUS_KM = 6371

/** Great-circle distance in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

/** "800 m" / "2.4 km" — the caller localises the digits. */
export function formatDistance(km: number, locale: 'bn' | 'en'): string {
  if (!Number.isFinite(km)) return ''
  if (km < 1) {
    const m = Math.max(50, Math.round(km * 1000) / 50 * 50)
    return locale === 'bn' ? `${m} মি` : `${m} m`
  }
  const v = km < 10 ? km.toFixed(1) : Math.round(km).toString()
  return locale === 'bn' ? `${v} কিমি` : `${v} km`
}

/* ------------------------------------------------------------------ */
/* Opening hours                                                       */
/* ------------------------------------------------------------------ */

export type OpenState = {
  isOpen: boolean
  isAlways: boolean
  /** Minutes-from-midnight of the next transition, if there is one today. */
  nextChange?: number
}

function minutesNow(now: Date): number {
  return now.getHours() * 60 + now.getMinutes()
}

export function getOpenState(hours: WeeklyHours, now: Date = new Date()): OpenState {
  if (hours === 'always') return { isOpen: true, isAlways: true }

  const today = hours[now.getDay()] ?? []
  const mins = minutesNow(now)

  for (const w of today) {
    if (mins >= w.open && mins < w.close) {
      return { isOpen: true, isAlways: false, nextChange: w.close }
    }
  }

  // Closed — find the next opening later today, if any.
  const upcoming = today.find((w) => w.open > mins)
  return { isOpen: false, isAlways: false, nextChange: upcoming?.open }
}

/** "9:00 AM" style clock, digits left ASCII for the caller to localise. */
export function formatTime(minutes: number, locale: 'bn' | 'en'): string {
  const h24 = Math.floor(minutes / 60)
  const m = minutes % 60
  const mm = String(m).padStart(2, '0')

  if (locale === 'bn') {
    // Bangla uses day-part words rather than AM/PM.
    const part = h24 < 6 ? 'ভোর' : h24 < 12 ? 'সকাল' : h24 < 16 ? 'দুপুর' : h24 < 19 ? 'বিকাল' : 'রাত'
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12
    return `${part} ${h12}:${mm}`
  }

  const suffix = h24 < 12 ? 'AM' : 'PM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${mm} ${suffix}`
}

export const DAY_NAMES: Record<'bn' | 'en', string[]> = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  bn: ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'],
}

/* ------------------------------------------------------------------ */
/* Money & phone                                                       */
/* ------------------------------------------------------------------ */

/** Groups by the South Asian lakh/crore convention: 1,20,000 not 120,000. */
export function formatBDT(amount: number): string {
  const s = Math.round(amount).toString()
  if (s.length <= 3) return `৳${s}`
  const last3 = s.slice(-3)
  const rest = s.slice(0, -3)
  return `৳${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}`
}

/** Strips formatting down to a dialable string. Only ever used when DEMO_MODE is off. */
export function toTelHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

/* ------------------------------------------------------------------ */
/* Directions                                                          */
/* ------------------------------------------------------------------ */

/**
 * Deep-links to Google Maps rather than rendering a map, so the common
 * "get me there" path costs no Leaflet download at all.
 */
export function directionsHref(coords: LatLng, label?: string): string {
  const q = `${coords.lat},${coords.lng}`
  const dest = label ? `${encodeURIComponent(label)}` : ''
  return `https://www.google.com/maps/dir/?api=1&destination=${q}${
    dest ? `&destination_place_id=&query=${dest}` : ''
  }`
}

/* ------------------------------------------------------------------ */
/* Generated artwork                                                   */
/* ------------------------------------------------------------------ */

/**
 * Deterministic gradient pairs used in place of photography. No network
 * request, no layout shift, and it keeps the palette coherent.
 */
const ART_PALETTE: [string, string][] = [
  ['#2563EB', '#60A5FA'],
  ['#0EA5E9', '#38BDF8'],
  ['#0891B2', '#22D3EE'],
  ['#059669', '#34D399'],
  ['#7C3AED', '#A78BFA'],
  ['#DB2777', '#F472B6'],
  ['#DC2626', '#F87171'],
  ['#EA580C', '#FB923C'],
  ['#CA8A04', '#FACC15'],
  ['#4F46E5', '#818CF8'],
]

export function artGradient(seed: number): { from: string; to: string; angle: number } {
  const [from, to] = ART_PALETTE[seed % ART_PALETTE.length]
  return { from, to, angle: 120 + ((seed * 37) % 120) }
}
