/* ==========================================================================
 * Password rules.
 *
 * ONE REQUIREMENT, FOUR RECOMMENDATIONS
 *
 * The signup form has always had a single rule — eight characters — and an
 * argument written above it for why it is the only one: a mandatory
 * uppercase-digit-symbol checklist reliably produces `Password1!`. It pushes
 * people toward short strings that satisfy a regex and away from long ones that
 * do not, which is backwards, and it is why NIST SP 800-63B stopped
 * recommending composition rules.
 *
 * The brief asks for the checklist. It also says, in the same section, that the
 * mixture is what to *recommend* and eight characters is what to *require*. So
 * that is exactly what this file expresses, and the distinction is carried in
 * the data rather than left to the component: `required` is true for length and
 * false for the other four.
 *
 * The form blocks on the required rules and never blocks on the rest. A
 * fourteen-character passphrase with no digit in it is stronger than
 * `Passw0rd!` and is accepted without complaint — the panel simply stops
 * suggesting things once the password is long enough to be worth keeping.
 *
 * WHAT THIS FILE DOES NOT DO
 *
 * It does not score, does not call an API, does not touch storage, and is never
 * given a password to keep. `evaluatePassword` takes a string and returns
 * booleans; the string it was given is not retained anywhere, including in a
 * closure. Supabase Auth is what actually holds the credential, and its own
 * minimum applies on top of this one — see §43 of the brief: this is the
 * feedback layer, not the authority.
 * ========================================================================== */

/** The floor. Supabase's own is six; this form's is eight. */
export const MIN_PASSWORD = 8

/** Long enough that the character-mix advice stops being worth showing. */
const LONG_ENOUGH = 16

export type PasswordRule = {
  /** Stable across renders — the animation keys off it. */
  id: string
  label: string
  /** Whether failing this stops the form. Only the length rule does. */
  required: boolean
  met: boolean
}

export type PasswordEvaluation = {
  rules: PasswordRule[]
  /** Every required rule satisfied. The form asks this and nothing else. */
  valid: boolean
  /** All five, including the recommendations. Drives the summary line. */
  strong: boolean
  /**
   * Long enough that composition advice is noise. A 20-character phrase with
   * no symbol in it does not need a panel telling it to add one.
   */
  lengthy: boolean
}

/*
 * Symbols are "not a letter, not a digit, not whitespace" rather than a listed
 * set. A listed set is always wrong for somebody — Bengali punctuation, a
 * currency sign, an emoji — and this rule exists to encourage variety, so
 * anything that is genuinely a third kind of character counts.
 */
const HAS_UPPER = /\p{Lu}/u
const HAS_LOWER = /\p{Ll}/u
const HAS_DIGIT = /\p{Nd}/u
const HAS_SYMBOL = /[^\p{L}\p{N}\s]/u

export function evaluatePassword(password: string): PasswordEvaluation {
  const rules: PasswordRule[] = [
    {
      id: 'length',
      label: `At least ${MIN_PASSWORD} characters`,
      required: true,
      met: password.length >= MIN_PASSWORD,
    },
    { id: 'upper', label: 'An uppercase letter', required: false, met: HAS_UPPER.test(password) },
    { id: 'lower', label: 'A lowercase letter', required: false, met: HAS_LOWER.test(password) },
    { id: 'digit', label: 'A number', required: false, met: HAS_DIGIT.test(password) },
    { id: 'symbol', label: 'A symbol', required: false, met: HAS_SYMBOL.test(password) },
  ]

  const valid = rules.every((r) => !r.required || r.met)

  return {
    rules,
    valid,
    strong: rules.every((r) => r.met),
    lengthy: password.length >= LONG_ENOUGH,
  }
}

/**
 * The one message the form blocks on, or null.
 *
 * Deliberately not a summary of the panel: the panel is already on screen
 * saying which line is unmet, and repeating it under the field says the same
 * thing twice in two different words.
 */
export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD) {
    return `Use at least ${MIN_PASSWORD} characters.`
  }
  return null
}

/**
 * The sentence under the field before anything has been typed.
 *
 * Phrased as the brief asks — the requirement first, the recommendation second,
 * in one line that does not read as a list of obligations.
 */
export const PASSWORD_HINT =
  `Use at least ${MIN_PASSWORD} characters with a mix of letters, numbers, and symbols.`
