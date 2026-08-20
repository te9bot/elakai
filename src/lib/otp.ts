import type { AuthError } from '@supabase/supabase-js'

/* ==========================================================================
 * One-time codes.
 *
 * WHAT THIS FILE IS, AND WHAT IT REFUSES TO BE
 *
 * This is the vocabulary — the states a verification can be in, and how to read
 * Supabase's answer. It generates nothing, stores nothing, and decides nothing
 * about whether a code is correct.
 *
 * That last point is the whole design. There is no code in this project that
 * compares a typed code against an expected one, because there is no expected
 * one to compare against: `supabase.auth.verifyOtp()` sends the code to the
 * auth server, the auth server checks it against a hash it holds, and what
 * comes back is either a session or an error. The frontend's entire job is to
 * ask, wait, and show the answer.
 *
 * Concretely, and stated so a future change is measured against it:
 *
 *   * no OTP is ever written to localStorage, sessionStorage, a cookie, a
 *     query string, a React state that outlives the request, or a log line;
 *   * `otpVerified` is set from a Supabase response and from nothing else —
 *     there is no path in this codebase that reaches it on a timer;
 *   * every failure state below is produced by reading an error the server
 *     sent. None of them is inferred from elapsed time.
 *
 * WHY EXPIRY IS NOT A COUNTDOWN
 *
 * A timer that says "this code expires in 4:32" has to know the server's expiry
 * window, and the moment the dashboard changes it the timer starts lying in one
 * of two directions — telling somebody their good code is dead, or telling them
 * a dead one is fine. So there is no expiry countdown. The `expired` state is
 * entered when Supabase says `otp_expired`, which is the only source that
 * cannot be wrong.
 *
 * The one timer here is RESEND_COOLDOWN_MS, and it is a different kind of
 * claim: it is about how often this app will ask the auth server to send an
 * email, not about how long a code lives.
 * ========================================================================== */

/**
 * Digits in a code.
 *
 * Supabase's default, and it must match the project's Auth settings — the
 * server accepts a code of the length it generated, so a mismatch here shows up
 * as every correct code being refused. The box count and the paste handler both
 * read this rather than the literal 6.
 */
export const OTP_LENGTH = 6

/**
 * How long before this app will ask for another code.
 *
 * Supabase's own email rate limit is one message per address per sixty seconds
 * by default and it answers a request inside that window with an error. Waiting
 * it out here means the common case — an impatient second press — produces a
 * disabled button with a countdown on it instead of a red failure the person
 * did nothing to deserve.
 */
export const RESEND_COOLDOWN_MS = 60_000

/* ------------------------------------------------------------------ */
/* The state machine                                                   */
/* ------------------------------------------------------------------ */

/**
 * §24, as a type.
 *
 * A union rather than a set of booleans, because the states are genuinely
 * exclusive and the bug this shape prevents is the one worth preventing:
 * `verified` and `verifying` true at once, or `sent` still true after a
 * success, is how an interface ends up letting somebody through a door that
 * has not opened.
 *
 * Note what has no representation here: "probably fine". Every state is either
 * an answer from the server or an honest admission of waiting.
 */
export type OtpPhase =
  /** Details accepted locally; nothing has been sent yet. */
  | 'idle'
  /** The request to send a code is in flight. */
  | 'sending'
  /** Supabase says a code was sent. This is NOT verification. */
  | 'sent'
  /** A complete code has been submitted and the request is in flight. */
  | 'verifying'
  /** Supabase returned a session. The only state that may grant anything. */
  | 'verified'

export type OtpFailure =
  | 'invalid'
  | 'expired'
  | 'rate_limited'
  | 'network'
  | 'send_failed'
  | 'error'

export type OtpState = {
  phase: OtpPhase
  /** Set alongside a phase that is not a success. Cleared on the next attempt. */
  failure: OtpFailure | null
  /** What to put on screen. Always paired with `failure`. */
  message: string | null
  /** When the last code was sent, for the resend cooldown. */
  sentAt: number | null
}

export const OTP_INITIAL: OtpState = {
  phase: 'idle',
  failure: null,
  message: null,
  sentAt: null,
}

/** Whether a verified session may be acted on. The one place that asks. */
export function isVerified(state: OtpState): boolean {
  return state.phase === 'verified'
}

/** Whether the interface should refuse a second submit. §17, §29. */
export function isBusy(state: OtpState): boolean {
  return state.phase === 'sending' || state.phase === 'verifying'
}

/* ------------------------------------------------------------------ */
/* Reading Supabase's answer                                           */
/* ------------------------------------------------------------------ */

type Classified = { failure: OtpFailure; message: string }

/**
 * Supabase's error, turned into something a person can act on.
 *
 * Matched on `code` first — the stable, documented identifier — and on the
 * message only as a fallback, because the wording has changed between releases
 * and a regex against English prose is not a contract. Anything unrecognised
 * comes back as a generic failure rather than being guessed at, and the
 * original text is preserved so it is still diagnosable.
 */
export function classifyOtpError(error: unknown): Classified {
  const auth = error as Partial<AuthError> & { code?: string; status?: number }
  const code = typeof auth?.code === 'string' ? auth.code : ''
  const message = typeof auth?.message === 'string' ? auth.message : ''
  const status = typeof auth?.status === 'number' ? auth.status : 0

  /*
   * Expired first, and before the invalid check.
   *
   * Supabase reports an expired code with `otp_expired` but a message that
   * reads "Token has expired or is invalid" — so a message-first match would
   * classify every expiry as a wrong code and offer a shake instead of the
   * resend the person actually needs.
   */
  if (code === 'otp_expired' || /expired/i.test(message)) {
    return {
      failure: 'expired',
      message: 'That code has expired. Send yourself a new one.',
    }
  }

  if (status === 429 || /rate limit|too many|over_email_send|over_request/i.test(code + message)) {
    return {
      failure: 'rate_limited',
      message: 'Too many attempts. Wait a minute before trying again.',
    }
  }

  if (
    code === 'otp_disabled' ||
    /signups not allowed|otp_disabled|not enabled/i.test(code + message)
  ) {
    return {
      failure: 'send_failed',
      message: 'Email codes are not switched on for this site.',
    }
  }

  if (/failed to fetch|networkerror|network request failed|load failed/i.test(message)) {
    return {
      failure: 'network',
      message: 'Could not reach the server. Check your connection and try again.',
    }
  }

  if (
    code === 'otp_invalid' ||
    code === 'invalid_credentials' ||
    status === 401 ||
    status === 403 ||
    /invalid|incorrect|token not found/i.test(message)
  ) {
    return {
      failure: 'invalid',
      message: 'That code was not right. Check the email and try again.',
    }
  }

  return {
    failure: 'error',
    message: message || 'The code could not be checked. Try again.',
  }
}

/**
 * The same, for the send half.
 *
 * Separate because the actionable failures differ: a send cannot be "invalid",
 * and a send to an address with no account must not say so — that is the
 * account-enumeration oracle the sign-in form already avoids.
 */
export function classifySendError(error: unknown): Classified {
  const auth = error as Partial<AuthError> & { code?: string; status?: number }
  const code = typeof auth?.code === 'string' ? auth.code : ''
  const message = typeof auth?.message === 'string' ? auth.message : ''
  const status = typeof auth?.status === 'number' ? auth.status : 0

  if (status === 429 || /rate limit|too many|over_email_send|over_request/i.test(code + message)) {
    return {
      failure: 'rate_limited',
      message: 'A code was sent very recently. Wait a minute and try again.',
    }
  }

  if (/failed to fetch|networkerror|network request failed|load failed/i.test(message)) {
    return {
      failure: 'network',
      message: 'Could not reach the server. Check your connection and try again.',
    }
  }

  if (/signups not allowed|otp_disabled|not enabled|provider is not enabled/i.test(code + message)) {
    return {
      failure: 'send_failed',
      message: 'Email codes are not switched on for this site.',
    }
  }

  return {
    failure: 'send_failed',
    message: 'Could not send the code. Try again in a moment.',
  }
}

/* ------------------------------------------------------------------ */
/* Input handling                                                      */
/* ------------------------------------------------------------------ */

/**
 * Digits only, trimmed to length.
 *
 * Applied to typing, to pasting and to the browser's own autofill, so a code
 * arriving as "123 456", "123-456" or with a stray newline off the end of an
 * email client's copy button lands in the boxes rather than being rejected for
 * punctuation the person did not type.
 *
 * `\p{Nd}` rather than `[0-9]`: Bengali digits are what a Bangla keyboard
 * produces, and dropping them silently would be a very confusing failure on
 * this project in particular. They are normalised to ASCII below.
 */
export function sanitiseOtp(raw: string): string {
  const digits = Array.from(raw)
    .filter((ch) => /\p{Nd}/u.test(ch))
    .map(asciiDigit)
    .join('')
  return digits.slice(0, OTP_LENGTH)
}

/**
 * The zero of every decimal-digit block this project can plausibly meet.
 *
 * Unicode lays each block out 0–9 in order, so the offset from its zero is the
 * value. Listed rather than derived because there is no runtime API that gives
 * a digit's numeric value — `Number('৫')` is NaN — and a table of four entries
 * is honest about its coverage in a way a clever loop would not be.
 */
const DIGIT_BLOCKS = [
  0x30, // ASCII
  0x9e6, // Bengali — the other keyboard this site is actually used with
  0x660, // Arabic-Indic
  0x966, // Devanagari
] as const

/** Any digit from those blocks as its ASCII equivalent; '' for anything else. */
function asciiDigit(ch: string): string {
  const code = ch.codePointAt(0)
  if (code === undefined) return ''
  for (const base of DIGIT_BLOCKS) {
    if (code >= base && code <= base + 9) return String(code - base)
  }
  return ''
}
