/* ==========================================================================
 * Phone numbers — the one place the app decides what is dialable.
 *
 * Replaces the global DEMO_MODE tel: block that used to live in
 * `components/call-button.tsx`. That flag was right about the danger and wrong
 * about the mechanism: it keyed on a build constant, so it had to refuse every
 * number in the app to protect against the fake ones, which meant a real number
 * typed into the admin panel could not be dialled either.
 *
 * Dialability is a property of the number, decided here:
 *
 *   - Numbers in the reserved +880 1700-000-XXX range are the documented
 *     placeholders in `src/data/`. They never produce a tel: link, no build
 *     flag can make them, and adding a new one cannot accidentally go live.
 *   - Anything else that parses as a valid Bangladesh number dials.
 *
 * That is what makes "an admin saves 01712-243514 and a visitor can tap to
 * call it" true while "someone dials a placeholder during an emergency" stays
 * impossible. See `src/lib/config.ts` for the safety rationale this preserves.
 * ========================================================================== */

export type PhoneKind =
  /** +880 1X-XXXXXXXX — an 11-digit national mobile number. */
  | 'mobile'
  /** An area-code landline, e.g. Kushtia's 071. */
  | 'landline'
  /** A national short code such as 999 or 16263. Dialled verbatim. */
  | 'short'
  /** Nothing dialable could be recovered from the input. */
  | 'invalid'

export type NormalizedPhone = {
  /**
   * The canonical dialable form — E.164 for mobiles and landlines, the bare
   * digits for a short code. Null whenever the number must not be dialled,
   * which is the single signal every call site keys off.
   */
  e164: string | null
  /** Human-friendly rendering. Never empty for non-blank input. */
  display: string
  kind: PhoneKind
  /** True for the reserved placeholder range. Such numbers never dial. */
  placeholder: boolean
}

const COUNTRY = '880'

/**
 * The reserved placeholder block used throughout `src/data/`.
 *
 * Matched against the national significant number (the leading 0 stripped), so
 * it catches every way the same fake number can be written: "+880 1700-000-901",
 * "8801700000901" and "01700000901" all land here.
 */
const PLACEHOLDER_NSN = /^1700000\d{3}$/

/** Bangladesh mobile: 10 digits after the trunk 0, opening 13–19. */
const MOBILE_NSN = /^1[3-9]\d{8}$/

/**
 * Landline national significant numbers: a 1–5 digit area code followed by the
 * subscriber number, 6–10 digits in total and never opening with 1 (that space
 * belongs to mobiles). Deliberately permissive — Bangladesh has a wide spread of
 * area-code lengths, and rejecting a real number is a worse failure here than
 * accepting an odd one.
 */
const LANDLINE_NSN = /^[2-9]\d{5,9}$/

/** Emergency and service short codes: 999, 333, 16263, 10921. */
const SHORT_CODE = /^\d{3,5}$/

/**
 * Reduces any written form to `{ digits, hadPlus }`.
 *
 * Everything that is not a digit or a leading plus is formatting: spaces,
 * hyphens, brackets, and the Bengali digits an admin may well type, which are
 * folded to ASCII first so "০১৭১২..." parses exactly as "01712..." does.
 */
function scan(raw: string): { digits: string; hadPlus: boolean } {
  const ascii = raw.replace(/[০-৯]/g, (d) =>
    String.fromCharCode(d.charCodeAt(0) - 0x09e6 + 0x30),
  )
  const trimmed = ascii.trim()
  return {
    hadPlus: trimmed.startsWith('+'),
    digits: trimmed.replace(/\D/g, ''),
  }
}

/**
 * Strips whatever prefix the number was written with down to the national
 * significant number: `+8801712243514`, `8801712243514`, `01712243514` and
 * `1712243514` all reduce to `1712243514`.
 *
 * The `00` international prefix is handled too, since it is what a number
 * copied off a printed sign often carries.
 */
function toNsn(digits: string): string {
  let d = digits
  if (d.startsWith('00' + COUNTRY)) d = d.slice(2 + COUNTRY.length)
  else if (d.startsWith(COUNTRY)) d = d.slice(COUNTRY.length)
  // A leading 0 is the domestic trunk prefix and is not part of the NSN.
  if (d.startsWith('0')) d = d.replace(/^0+/, '')
  return d
}

/** Groups a mobile NSN as 1712-243514, the form printed locally. */
function formatMobile(nsn: string): string {
  return `+${COUNTRY} ${nsn.slice(0, 4)}-${nsn.slice(4)}`
}

/**
 * Parses a written phone number into everything the UI needs to decide what to
 * render. Total: any input produces a result, and unparseable input produces
 * `kind: 'invalid'` with a null `e164` rather than throwing.
 */
export function normalizePhone(raw: string | null | undefined): NormalizedPhone {
  const input = (raw ?? '').trim()
  if (!input) return { e164: null, display: '', kind: 'invalid', placeholder: false }

  const { digits, hadPlus } = scan(input)
  if (!digits) return { e164: null, display: input, kind: 'invalid', placeholder: false }

  const nsn = toNsn(digits)

  // Checked before validity: a placeholder is a well-formed mobile number, and
  // the whole point is that being well-formed must not be enough to dial it.
  if (PLACEHOLDER_NSN.test(nsn)) {
    return { e164: null, display: formatMobile(nsn), kind: 'mobile', placeholder: true }
  }

  if (MOBILE_NSN.test(nsn)) {
    return {
      e164: `+${COUNTRY}${nsn}`,
      display: formatMobile(nsn),
      kind: 'mobile',
      placeholder: false,
    }
  }

  // A short code only counts when it was written as one. Without this guard a
  // truncated mobile number would silently become a "valid" 5-digit service
  // line, which is the kind of wrong number this module exists to prevent.
  if (!hadPlus && digits === nsn && SHORT_CODE.test(digits)) {
    return { e164: digits, display: digits, kind: 'short', placeholder: false }
  }

  if (LANDLINE_NSN.test(nsn)) {
    return {
      e164: `+${COUNTRY}${nsn}`,
      display: `+${COUNTRY} ${nsn}`,
      kind: 'landline',
      placeholder: false,
    }
  }

  // Recognisably a number, but not one this app is willing to put behind a tap
  // target. Shown as typed so an admin can see what needs correcting.
  return { e164: null, display: input, kind: 'invalid', placeholder: false }
}

/**
 * The `tel:` URI for a number, or null when it must not be dialled.
 *
 * Null is the contract: callers render a link when they get a string and fall
 * back to plain text when they get null, so "no dialable number" is never
 * expressed as a dead link or a button that does nothing.
 *
 * No encoding is applied because none is needed — `e164` is by construction
 * only digits and a leading `+`, both of which are legal in a tel: URI.
 */
export function toTelHref(raw: string | null | undefined): string | null {
  const { e164 } = normalizePhone(raw)
  return e164 ? `tel:${e164}` : null
}

/** Whether tapping this number would actually place a call. */
export function isDialable(raw: string | null | undefined): boolean {
  return normalizePhone(raw).e164 !== null
}

/** Human-friendly rendering, falling back to the input as typed. */
export function formatPhone(raw: string | null | undefined): string {
  return normalizePhone(raw).display
}

/**
 * Validation message for the admin form, or null when the value is acceptable.
 *
 * Blank is acceptable: phone is an optional field, and a listing with no number
 * is a legitimate listing rather than an incomplete one.
 */
export function validatePhone(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null

  const { kind } = normalizePhone(value)
  if (kind === 'invalid') {
    return 'That does not look like a Bangladesh phone number. Try 01712-345678.'
  }
  return null
}

/**
 * A non-blocking note about an otherwise valid number, or null.
 *
 * Deliberately separate from `validatePhone`, because a placeholder must not
 * stop a save. Every record imported from the bundled directory carries one, so
 * treating it as a validation error would lock the admin out of editing exactly
 * the listings that most need editing — including out of replacing the
 * placeholder itself, which is the whole point of opening the form.
 *
 * So it is surfaced as a warning next to the field and the save goes through.
 */
export function phoneWarning(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null

  const { placeholder, e164 } = normalizePhone(value)
  if (placeholder) {
    return 'This is a sample number and will not dial. Replace it with a verified one to enable the call button.'
  }

  const foreign = e164 ? FOREIGN_EMERGENCY[e164] : undefined
  if (foreign) return foreign

  return null
}

/**
 * Emergency numbers from other countries, which are well-formed short codes
 * and therefore dial perfectly — at nothing.
 *
 * Worth naming explicitly because the failure is invisible: 911 parses, passes
 * validation, renders a working-looking Call button, and connects a person in
 * Kushtia to silence during the emergency the page exists for. The normalizer
 * cannot catch this on shape alone, so it is caught here, by value, where an
 * admin is looking at the field.
 */
const FOREIGN_EMERGENCY: Record<string, string> = {
  '911': '911 is the North American emergency number and does not work in Bangladesh. The national emergency number here is 999.',
  '112': '112 is the European emergency number. Bangladesh’s national emergency number is 999.',
  '000': '000 is the Australian emergency number. Bangladesh’s national emergency number is 999.',
}

/**
 * The canonical value to store, or null for blank input.
 *
 * Invalid input is stored as typed rather than discarded — refusing to persist
 * what someone entered loses their work, and the form has already warned them.
 */
export function toStoredPhone(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  return normalizePhone(value).e164 ?? value
}
