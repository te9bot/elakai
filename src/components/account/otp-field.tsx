import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react'
import { AnimatePresence, m } from 'framer-motion'

import { OTP_LENGTH, sanitiseOtp } from '@/lib/otp'
import { cn } from '@/lib/utils'

/* ==========================================================================
 * The code field.
 *
 * ONE INPUT, SIX BOXES
 *
 * The obvious build is six <input> elements that hand focus to each other. It
 * is also the one that fights the platform at every turn: iOS and Android
 * autofill a one-time code into the *first* field and the other five stay
 * empty, a paste has to be caught and redistributed by hand, Backspace at the
 * start of box four has to be taught to reach into box three, and a screen
 * reader announces six unlabelled text fields where there is one value.
 *
 * So there is one real input, transparent and stretched across the row, and the
 * six boxes are drawing. Autofill, paste, undo, IME input, mobile keyboards,
 * select-all and every keyboard convention work because they are not being
 * reimplemented — the input is a normal input. `autocomplete="one-time-code"`
 * on it is what makes iOS offer the code from the Messages/Mail banner.
 *
 * §27 falls out of this rather than being engineered: there is one caret, so
 * there is one active box, so the focus indicator is one element that moves.
 * Six independently animated borders was never the shape of the problem.
 *
 * WHAT MOVES, AND WHAT IT COSTS
 *
 *   * the digit, on arrival — opacity and scale, 110ms (§26);
 *   * the active indicator, between boxes — a transform, 180ms (§27);
 *   * the whole group, on a refused code — a transform, 300ms (§36).
 *
 * Three properties in total: `opacity` and `transform`. Nothing here animates
 * width, height, top, left, a shadow or a filter, so every frame is the
 * compositor's and the row stays cheap on a budget phone (§55).
 *
 * The indicator's offset is measured, not calculated from a gap constant. A
 * measured value survives a font change, a container query, a 320px phone and
 * the Bengali numerals this site has to render; an arithmetic one is correct
 * until the first person changes the padding.
 * ========================================================================== */

export function OtpField({
  value,
  onChange,
  onComplete,
  disabled = false,
  /** Set for one render after a refused code. Drives the shake and nothing else. */
  shake = false,
  invalid = false,
  length = OTP_LENGTH,
  autoFocus = false,
  id = 'otp',
  label = 'Verification code',
  describedBy,
}: {
  value: string
  onChange: (next: string) => void
  /** Fired once, the moment the field first holds a complete code. */
  onComplete?: (code: string) => void
  disabled?: boolean
  shake?: boolean
  invalid?: boolean
  length?: number
  autoFocus?: boolean
  id?: string
  label?: string
  describedBy?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const boxRefs = useRef<(HTMLDivElement | null)[]>([])

  const [focused, setFocused] = useState(false)
  const [marker, setMarker] = useState<{ x: number; width: number } | null>(null)

  /*
   * Which box is "live". Clamped to the last one when the code is complete, so
   * a full field shows the indicator on the sixth box rather than nowhere.
   */
  const active = Math.min(value.length, length - 1)

  /*
   * How many digits arrived in the last change.
   *
   * A paste or an autofill delivers all six at once and §28 asks for a 20ms
   * stagger across them. Typed digits arrive one at a time and must not be
   * delayed at all. Held in a ref rather than in state because it is read
   * during the render that follows the change and must not cause another one.
   */
  const arrivedTogether = useRef(0)
  const previousLength = useRef(value.length)

  /* ---- The moving indicator ------------------------------------------- */

  const measure = useCallback(() => {
    const box = boxRefs.current[active]
    const row = rowRef.current
    if (!box || !row) return
    // offsetLeft against the row rather than two getBoundingClientRect calls:
    // it is one layout read, and it is already relative to the positioned
    // parent the indicator lives in.
    setMarker({ x: box.offsetLeft, width: box.offsetWidth })
  }, [active])

  useLayoutEffect(measure, [measure, length])

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return
    const row = rowRef.current
    if (!row) return
    // Rotation, a font finishing loading, a phone keyboard resizing the
    // viewport — all of them move the boxes without changing `active`.
    const observer = new ResizeObserver(measure)
    observer.observe(row)
    return () => observer.disconnect()
  }, [measure])

  /* ---- Input ----------------------------------------------------------- */

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  /**
   * Fired at most once per completed code.
   *
   * Guarded by the code itself rather than by a boolean: after a refusal the
   * person edits a digit and completes it again, and that second complete code
   * is a different string and must submit. Re-rendering with the same complete
   * value — which React does freely — must not.
   */
  const submitted = useRef<string | null>(null)
  useEffect(() => {
    if (value.length !== length) {
      submitted.current = null
      return
    }
    if (submitted.current === value) return
    submitted.current = value
    onComplete?.(value)
  }, [value, length, onComplete])

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = sanitiseOtp(event.target.value)
    const grew = next.length - previousLength.current
    arrivedTogether.current = grew > 1 ? grew : 0
    previousLength.current = next.length
    onChange(next)
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    /*
     * Handled explicitly so a paste always REPLACES the field.
     *
     * Left to the browser, pasting into a field that already holds three
     * digits inserts at the caret and produces a nine-character string that
     * `sanitiseOtp` then truncates to the wrong six. Someone correcting a
     * mistyped code by pasting the right one would get a code built from both.
     */
    event.preventDefault()
    const next = sanitiseOtp(event.clipboardData.getData('text'))
    arrivedTogether.current = next.length
    previousLength.current = next.length
    onChange(next)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    /*
     * The caret is always at the end, so Backspace always deletes the last
     * digit — which is what the boxes show and therefore what the person
     * expects. Without this, clicking box two and pressing Backspace deletes
     * digit one and shuffles the rest, and the row appears to lose the wrong
     * number.
     */
    if (event.key === 'Backspace' && value.length > 0) {
      event.preventDefault()
      const next = value.slice(0, -1)
      arrivedTogether.current = 0
      previousLength.current = next.length
      onChange(next)
    }
  }

  return (
    <m.div
      /*
       * §36 — the shake is on this group and on nothing above it. A page that
       * shakes is a page that looks broken; a field that shakes is a field
       * saying "not this".
       *
       * `x` only, so it is one composited transform. The keyframes are the
       * brief's, and the final 0 is what guarantees the row is left exactly
       * where it started even if the animation is interrupted by a re-render.
       */
      animate={shake ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="relative"
    >
      {/*
       * The real field. Transparent rather than `sr-only` or zero-size: it has
       * to cover the boxes so a tap anywhere on the row focuses it, and a
       * zero-size input is where mobile autofill quietly stops working.
       */}
      <input
        ref={inputRef}
        id={id}
        value={value}
        onChange={handleChange}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        type="text"
        inputMode="numeric"
        // The attribute that makes iOS and Android offer the code from the
        // notification banner. Worth more to a person on a phone than every
        // animation in this file.
        autoComplete="one-time-code"
        maxLength={length}
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(
          'absolute inset-0 z-10 h-full w-full cursor-text rounded-control',
          // The value is drawn by the boxes below; this input only holds it.
          'bg-transparent text-transparent caret-transparent',
          'outline-none selection:bg-transparent',
          disabled && 'cursor-not-allowed',
        )}
      />

      <div
        ref={rowRef}
        aria-hidden="true"
        className="relative grid gap-2 sm:gap-2.5"
        style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}
      >
        {/*
         * §27's single indicator. One element, one transform, 180ms — it slides
         * from box to box rather than six borders switching on and off.
         *
         * A CSS transition rather than a framer animation because the value it
         * follows is measured in a layout effect: the class is static and only
         * the inline transform changes, so the browser interpolates without
         * React re-rendering a single extra frame. `will-change` is deliberately
         * absent — one small element does not need a permanent layer, and §56
         * asks for exactly this restraint.
         */}
        {marker && (
          <span
            className={cn(
              'pointer-events-none absolute inset-y-0 left-0 rounded-control border-2 transition-[transform,opacity] duration-[180ms] ease-out',
              focused && !disabled ? 'opacity-100' : 'opacity-0',
              invalid ? 'border-danger' : 'border-primary',
            )}
            style={{
              width: marker.width,
              transform: `translate3d(${marker.x}px, 0, 0)`,
            }}
          />
        )}

        {Array.from({ length }, (_, index) => {
          const digit = value[index]
          const filled = digit !== undefined
          /*
           * §28. Typed digits land immediately; a pasted or autofilled block
           * cascades at 20ms a box. `arrivedTogether` counts the digits that
           * turned up in one change, so a paste into a half-filled field
           * staggers only the ones that are actually new.
           */
          const staggerFrom = value.length - arrivedTogether.current
          const delay =
            arrivedTogether.current > 1 && index >= staggerFrom
              ? (index - staggerFrom) * 0.02
              : 0

          return (
            <div
              key={index}
              ref={(node) => {
                boxRefs.current[index] = node
              }}
              className={cn(
                'grid h-14 place-items-center rounded-control border bg-surface',
                'text-heading tnum font-bold text-ink',
                'transition-colors duration-150',
                invalid
                  ? 'border-danger/50'
                  : filled
                    ? 'border-ink-subtle/45'
                    : 'border-line',
                disabled && 'opacity-60',
              )}
            >
              <AnimatePresence initial={false} mode="wait">
                {filled && (
                  <m.span
                    key={`${index}-${digit}`}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    /*
                     * No exit transition. A deleted digit should be gone the
                     * instant Backspace is pressed — animating it out makes the
                     * field feel like it is arguing with the correction.
                     */
                    exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.06 } }}
                    transition={{ duration: 0.11, ease: [0.22, 1, 0.36, 1], delay }}
                  >
                    {digit}
                  </m.span>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </m.div>
  )
}
