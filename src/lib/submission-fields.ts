import { CATEGORIES, CATEGORY_MAP } from '@/data/categories'
import type { CategoryId } from '@/data/types'
import { LISTING_SECTIONS } from './listings'

/* ==========================================================================
 * What each kind of submission asks for.
 *
 * §19 of the brief wants the form to change with the category: a pharmacy is
 * asked about opening hours, a rental about monthly rent, an emergency contact
 * about neither. §18 says not to build a second category system to do it.
 *
 * Both hold, because the variation is smaller than it looks. Every submission
 * has a name, a description, a phone number, an address and a picture. What
 * actually differs is two columns — `price` and `availability` — which are free
 * text in `public.listings` and mean something different in each section:
 *
 *     section      price                availability
 *     ---------    -----------------    ---------------------
 *     healthcare   Consultation fee     Opening hours
 *     services     Typical price        When they work
 *     rentals      Monthly rent         Available from
 *     emergency    (not asked)          Hours of operation
 *     utilities    Typical charge       Office hours
 *
 * So this file is a label table, not a schema. It relabels two shared columns
 * per section, decides which of the optional fields to show, and stops. Adding
 * a section means adding a row here; it does not mean a migration, a new table,
 * or a second form component.
 *
 * The category list itself comes straight from src/data/categories.ts, the
 * catalogue the public site already organises itself by. A submitted category
 * therefore resolves to a name, an emoji and an icon on the public side the
 * moment it is approved, instead of rendering as a bare string.
 * ========================================================================== */

export type FieldSpec = {
  label: string
  /** Sits under the input. Says what a good answer looks like, not what the field is. */
  hint?: string
  placeholder?: string
  required?: boolean
  /** Renders a textarea rather than a single line. */
  multiline?: boolean
  inputMode?: 'text' | 'tel' | 'email' | 'numeric' | 'url'
}

export type SectionSpec = {
  id: string
  label: string
  /** One sentence on the front of the form, so the choice is not a guess. */
  blurb: string
  /** What the thing being described is called, for headings and messages. */
  noun: string
  /**
   * The section as the object of "add ___".
   *
   * Its own field because `label` cannot do this job. Half the labels are mass
   * nouns — "Healthcare", "Rental" — and gluing an article onto them produces
   * "adding a healthcare", which is what the signup subtitle said before this
   * existed. Written out per section rather than derived, because English
   * articles are not derivable from a string.
   */
  addPhrase: string
  title: FieldSpec
  description: FieldSpec
  /** Null when the section has no meaningful price. */
  price: FieldSpec | null
  availability: FieldSpec | null
  /** Whether to offer the services list editor. */
  services: { show: boolean; label: string; hint: string }
}

const SHARED_DESCRIPTION: FieldSpec = {
  label: 'Description',
  hint: 'What someone arriving here needs to know. Two or three sentences is plenty.',
  multiline: true,
}

/**
 * Ordered as the form offers them, which is roughly how often people submit
 * each one rather than alphabetically.
 */
export const SUBMISSION_SECTIONS: SectionSpec[] = [
  {
    id: 'healthcare',
    label: 'Healthcare',
    blurb: 'A pharmacy, hospital, clinic, diagnostic centre, doctor or blood bank.',
    noun: 'place',
    addPhrase: 'a healthcare place',
    title: {
      label: 'Name',
      placeholder: 'e.g. Amin Pharmacy',
      required: true,
      hint: 'The name on the sign, not a description of it.',
    },
    description: SHARED_DESCRIPTION,
    price: {
      label: 'Consultation or test fee',
      hint: 'Only if it is publicly advertised. Leave blank if you are not sure.',
      placeholder: 'e.g. 500 BDT',
    },
    availability: {
      label: 'Opening hours',
      placeholder: 'e.g. Sat–Thu, 9am–9pm',
      hint: 'Write it the way the sign does. "Open 24 hours" is fine.',
    },
    services: {
      show: true,
      label: 'Services offered',
      hint: 'One per line — X-ray, blood test, home delivery.',
    },
  },
  {
    id: 'services',
    label: 'Local service',
    blurb: 'An electrician, plumber, mechanic, repair shop, tailor, lawyer and so on.',
    noun: 'service',
    addPhrase: 'a local service',
    title: {
      label: 'Business or person’s name',
      placeholder: 'e.g. Rahim Electric Works',
      required: true,
    },
    description: SHARED_DESCRIPTION,
    price: {
      label: 'Typical price',
      hint: 'A range is more useful than an exact figure. Leave blank if it varies.',
      placeholder: 'e.g. 300–800 BDT per visit',
    },
    availability: {
      label: 'When they work',
      placeholder: 'e.g. Every day, 8am–8pm',
    },
    services: {
      show: true,
      label: 'What they do',
      hint: 'One per line — wiring, fan installation, emergency callout.',
    },
  },
  {
    id: 'rentals',
    label: 'Rental',
    blurb: 'A house, apartment, bachelor room, shop, office or warehouse to let.',
    noun: 'property',
    addPhrase: 'a rental',
    title: {
      label: 'Listing title',
      placeholder: 'e.g. 2-bedroom flat near NS Road',
      required: true,
      hint: 'Size and area, briefly. This is the line people scan.',
    },
    description: {
      ...SHARED_DESCRIPTION,
      hint: 'Rooms, floor, what is included, who it suits. Be specific about what is not included.',
    },
    price: {
      label: 'Monthly rent',
      required: true,
      inputMode: 'numeric',
      placeholder: 'e.g. 12000',
      hint: 'In BDT, per month. Say separately in the description if utilities are extra.',
    },
    availability: {
      label: 'Available from',
      placeholder: 'e.g. 1 September, or Immediately',
    },
    services: {
      show: true,
      label: 'What is included',
      hint: 'One per line — furnished, lift, parking, generator, water.',
    },
  },
  {
    id: 'utilities',
    label: 'Utility',
    blurb: 'Electricity, gas, water supply and other utility offices.',
    noun: 'office',
    addPhrase: 'a utility office',
    title: { label: 'Office or provider name', required: true },
    description: SHARED_DESCRIPTION,
    price: {
      label: 'Typical charge',
      hint: 'Only if it is a published figure.',
    },
    availability: { label: 'Office hours', placeholder: 'e.g. Sun–Thu, 9am–5pm' },
    services: {
      show: true,
      label: 'What they handle',
      hint: 'One per line — new connection, bill payment, fault reporting.',
    },
  },
  {
    id: 'emergency',
    label: 'Emergency contact',
    blurb: 'Police, fire, ambulance and other numbers people call in an emergency.',
    noun: 'contact',
    addPhrase: 'an emergency contact',
    title: { label: 'Service name', required: true, placeholder: 'e.g. Kushtia Fire Station' },
    description: {
      ...SHARED_DESCRIPTION,
      hint: 'When someone should call this rather than another number.',
    },
    /*
     * No price field, and this is not a shortcut.
     *
     * An emergency number with a price next to it invites exactly the hesitation
     * the page exists to remove. Whatever a fire service costs, nobody should be
     * reading a figure while deciding whether to dial.
     */
    price: null,
    availability: { label: 'Hours', placeholder: 'e.g. 24 hours' },
    services: { show: false, label: '', hint: '' },
  },
]

const BY_ID = new Map(SUBMISSION_SECTIONS.map((s) => [s.id, s]))

/**
 * The spec for a section, falling back to Local service.
 *
 * Falls back rather than throwing because `section` can arrive from a query
 * string — the "Add Pharmacy" deep link, a stale bookmark — and a form that
 * renders a plausible default is better than one that renders an error for a
 * typo in a URL.
 */
export function sectionSpec(id: string): SectionSpec {
  return BY_ID.get(id) ?? BY_ID.get('services')!
}

/** Categories offered for a section, from the site's own catalogue. */
export function categoriesFor(section: string): { id: CategoryId; label: string; emoji?: string }[] {
  const scoped = CATEGORIES.filter((c) => c.group === section)
  const source = scoped.length ? scoped : CATEGORIES
  return source.map((c) => ({ id: c.id, label: c.name.en, emoji: c.emoji }))
}

export function categoryLabel(id: string): string {
  return CATEGORY_MAP[id as CategoryId]?.name.en ?? id
}

/**
 * "pharmacy" -> "a pharmacy", "electrician" -> "an electrician".
 *
 * A vowel test, which is the wrong rule about one English word in fifty ("an
 * hour", "a university") and the right one about the category names this
 * catalogue actually contains — every id in src/data/categories.ts is checked
 * by that list, not by this function. Used only for a category label; the
 * section phrases are written out in full on `addPhrase` precisely because
 * they are the cases a rule cannot get right.
 */
export function withArticle(word: string): string {
  return `${/^[aeiou]/i.test(word) ? 'an' : 'a'} ${word}`
}

/**
 * The section a category belongs to.
 *
 * Lets an "Add Pharmacy" link carry only the category and have the section
 * follow, so the two can never be sent out of step with each other.
 */
export function sectionForCategory(category: string): string | null {
  const found = CATEGORY_MAP[category as CategoryId]
  if (!found) return null
  return LISTING_SECTIONS.some((s) => s.id === found.group) ? found.group : null
}
