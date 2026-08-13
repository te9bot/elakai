import { AREAS, CATEGORIES } from '@/data/categories'
import type { FormConfig } from '@/components/admin/resource-form'
import type { ResourceConfig } from '@/components/admin/resource-list'
import type { RecordStatus } from '@/lib/db'

/* ==========================================================================
 * Entity descriptors.
 *
 * Each entity declares its table, its columns and its form sections once; the
 * shared list and form components in components/admin do the rest.
 *
 * Option lists come from the bundled reference data, which is also what seeds
 * the `areas` and `categories` tables — one source, so they cannot disagree.
 * When the category admin screen lands these become queries.
 * ========================================================================== */

const AREA_OPTIONS = AREAS.map((a) => ({ value: a.id, label: a.name.en }))

const categoryOptions = (group: string) =>
  CATEGORIES.filter((c) => c.group === group).map((c) => ({ value: c.id, label: c.name.en }))

const HEALTH_FACILITY_OPTIONS = CATEGORIES.filter(
  (c) => c.group === 'healthcare' && c.id !== 'doctor' && c.id !== 'ambulance',
).map((c) => ({ value: c.id, label: c.name.en }))

const SERVICE_CATEGORY_OPTIONS = [...categoryOptions('services'), ...categoryOptions('utilities')]

const VERIFICATION_OPTIONS = [
  { value: 'unverified', label: 'Unverified' },
  { value: 'partial', label: 'Partially verified' },
  { value: 'verified', label: 'Verified' },
]

const SOURCE_OPTIONS = [
  { value: 'official', label: 'Official website' },
  { value: 'dghs', label: 'DGHS' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'directory', label: 'Business directory' },
  { value: 'placeholder', label: 'Placeholder / demo' },
  { value: 'other', label: 'Other' },
]

/** Shared last section — publication state reads the same on every entity. */
const publication = (featured = true) => ({
  heading: 'Publication',
  description: 'Drafts and archived records never appear on the public site.',
  fields: [
    ...(featured
      ? [
          {
            kind: 'toggle' as const,
            name: 'featured',
            label: 'Featured',
            hint: 'Promoted on the homepage and section landing screens.',
          },
        ]
      : []),
  ],
})

/** Provenance block — healthcare only, where "who says so" is the whole point. */
const provenance = {
  heading: 'Source and confidence',
  description:
    'Where this information came from, and how sure we are. Shown on the public profile — do not mark something verified that has not been checked.',
  fields: [
    { kind: 'select' as const, name: 'verification', label: 'Confidence', options: VERIFICATION_OPTIONS },
    { kind: 'select' as const, name: 'source_kind', label: 'Source type', options: SOURCE_OPTIONS },
    { kind: 'url' as const, name: 'source_url', label: 'Source link', wide: true },
    { kind: 'date' as const, name: 'source_verified_at', label: 'Last checked on' },
  ],
}

const nameCell = (row: { name_en?: string; name_bn?: string }) => row.name_en || row.name_bn || '—'

/* ================================================================== */
/* Healthcare facilities                                               */
/* ================================================================== */

type FacilityListRow = {
  id: string
  slug: string
  name_en: string
  name_bn: string
  category: string
  area_id: string | null
  status: RecordStatus
  featured: boolean
  verification: string
  updated_at: string
}

export const facilitiesList: ResourceConfig<FacilityListRow> = {
  table: 'facilities',
  select: 'id, slug, name_en, name_bn, category, area_id, status, featured, verification, updated_at',
  title: 'Healthcare facilities',
  singular: 'facility',
  basePath: '/admin/facilities',
  searchColumns: ['name_en', 'name_bn', 'slug'],
  searchPlaceholder: 'Search by name…',
  defaultSort: { column: 'updated_at', ascending: false },
  hasFeatured: true,
  getId: (r) => r.id,
  getLabel: nameCell,
  getStatus: (r) => r.status,
  getFeatured: (r) => r.featured,
  publicPath: (r) => `/elakai/healthcare/${r.slug}`,
  filters: [
    { column: 'category', label: 'All categories', options: HEALTH_FACILITY_OPTIONS },
    { column: 'area_id', label: 'All areas', options: AREA_OPTIONS },
  ],
  columns: [
    { key: 'name', header: 'Name', render: nameCell },
    { key: 'category', header: 'Category', render: (r) => r.category },
    { key: 'area', header: 'Area', render: (r) => r.area_id ?? '—' },
    { key: 'verification', header: 'Confidence', render: (r) => r.verification, desktopOnly: true },
  ],
}

export const facilityForm: FormConfig = {
  table: 'facilities',
  select: '*',
  title: 'Healthcare facilities',
  singular: 'facility',
  basePath: '/admin/facilities',
  labelField: 'name_en',
  slugField: 'slug',
  hasFeatured: true,
  publicPath: (v) => (v.slug ? `/elakai/healthcare/${v.slug}` : null),
  validate: (v) =>
    !v.name_en && !v.name_bn
      ? 'Give the facility a name in at least one language.'
      : !v.slug
        ? 'A slug is required — it forms the public web address.'
        : null,
  sections: [
    {
      heading: 'Basic information',
      fields: [
        { kind: 'text', name: 'name_en', label: 'Name (English)', required: true },
        { kind: 'text', name: 'name_bn', label: 'Name (Bengali)' },
        {
          kind: 'text',
          name: 'slug',
          label: 'Web address',
          hint: 'Appears in the URL. Changing it breaks existing links.',
          required: true,
        },
        { kind: 'select', name: 'category', label: 'Category', options: HEALTH_FACILITY_OPTIONS, required: true },
        { kind: 'list', name: 'aliases', label: 'Also known as', hint: 'Comma separated. Helps search find it.', wide: true },
        { kind: 'textarea', name: 'description_en', label: 'Description (English)', wide: true },
        { kind: 'textarea', name: 'description_bn', label: 'Description (Bengali)', wide: true },
      ],
    },
    {
      heading: 'Contact',
      fields: [
        { kind: 'tel', name: 'phone', label: 'Phone' },
        { kind: 'tel', name: 'emergency_phone', label: 'Emergency phone' },
        { kind: 'tel', name: 'appointment_phone', label: 'Appointment / serial line' },
        { kind: 'email', name: 'email', label: 'Email' },
        { kind: 'url', name: 'website', label: 'Website' },
        { kind: 'url', name: 'facebook', label: 'Facebook page' },
      ],
    },
    {
      heading: 'Location',
      fields: [
        { kind: 'text', name: 'address_en', label: 'Address (English)', wide: true },
        { kind: 'text', name: 'address_bn', label: 'Address (Bengali)', wide: true },
        { kind: 'select', name: 'area_id', label: 'Area', options: AREA_OPTIONS },
        { kind: 'url', name: 'map_url', label: 'Map link' },
        { kind: 'number', name: 'lat', label: 'Latitude', hint: 'Leave blank to place it at the area centre.' },
        { kind: 'number', name: 'lng', label: 'Longitude' },
      ],
    },
    {
      heading: 'Availability',
      fields: [
        { kind: 'toggle', name: 'always_open', label: 'Open 24 hours' },
        { kind: 'toggle', name: 'emergency_24', label: 'Emergency service around the clock' },
      ],
    },
    provenance,
    publication(),
  ],
}

/* ================================================================== */
/* Doctors                                                             */
/* ================================================================== */

type DoctorListRow = {
  id: string
  slug: string
  name_en: string
  name_bn: string
  specialty_en: string | null
  area_id: string | null
  status: RecordStatus
  featured: boolean
  updated_at: string
}

export const doctorsList: ResourceConfig<DoctorListRow> = {
  table: 'doctors',
  select: 'id, slug, name_en, name_bn, specialty_en, area_id, status, featured, updated_at',
  title: 'Doctors',
  singular: 'doctor',
  basePath: '/admin/doctors',
  searchColumns: ['name_en', 'name_bn', 'specialty_en', 'slug'],
  searchPlaceholder: 'Search by name or specialty…',
  defaultSort: { column: 'updated_at', ascending: false },
  hasFeatured: true,
  getId: (r) => r.id,
  getLabel: nameCell,
  getStatus: (r) => r.status,
  getFeatured: (r) => r.featured,
  filters: [{ column: 'area_id', label: 'All areas', options: AREA_OPTIONS }],
  columns: [
    { key: 'name', header: 'Name', render: nameCell },
    { key: 'specialty', header: 'Specialty', render: (r) => r.specialty_en ?? '—' },
    { key: 'area', header: 'Area', render: (r) => r.area_id ?? '—', desktopOnly: true },
  ],
}

export const doctorForm: FormConfig = {
  table: 'doctors',
  select: '*',
  title: 'Doctors',
  singular: 'doctor',
  basePath: '/admin/doctors',
  labelField: 'name_en',
  slugField: 'slug',
  hasFeatured: true,
  publicPath: (v) => (v.slug ? `/elakai/healthcare/${v.slug}` : null),
  validate: (v) =>
    !v.name_en && !v.name_bn ? 'Give the doctor a name in at least one language.' : !v.slug ? 'A slug is required.' : null,
  sections: [
    {
      heading: 'Basic information',
      fields: [
        { kind: 'text', name: 'name_en', label: 'Name (English)', required: true },
        { kind: 'text', name: 'name_bn', label: 'Name (Bengali)' },
        { kind: 'text', name: 'slug', label: 'Web address', required: true },
        { kind: 'list', name: 'qualifications', label: 'Qualifications', hint: 'Comma separated, e.g. MBBS, FCPS (Medicine)', wide: true },
        { kind: 'text', name: 'specialty_en', label: 'Specialty (English)' },
        { kind: 'text', name: 'specialty_bn', label: 'Specialty (Bengali)' },
        { kind: 'text', name: 'designation_en', label: 'Position (English)' },
        { kind: 'text', name: 'designation_bn', label: 'Position (Bengali)' },
      ],
    },
    {
      heading: 'Contact',
      fields: [
        { kind: 'tel', name: 'phone', label: 'Phone' },
        { kind: 'tel', name: 'appointment_phone', label: 'Appointment phone' },
        { kind: 'email', name: 'email', label: 'Email' },
        { kind: 'url', name: 'website', label: 'Website' },
        { kind: 'url', name: 'facebook', label: 'Facebook' },
        { kind: 'select', name: 'area_id', label: 'Home area', options: AREA_OPTIONS },
      ],
    },
    provenance,
    publication(),
  ],
}

/* ================================================================== */
/* Local services                                                      */
/* ================================================================== */

type BusinessListRow = {
  id: string
  slug: string
  name_en: string
  name_bn: string
  category: string
  area_id: string | null
  verified: boolean
  status: RecordStatus
  featured: boolean
  updated_at: string
}

export const businessesList: ResourceConfig<BusinessListRow> = {
  table: 'businesses',
  select: 'id, slug, name_en, name_bn, category, area_id, verified, status, featured, updated_at',
  title: 'Local services',
  singular: 'listing',
  basePath: '/admin/businesses',
  searchColumns: ['name_en', 'name_bn', 'slug'],
  defaultSort: { column: 'updated_at', ascending: false },
  hasFeatured: true,
  getId: (r) => r.id,
  getLabel: nameCell,
  getStatus: (r) => r.status,
  getFeatured: (r) => r.featured,
  publicPath: (r) => `/elakai/business/${r.slug}`,
  filters: [
    { column: 'category', label: 'All categories', options: SERVICE_CATEGORY_OPTIONS },
    { column: 'area_id', label: 'All areas', options: AREA_OPTIONS },
  ],
  columns: [
    { key: 'name', header: 'Name', render: nameCell },
    { key: 'category', header: 'Category', render: (r) => r.category },
    { key: 'area', header: 'Area', render: (r) => r.area_id ?? '—' },
    { key: 'verified', header: 'Verified', render: (r) => (r.verified ? 'Yes' : 'No'), desktopOnly: true },
  ],
}

export const businessForm: FormConfig = {
  table: 'businesses',
  select: '*',
  title: 'Local services',
  singular: 'listing',
  basePath: '/admin/businesses',
  labelField: 'name_en',
  slugField: 'slug',
  hasFeatured: true,
  publicPath: (v) => (v.slug ? `/elakai/business/${v.slug}` : null),
  validate: (v) =>
    !v.name_en && !v.name_bn
      ? 'Give the listing a name in at least one language.'
      : !v.slug
        ? 'A slug is required.'
        : !v.category
          ? 'Pick a category — it decides where the listing appears.'
          : !v.group
            ? 'Pick a section.'
            : null,
  sections: [
    {
      heading: 'Basic information',
      fields: [
        { kind: 'text', name: 'name_en', label: 'Name (English)', required: true },
        { kind: 'text', name: 'name_bn', label: 'Name (Bengali)' },
        { kind: 'text', name: 'slug', label: 'Web address', required: true },
        { kind: 'select', name: 'category', label: 'Category', options: SERVICE_CATEGORY_OPTIONS, required: true },
        {
          kind: 'select',
          name: 'group',
          label: 'Section',
          hint: 'Which top-level part of the site this belongs to.',
          options: [
            { value: 'services', label: 'Local services' },
            { value: 'utilities', label: 'Utilities' },
            { value: 'healthcare', label: 'Healthcare' },
          ],
          required: true,
        },
        { kind: 'textarea', name: 'description_en', label: 'Description (English)', wide: true },
        { kind: 'textarea', name: 'description_bn', label: 'Description (Bengali)', wide: true },
      ],
    },
    {
      heading: 'Contact',
      fields: [
        { kind: 'tel', name: 'phone', label: 'Phone' },
        { kind: 'email', name: 'email', label: 'Email' },
        { kind: 'url', name: 'website', label: 'Website' },
        { kind: 'url', name: 'facebook', label: 'Facebook' },
      ],
    },
    {
      heading: 'Location',
      fields: [
        { kind: 'text', name: 'address_en', label: 'Address (English)', wide: true },
        { kind: 'text', name: 'address_bn', label: 'Address (Bengali)', wide: true },
        { kind: 'select', name: 'area_id', label: 'Area', options: AREA_OPTIONS },
        { kind: 'number', name: 'lat', label: 'Latitude' },
        { kind: 'number', name: 'lng', label: 'Longitude' },
      ],
    },
    {
      heading: 'Status',
      fields: [
        { kind: 'toggle', name: 'verified', label: 'Verified listing', hint: 'Shown with a verified mark on cards.' },
        { kind: 'toggle', name: 'always_open', label: 'Open 24 hours' },
      ],
    },
    publication(),
  ],
}

/* ================================================================== */
/* Rentals                                                             */
/* ================================================================== */

type RentalListRow = {
  id: string
  slug: string
  title_en: string
  title_bn: string
  category: string
  area_id: string | null
  rent: number
  status: RecordStatus
  featured: boolean
  updated_at: string
}

const rentalLabel = (r: { title_en?: string; title_bn?: string }) => r.title_en || r.title_bn || '—'

export const rentalsList: ResourceConfig<RentalListRow> = {
  table: 'rentals',
  select: 'id, slug, title_en, title_bn, category, area_id, rent, status, featured, updated_at',
  title: 'Rentals',
  singular: 'property',
  basePath: '/admin/rentals',
  searchColumns: ['title_en', 'title_bn', 'slug'],
  defaultSort: { column: 'updated_at', ascending: false },
  hasFeatured: true,
  getId: (r) => r.id,
  getLabel: rentalLabel,
  getStatus: (r) => r.status,
  getFeatured: (r) => r.featured,
  filters: [
    { column: 'category', label: 'All types', options: categoryOptions('rentals') },
    { column: 'area_id', label: 'All areas', options: AREA_OPTIONS },
  ],
  columns: [
    { key: 'name', header: 'Title', render: rentalLabel },
    { key: 'category', header: 'Type', render: (r) => r.category },
    { key: 'rent', header: 'Rent', render: (r) => `৳${r.rent.toLocaleString()}` },
    { key: 'area', header: 'Area', render: (r) => r.area_id ?? '—', desktopOnly: true },
  ],
}

export const rentalForm: FormConfig = {
  table: 'rentals',
  select: '*',
  title: 'Rentals',
  singular: 'property',
  basePath: '/admin/rentals',
  labelField: 'title_en',
  slugField: 'slug',
  hasFeatured: true,
  validate: (v) =>
    !v.title_en && !v.title_bn
      ? 'Give the property a title in at least one language.'
      : !v.slug
        ? 'A slug is required.'
        : v.rent == null || Number(v.rent) <= 0
          ? 'Enter the monthly rent.'
          : null,
  sections: [
    {
      heading: 'Basic information',
      fields: [
        { kind: 'text', name: 'title_en', label: 'Title (English)', required: true },
        { kind: 'text', name: 'title_bn', label: 'Title (Bengali)' },
        { kind: 'text', name: 'slug', label: 'Web address', required: true },
        { kind: 'select', name: 'category', label: 'Property type', options: categoryOptions('rentals'), required: true },
        { kind: 'textarea', name: 'description_en', label: 'Description (English)', wide: true },
        { kind: 'textarea', name: 'description_bn', label: 'Description (Bengali)', wide: true },
      ],
    },
    {
      heading: 'The property',
      fields: [
        { kind: 'number', name: 'rent', label: 'Monthly rent (৳)', required: true },
        { kind: 'number', name: 'size_sqft', label: 'Size (sq ft)' },
        { kind: 'number', name: 'bedrooms', label: 'Bedrooms' },
        { kind: 'number', name: 'bathrooms', label: 'Bathrooms' },
        { kind: 'number', name: 'floor', label: 'Floor' },
        {
          kind: 'select',
          name: 'tenant_type',
          label: 'Suitable for',
          options: [
            { value: 'family', label: 'Family' },
            { value: 'bachelor', label: 'Bachelor' },
            { value: 'any', label: 'Anyone' },
          ],
        },
        { kind: 'toggle', name: 'furnished', label: 'Furnished' },
      ],
    },
    {
      heading: 'Location',
      fields: [
        { kind: 'text', name: 'address_en', label: 'Address (English)', wide: true },
        { kind: 'text', name: 'address_bn', label: 'Address (Bengali)', wide: true },
        { kind: 'select', name: 'area_id', label: 'Area', options: AREA_OPTIONS },
        { kind: 'number', name: 'lat', label: 'Latitude' },
        { kind: 'number', name: 'lng', label: 'Longitude' },
      ],
    },
    {
      heading: 'Owner and availability',
      fields: [
        { kind: 'text', name: 'owner_name', label: 'Owner name' },
        { kind: 'tel', name: 'owner_phone', label: 'Owner phone' },
        { kind: 'date', name: 'available_from', label: 'Available from' },
        { kind: 'toggle', name: 'verified', label: 'Verified listing' },
      ],
    },
    publication(),
  ],
}

/* ================================================================== */
/* Emergency contacts                                                  */
/* ================================================================== */

type EmergencyListRow = {
  id: string
  name_en: string
  name_bn: string
  phone: string
  scope: string
  priority: number
  status: RecordStatus
}

export const emergencyList: ResourceConfig<EmergencyListRow> = {
  table: 'emergency_contacts',
  select: 'id, name_en, name_bn, phone, scope, priority, status',
  title: 'Emergency contacts',
  singular: 'contact',
  basePath: '/admin/emergency',
  searchColumns: ['name_en', 'name_bn', 'phone'],
  // Ordered the way the public cards are, so the list reads as the thing it controls.
  defaultSort: { column: 'priority', ascending: true },
  getId: (r) => r.id,
  getLabel: nameCell,
  getStatus: (r) => r.status,
  filters: [
    {
      column: 'scope',
      label: 'All scopes',
      options: [
        { value: 'national', label: 'National' },
        { value: 'local', label: 'Local' },
      ],
    },
  ],
  columns: [
    { key: 'name', header: 'Name', render: nameCell },
    { key: 'phone', header: 'Phone', render: (r) => r.phone },
    { key: 'scope', header: 'Scope', render: (r) => r.scope },
    { key: 'priority', header: 'Order', render: (r) => String(r.priority), desktopOnly: true },
  ],
}

export const emergencyForm: FormConfig = {
  table: 'emergency_contacts',
  select: '*',
  title: 'Emergency contacts',
  singular: 'contact',
  basePath: '/admin/emergency',
  labelField: 'name_en',
  validate: (v) =>
    !v.name_en && !v.name_bn
      ? 'Give the contact a name in at least one language.'
      : !v.phone
        ? 'A phone number is required — this card exists to be dialled.'
        : !v.id
          ? 'An id is required. Use a short slug such as “fire-service”.'
          : null,
  sections: [
    {
      heading: 'Basic information',
      fields: [
        {
          kind: 'text',
          name: 'id',
          label: 'Id',
          hint: 'Short and permanent, e.g. fire-service.',
          required: true,
          lockedAfterCreate: true,
        },
        { kind: 'text', name: 'name_en', label: 'Name (English)', required: true },
        { kind: 'text', name: 'name_bn', label: 'Name (Bengali)' },
        { kind: 'text', name: 'short_en', label: 'Short label (English)', hint: 'For narrow tiles.' },
        { kind: 'text', name: 'short_bn', label: 'Short label (Bengali)' },
        { kind: 'textarea', name: 'description_en', label: 'Description (English)', wide: true },
        { kind: 'textarea', name: 'description_bn', label: 'Description (Bengali)', wide: true },
      ],
    },
    {
      heading: 'Contact and presentation',
      fields: [
        { kind: 'tel', name: 'phone', label: 'Phone', required: true },
        { kind: 'text', name: 'icon', label: 'Icon', hint: 'Icon name, e.g. ambulance, shield, flame, phone.' },
        {
          kind: 'select',
          name: 'scope',
          label: 'Scope',
          options: [
            { value: 'national', label: 'National' },
            { value: 'local', label: 'Local' },
          ],
        },
        {
          kind: 'select',
          name: 'tone',
          label: 'Card treatment',
          options: [
            { value: 'danger', label: 'Urgent (red)' },
            { value: 'primary', label: 'Primary (blue)' },
            { value: 'neutral', label: 'Neutral' },
          ],
        },
        { kind: 'number', name: 'priority', label: 'Display order', hint: 'Lower numbers appear first.' },
        { kind: 'toggle', name: 'available_24', label: 'Available 24 hours' },
      ],
    },
    {
      heading: 'Location',
      fields: [
        { kind: 'text', name: 'address_en', label: 'Address (English)', wide: true },
        { kind: 'text', name: 'address_bn', label: 'Address (Bengali)', wide: true },
        { kind: 'number', name: 'lat', label: 'Latitude' },
        { kind: 'number', name: 'lng', label: 'Longitude' },
      ],
    },
    publication(false),
  ],
}

/* ================================================================== */
/* Homepage coverage bands                                             */
/* ================================================================== */

/**
 * The two homepage strips — "Covering" in the hero, and "Everything ELAKAI
 * covers" further down — are one table split on `band`.
 *
 * Rows are deliberately thin. A row picks a category and a position; the name,
 * emoji and icon come from the category itself, so renaming Ambulance renames
 * it in the catalogue, the search and both strips at once. `label_en` /
 * `label_bn` exist only for the rare case where the strip wants shorter wording
 * than the category's own name.
 *
 * Nothing about how the strip animates is editable here, because nothing about
 * it is fixed: the bands measure whatever this returns and derive the loop
 * distance, copy count and drag from the rendered result. Publish a chip and
 * the loop gets longer. Archive one and it gets shorter. See
 * src/components/infinite-track.tsx.
 */

const BAND_OPTIONS = [
  { value: 'covering', label: 'Covering — hero strip' },
  { value: 'covers', label: 'Everything ELAKAI covers' },
]

const BAND_LABEL: Record<string, string> = {
  covering: 'Covering',
  covers: 'Everything covers',
}

const ALL_CATEGORY_OPTIONS = CATEGORIES.map((c) => ({
  value: c.id,
  label: `${c.emoji ? `${c.emoji} ` : ''}${c.name.en}`,
}))

const CATEGORY_NAME: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.name.en]),
)

type CategoryBarListRow = {
  id: string
  category_id: string
  band: string
  label_en: string | null
  sort_order: number
  status: RecordStatus
}

export const categoryBarList: ResourceConfig<CategoryBarListRow> = {
  table: 'category_bar_items',
  select: 'id, category_id, band, label_en, sort_order, status',
  title: 'Homepage bands',
  singular: 'chip',
  basePath: '/admin/coverage',
  searchColumns: ['category_id', 'label_en'],
  searchPlaceholder: 'Search by category…',
  // Band first, then position: the list reads top to bottom in the same order
  // the two strips do, which is the only way to sanity-check an ordering
  // without leaving the page.
  defaultSort: { column: 'sort_order', ascending: true },
  getId: (r) => r.id,
  getLabel: (r) => r.label_en || CATEGORY_NAME[r.category_id] || r.category_id,
  getStatus: (r) => r.status,
  filters: [
    {
      column: 'band',
      label: 'Both bands',
      options: BAND_OPTIONS,
    },
  ],
  columns: [
    {
      key: 'category',
      header: 'Category',
      render: (r) => r.label_en || CATEGORY_NAME[r.category_id] || r.category_id,
    },
    { key: 'band', header: 'Band', render: (r) => BAND_LABEL[r.band] ?? r.band },
    {
      key: 'sort_order',
      header: 'Order',
      render: (r) => String(r.sort_order),
      desktopOnly: true,
    },
  ],
}

export const categoryBarForm: FormConfig = {
  table: 'category_bar_items',
  select: '*',
  title: 'Homepage bands',
  singular: 'chip',
  basePath: '/admin/coverage',
  labelField: 'label_en',
  validate: (v) =>
    !v.category_id
      ? 'Pick a category — the chip takes its name, emoji and icon from it.'
      : !v.band
        ? 'Pick which band this chip belongs to.'
        : null,
  sections: [
    {
      heading: 'Placement',
      description:
        'A category may appear in both bands. Within a band, chips run in ascending order — the strip loops, so the last one is followed by the first.',
      fields: [
        {
          kind: 'select',
          name: 'category_id',
          label: 'Category',
          options: ALL_CATEGORY_OPTIONS,
          required: true,
        },
        { kind: 'select', name: 'band', label: 'Band', options: BAND_OPTIONS, required: true },
        {
          kind: 'number',
          name: 'sort_order',
          label: 'Order',
          hint: 'Lower comes first. Gaps are fine — leave room to insert later.',
        },
      ],
    },
    {
      heading: 'Overrides',
      description:
        'Leave these empty unless the strip needs shorter wording than the category name, or the chip should open somewhere other than its category search.',
      fields: [
        { kind: 'text', name: 'label_en', label: 'Label (English)' },
        { kind: 'text', name: 'label_bn', label: 'Label (Bengali)' },
        {
          kind: 'text',
          name: 'target_path',
          label: 'Link target',
          hint: 'App path, e.g. /healthcare. Defaults to the category search.',
          wide: true,
        },
      ],
    },
    publication(false),
  ],
}
