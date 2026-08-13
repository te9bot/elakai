import type { AreaId, CategoryId, LatLng, Localized, WeeklyHours } from './types'

/* ==========================================================================
 * Healthcare directory — record shapes.
 *
 * The healthcare section is a searchable database, not a page of cards. Every
 * field below exists so the UI can `filter → search → sort → select → render`
 * without knowing anything about a specific facility. Adding 100 more records
 * to `src/data/healthcare.ts` must never require touching a component.
 *
 * Optional fields are optional on purpose: a record we only have a name for is
 * still a useful record. The UI renders what exists and stays quiet about the
 * rest rather than inventing filler.
 * ========================================================================== */

/** The six categories the healthcare section browses. */
export type HealthCategoryId = Extract<
  CategoryId,
  'hospital' | 'clinic' | 'doctor' | 'blood-bank' | 'pharmacy' | 'diagnostic'
>

/** Categories that hold facilities. `doctor` is a separate dataset. */
export type FacilityCategoryId = Exclude<HealthCategoryId, 'doctor'>

/* ------------------------------------------------------------------ */
/* Provenance                                                          */
/* ------------------------------------------------------------------ */

/**
 * Where a record came from. Rendered discreetly at the foot of every profile —
 * a directory that cannot say where its data came from is not worth trusting.
 *
 * `placeholder` is the honest label for a demonstration record. It is rendered
 * with a visible marker so nobody mistakes one for a real listing.
 */
export type SourceKind = 'official' | 'dghs' | 'facebook' | 'directory' | 'placeholder'

export type DataSource = {
  kind: SourceKind
  url?: string
  /** Free-text provenance, e.g. the name of the directory a record came from. */
  note?: Localized
  /** ISO date the record was last checked against its source. `null` = never. */
  verifiedAt: string | null
}

/* ------------------------------------------------------------------ */
/* Contact                                                             */
/* ------------------------------------------------------------------ */

export type HealthContact = {
  /** PLACEHOLDER while DEMO_MODE is true. See src/lib/config.ts. */
  phone?: string
  /** Separate appointment/serial line where one is published. */
  appointmentPhone?: string
  emergencyPhone?: string
  email?: string
  website?: string
  facebook?: string
}

/* ------------------------------------------------------------------ */
/* Facilities                                                          */
/* ------------------------------------------------------------------ */

export type HealthFacility = {
  kind: 'facility'
  id: string
  slug: string
  category: FacilityCategoryId
  name: Localized
  /** Alternate spellings and short forms, so "sono" and "ad din" both hit. */
  aliases?: string[]
  description: Localized
  /** Omitted when we do not have a verified street address — area still applies. */
  address?: Localized
  area: AreaId
  /** Falls back to the area centre. `coordsApprox` says which one is on screen. */
  coords?: LatLng
  contact: HealthContact
  hours?: WeeklyHours
  emergency24?: boolean
  /** প্রধান সেবাসমূহ — rendered as tags. */
  services?: Localized[]
  /** বিভাগ — clinical departments. */
  departments?: Localized[]
  /** পরীক্ষা-নিরীক্ষা — diagnostic tests offered. */
  tests?: Localized[]
  /** Doctor ids from the doctor dataset. */
  doctorIds?: string[]
  /** Only ever set when an actual source published it. See §6 of the brief. */
  rating?: number
  reviewCount?: number
  /** Surfaced on the landing screen before the user searches. */
  featured?: boolean
  source: DataSource
}

/* ------------------------------------------------------------------ */
/* Doctors                                                             */
/* ------------------------------------------------------------------ */

/** A doctor can sit at several chambers, so this is a list, not one address. */
export type Chamber = {
  /** Links the chamber to a facility record when it sits inside one. */
  facilityId?: string
  place: Localized
  area: AreaId
  /** Free text — published chamber hours rarely fit a weekly grid. */
  hours?: Localized
  phone?: string
}

export type Doctor = {
  kind: 'doctor'
  id: string
  slug: string
  category: 'doctor'
  name: Localized
  aliases?: string[]
  specialty: Localized
  /** MBBS, FCPS (Medicine), MD (Cardiology)… kept as written on the source. */
  qualifications: string[]
  designation?: Localized
  /** Facility ids this doctor is attached to. */
  facilityIds?: string[]
  chambers?: Chamber[]
  contact?: HealthContact
  /** Home area, used by the area filter when there are no chambers. */
  area: AreaId
  featured?: boolean
  source: DataSource
}

export type HealthRecord = HealthFacility | Doctor

/** Shape the whole dataset is grouped into. */
export type HealthcareData = {
  hospitals: HealthFacility[]
  clinics: HealthFacility[]
  doctors: Doctor[]
  bloodBanks: HealthFacility[]
  pharmacies: HealthFacility[]
  diagnostics: HealthFacility[]
}
