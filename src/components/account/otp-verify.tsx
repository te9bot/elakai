import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { ArrowRight, MailCheck, RefreshCw } from 'lucide-react'

import { FormNotice } from '@/components/account/auth-shell'
import { OtpField } from '@/components/account/otp-field'
import { Button } from '@/components/ui/button'
import {
  classifyOtpError,
  classifySendError,
  isBusy,
  OTP_INITIAL,
  OTP_LENGTH,
  RESEND_COOLDOWN_MS,
  type OtpState,
} from '@/lib/otp'
import { cn } from '@/lib/utils'

/* ==========================================================================
 * Verifying a code.
 *
 * THE ONE RULE THIS COMPONENT EXISTS TO KEEP
 *
 * The success state is reachable from exactly one place: `onVerify` resolving.
 * `onVerify` is `verifyEmailOtp` in lib/auth.tsx, which resolves only when
 * Supabase returned a session. There is no timer here that advances anything,
 * no minimum duration, no optimistic transition, and no code path that reaches
 * `phase: 'verified'` without an awaited server response above it (§39).
 *
 * The ring is the visible half of that promise. It starts when the request
 * starts and stops when the request answers — so on a fast connection it turns
 * for 200ms and on a slow one it keeps turning, because it is showing the
 * request rather than performing confidence about it. Nothing here waits two
 * seconds and assumes.
 *
 * WHY THE RING IS `animate-spin` AND NOT A NEW KEYFRAME
 *
 * §30 asks for a circular SVG indicator built on stroke-dasharray rather than a
 * generic spinner, and that is what this is: a track circle, an arc cut from it
 * with `stroke-dasharray`, and a contraction into the checkmark on success. But
 * the rotation itself reuses the existing `.animate-spin` utility, because
 * src/index.css names that class in its reduced-motion exception list — it is
 * one of the four things this site keeps moving when somebody has asked for
 * less, on the grounds that a frozen progress indicator reads as a hung page.
 * A new keyframe would have been damped to 0.01ms and the ring would sit still
 * during a real network wait, which is the exact failure that list exists to
 * prevent. Reusing the utility inherits the decision instead of re-litigating
 * it.
 *
 * WHAT THE PERSON CAN DO IN EACH STATE
 *
 *   idle/sent   type, paste, or let the phone autofill; resend after a minute
 *   verifying   nothing — the field is disabled, which is also §29's duplicate
 *               submit guard
 *   invalid     the group shakes, the field keeps the code so a single wrong
 *               digit can be fixed rather than retyped
 *   expired     the field clears and the resend becomes the primary action
 *   verified    Continue, and only Continue
 * ========================================================================== */

export function OtpVerify({
  email,
  onVerify,
  onResend,
  onContinue,
  continueLabel = 'Continue',
  /** Shown once verification succeeds, above the Continue button. */
  successMessage = 'Your email is verified.',
  className,
}: {
  email: string
  /** Must reject on failure with Supabase's error intact. */
  onVerify: (code: string) => Promise<void>
  onResend: () => Promise<void>
  onContinue: () => void
  continueLabel?: string
  successMessage?: string
  className?: string
}) {
  const [code, setCode] = useState('')
  const [state, setState] = useState<OtpState>({ ...OTP_INITIAL, phase: 'sent', sentAt: Date.now() })
  const [shake, setShake] = useState(false)
  const [cooldown, setCooldown] = useState(() => Math.ceil(RESEND_COOLDOWN_MS / 1000))

  /*
   * Guards the request, not the button.
   *
   * The disabled attribute covers the pointer, but `onComplete` fires from an
   * effect on the field's value and autofill can deliver a code while a
   * previous request is still in flight. A ref is checked and set in the same
   * synchronous block, so two calls cannot both pass it — which `state` could
   * not promise, because a state update is not visible until the next render.
   */
  const inFlight = useRef(false)

  /** Stops a resolved request writing state into an unmounted component. */
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  /* ---- Resend cooldown (§38) ------------------------------------------ */

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => {
      setCooldown((seconds) => (seconds <= 1 ? 0 : seconds - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  /* ---- Verification --------------------------------------------------- */

  const verify = useCallback(
    async (submitted: string) => {
      if (inFlight.current) return
      if (submitted.length !== OTP_LENGTH) return

      inFlight.current = true
      setShake(false)
      setState((s) => ({ ...s, phase: 'verifying', failure: null, message: null }))

      try {
        await onVerify(submitted)
        if (!alive.current) return
        // Reached only because Supabase answered with a session.
        setState((s) => ({ ...s, phase: 'verified', failure: null, message: null }))
      } catch (error) {
        if (!alive.current) return
        const { failure, message } = classifyOtpError(error)

        setState((s) => ({ ...s, phase: 'sent', failure, message }))

        if (failure === 'expired') {
          /*
           * §37. The code is dead, so the field is cleared — leaving six digits
           * that cannot work invites a second attempt at the same dead code —
           * and the resend cooldown is released, because the thing to do now is
           * ask for another one.
           */
          setCode('')
          setCooldown(0)
        } else {
          /*
           * §36. The code stays. One mistyped digit should be one keystroke to
           * fix, not six, and clearing the field on a wrong code is the fastest
           * way to make somebody give up.
           */
          setShake(true)
          window.setTimeout(() => alive.current && setShake(false), 320)
        }
      } finally {
        inFlight.current = false
      }
    },
    [onVerify],
  )

  /* ---- Resend --------------------------------------------------------- */

  const resend = useCallback(async () => {
    if (inFlight.current || cooldown > 0) return
    inFlight.current = true
    setState((s) => ({ ...s, phase: 'sending', failure: null, message: null }))

    try {
      await onResend()
      if (!alive.current) return
      setCode('')
      setState({ phase: 'sent', failure: null, message: null, sentAt: Date.now() })
      setCooldown(Math.ceil(RESEND_COOLDOWN_MS / 1000))
    } catch (error) {
      if (!alive.current) return
      const { failure, message } = classifySendError(error)
      setState((s) => ({ ...s, phase: 'sent', failure, message }))
      // A refusal from the server's own rate limiter still starts the clock —
      // otherwise the button stays live and every press earns another refusal.
      if (failure === 'rate_limited') setCooldown(Math.ceil(RESEND_COOLDOWN_MS / 1000))
    } finally {
      inFlight.current = false
    }
  }, [cooldown, onResend])

  const verified = state.phase === 'verified'
  const busy = isBusy(state)
  const expired = state.failure === 'expired'

  return (
    <div className={cn('space-y-5', className)}>
      {/* ---- The indicator, and the field it replaces ---- */}
      <div className="flex flex-col items-center gap-5">
        <VerificationIndicator
          state={verified ? 'success' : busy ? 'working' : 'idle'}
        />

        <AnimatePresence mode="wait" initial={false}>
          {verified ? (
            <m.p
              key="done"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1], delay: 0.32 }}
              className="text-center text-body-sm font-semibold text-success-ink"
            >
              {successMessage}
            </m.p>
          ) : (
            <m.p
              key="prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              transition={{ duration: 0.18 }}
              className="text-center text-body-sm text-ink-muted"
            >
              Enter the {OTP_LENGTH}-digit code we sent to{' '}
              <span className="font-semibold text-ink">{email}</span>.
            </m.p>
          )}
        </AnimatePresence>
      </div>

      {/*
       * §29 — the field does not vanish while the code is being checked.
       *
       * Replacing the whole interface with a spinner throws away the code the
       * person just typed, so a failure has nothing to correct and they retype
       * six digits they got right the first time. It stays, disabled and
       * dimmed, and the indicator above carries the state.
       */}
      {!verified && (
        <div className="space-y-3">
          <OtpField
            value={code}
            onChange={(next) => {
              setCode(next)
              // Editing after a refusal clears the complaint. A red border that
              // survives the correction is a red border nobody believes.
              if (state.failure) {
                setState((s) => ({ ...s, failure: null, message: null }))
              }
            }}
            onComplete={(complete) => void verify(complete)}
            disabled={busy}
            shake={shake}
            invalid={state.failure === 'invalid' || expired}
            describedBy={state.message ? 'otp-message' : undefined}
            autoFocus
          />

          {state.message && (
            <div id="otp-message">
              <FormNotice tone={expired ? 'warning' : 'danger'}>{state.message}</FormNotice>
            </div>
          )}

          {/* ---- Resend (§38) ---- */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <p className="text-meta text-ink-subtle">
              {cooldown > 0
                ? `You can ask for another code in ${cooldown}s.`
                : 'No code yet? Check the spam folder.'}
            </p>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={cooldown > 0 || busy}
              onClick={() => void resend()}
              /*
               * The primary action once a code has expired. Same button, same
               * component, one variant swap — §37 asks for the state to change,
               * not for a different screen to appear.
               */
              className={cn(expired && cooldown === 0 && 'text-primary')}
            >
              <RefreshCw
                className={cn('size-4', state.phase === 'sending' && 'animate-spin')}
                aria-hidden="true"
              />
              {state.phase === 'sending' ? 'Sending…' : 'Send a new code'}
            </Button>
          </div>
        </div>
      )}

      {/* ---- §35 — Continue, offered only once there is something to continue to ---- */}
      <AnimatePresence>
        {verified && (
          <m.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
          >
            <Button size="lg" block onClick={onContinue} autoFocus>
              {continueLabel}
              <ArrowRight aria-hidden="true" />
            </Button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* The indicator                                                       */
/* ------------------------------------------------------------------ */

const SIZE = 72
const RADIUS = 30
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * Three states, one element.
 *
 * `idle` is a quiet ring with a mail glyph in it — something for the eye to
 * rest on above the boxes, and the thing that contracts on success rather than
 * appearing from nothing.
 *
 * `working` cuts an arc out of the same ring with `stroke-dasharray` and turns
 * it. This is the §30 indicator: it is drawn from the ring that is already
 * there, so the transition into it is a change of state rather than a swap of
 * components.
 *
 * `success` is §32's sequence, and the timings are the brief's:
 *   0ms      the arc stops (this component re-renders with state 'success')
 *   0–90ms   the ring contracts to 0.92 and fades out
 *   100ms    the checkmark's container arrives, scaling 0.75 → 1.05 → 1
 *   150ms    the stroke starts drawing
 *   400ms    drawn, and the scale has settled
 *
 * Everything animated is `opacity`, `transform` or `pathLength` — the SVG
 * stroke property §55 explicitly allows. No filter, no shadow, no layout.
 */
function VerificationIndicator({ state }: { state: 'idle' | 'working' | 'success' }) {
  const success = state === 'success'

  return (
    <div
      className="relative grid place-items-center"
      style={{ width: SIZE, height: SIZE }}
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">
        {success ? 'Code verified.' : state === 'working' ? 'Checking your code…' : ''}
      </span>

      {/* ---- The ring ---- */}
      <m.svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        aria-hidden="true"
        className="absolute inset-0"
        animate={success ? { scale: 0.92, opacity: 0 } : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.09, ease: 'easeIn' }}
      >
        {/* The track. Always full, always still — it is what makes the arc
            above it read as a portion of something rather than as a lone
            fragment sliding around. */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={3}
          className="stroke-line"
        />
        {/* The arc, cut with stroke-dasharray. `animate-spin` rotates the whole
            element about its centre; see the note at the top of this file for
            why that utility rather than a keyframe of our own. */}
        <g className={state === 'working' ? 'origin-center animate-spin' : 'origin-center'}>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={3}
            strokeLinecap="round"
            className={cn(
              'transition-[stroke-dasharray] duration-200 ease-out',
              state === 'working' ? 'stroke-primary' : 'stroke-transparent',
            )}
            strokeDasharray={
              state === 'working'
                ? `${CIRCUMFERENCE * 0.28} ${CIRCUMFERENCE * 0.72}`
                : `0 ${CIRCUMFERENCE}`
            }
          />
        </g>
      </m.svg>

      {/* ---- The resting glyph ---- */}
      <AnimatePresence>
        {state === 'idle' && (
          <m.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: 0.18 }}
            className="text-ink-subtle"
          >
            <MailCheck className="size-6" aria-hidden="true" />
          </m.span>
        )}
      </AnimatePresence>

      {/* ---- §32/§33/§34 — the checkmark ---- */}
      <AnimatePresence>
        {success && (
          <m.div
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: [0.75, 1.05, 1], opacity: 1 }}
            transition={{
              duration: 0.3,
              delay: 0.1,
              // Weighted so the overshoot happens early and the settle is
              // unhurried. A symmetric curve reads as a bounce, and §34 is
              // explicit that this must not bounce repeatedly.
              times: [0, 0.62, 1],
              ease: [0.22, 1, 0.36, 1],
            }}
            className="absolute inset-0 grid place-items-center"
          >
            <span className="grid size-[52px] place-items-center rounded-full bg-success-soft">
              <svg
                width={26}
                height={26}
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="stroke-success"
              >
                <m.path
                  d="M4.5 12.5 L9.5 17.5 L19.5 6.5"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  // pathLength normalises the path to 1 regardless of its real
                  // length, so the draw reads the same if the glyph is ever
                  // redrawn. framer turns this into the stroke-dasharray /
                  // stroke-dashoffset pair §33 asks for.
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.25, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                />
              </svg>
            </span>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
