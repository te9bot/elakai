/**
 * Drag-band acceptance harness. Dev tool — nothing imports this, nothing ships it.
 *
 * Paste the whole file into the DevTools console on the homepage. It drives the
 * real engine in `src/lib/infinite-track.ts` through every check in the spec and
 * prints a pass/fail table per band, so the interaction is verified against the
 * page rather than against a build succeeding.
 *
 * It reads the one number that matters — the `m` in the `translate3d(-m,0,0)`
 * the engine writes on each `.drag-track` — and asserts on how it moves.
 *
 *   auto      m rises steadily            content travels right → left
 *   drag L    m rises while the pointer   content follows the cursor left
 *             moves left
 *   drag R    m falls                     content follows the cursor right
 *   wrap      m drops by exactly one unit the loop, and the only discontinuity
 *                                         that is allowed to exist
 *
 * Synthetic PointerEvents are used for the gestures. The engine reads only
 * `pointerId`/`clientX`/`button`/`pointerType`, so they exercise the same paths a
 * hand does; `setPointerCapture` rejects a made-up id and the engine already
 * swallows that, which is why the capture call is wrapped in a try there.
 */
;(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const frame = () => new Promise((r) => requestAnimationFrame(r))

  /** The `m` currently painted on a track. */
  const posOf = (track) => {
    const t = getComputedStyle(track).transform
    if (!t || t === 'none') return 0
    const m = new DOMMatrixReadOnly(t)
    return -m.m41
  }

  /** One group plus the gap after it — the distance the loop wraps by. */
  const unitOf = (track) => {
    const group = track.firstElementChild
    if (!group) return 0
    const gap = parseFloat(getComputedStyle(track).columnGap)
    return group.getBoundingClientRect().width + (Number.isNaN(gap) ? 0 : gap)
  }

  /**
   * Total travel over a window, unwrapped.
   *
   * A raw difference of positions is meaningless across a wrap — the whole point
   * of the loop is that `m` jumps back by a unit — so each step is folded into
   * the half-open interval around zero before being accumulated. Also returns
   * the largest single step, which is how a *bad* discontinuity is told apart
   * from the intended one.
   */
  const travel = (samples, unit) => {
    let total = 0
    let worst = 0
    for (let i = 1; i < samples.length; i++) {
      let d = samples[i] - samples[i - 1]
      if (unit > 0) {
        d = ((d % unit) + unit) % unit
        if (d > unit / 2) d -= unit
      }
      total += d
      worst = Math.max(worst, Math.abs(d))
    }
    return { total, worst }
  }

  const sample = async (track, ms) => {
    const out = [posOf(track)]
    const until = performance.now() + ms
    while (performance.now() < until) {
      await frame()
      out.push(posOf(track))
    }
    return out
  }

  const send = (el, type, x, y, extra = {}) =>
    el.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
        button: type === 'pointermove' ? -1 : 0,
        buttons: type === 'pointerup' ? 0 : 1,
        clientX: x,
        clientY: y,
        ...extra,
      }),
    )

  /**
   * Press, move across in `steps`, release.
   *
   * A real gesture arrives one move per frame, and the engine's release velocity
   * is averaged over the last ~90ms of samples — firing every move in a single
   * task would hand it a division by ~0 and tell us nothing about momentum.
   */
  const drag = async (band, dx, steps = 14) => {
    const r = band.getBoundingClientRect()
    const y = r.top + r.height / 2
    const x0 = r.left + r.width / 2 - dx / 2
    send(band, 'pointerdown', x0, y)
    for (let i = 1; i <= steps; i++) {
      await frame()
      send(band, 'pointermove', x0 + (dx * i) / steps, y)
    }
    await frame()
    send(band, 'pointerup', x0 + dx, y)
  }

  const bands = [...document.querySelectorAll('.drag-band')]
  if (!bands.length) return console.error('No .drag-band on this page — is this the homepage?')

  const names = ['Covering (hero strip)', 'Everything ELAKAI covers']
  const report = []

  for (const [i, band] of bands.entries()) {
    const tracks = [...band.querySelectorAll('.drag-track')]
    // The engine only runs while the band is on screen, so put it there first.
    band.scrollIntoView({ block: 'center', behavior: 'instant' })
    await sleep(400)

    const row = { band: names[i] ?? `band ${i + 1}`, rows: tracks.length }
    const track = tracks[0]
    const unit = unitOf(track)

    // -- auto-scroll, and the loop it runs through -----------------------
    const idle = await sample(track, 2600)
    const drift = travel(idle, unit)
    row['auto R→L'] = drift.total > 40 ? `yes (${Math.round(drift.total)}px)` : `NO (${Math.round(drift.total)}px)`
    // Every step should be a frame's worth of drift. Anything approaching a unit
    // is a reset that failed to hide itself.
    row['seamless'] = drift.worst < unit * 0.25 ? `yes (max step ${drift.worst.toFixed(1)}px)` : `NO (${drift.worst.toFixed(1)}px jump)`
    row['track ≥ viewport'] =
      track.getBoundingClientRect().width >= band.clientWidth + unit ? 'yes' : 'NO (gap possible)'

    // -- drag right: content must follow, so m falls ---------------------
    let before = posOf(track)
    await drag(band, 240)
    let after = posOf(track)
    let d = travel([before, after], unit).total
    row['drag right'] = d < -120 ? `yes (${Math.round(d)}px)` : `NO (${Math.round(d)}px)`

    // -- drag left -------------------------------------------------------
    await sleep(900)
    before = posOf(track)
    await drag(band, -240)
    after = posOf(track)
    d = travel([before, after], unit).total
    row['drag left'] = d > 120 ? `yes (+${Math.round(d)}px)` : `NO (${Math.round(d)}px)`

    // -- momentum, then the hand-back ------------------------------------
    await drag(band, -300, 10)
    const glide = travel(await sample(track, 500), unit).total
    row['momentum'] = glide > 90 ? `yes (${Math.round(glide)}px in 0.5s)` : `NO (${Math.round(glide)}px)`

    // Defect C's signature: a release leaves w = 1, the drift is gated by
    // (1 - w), and the band sits still. Drag, hold, release, and watch.
    const r = band.getBoundingClientRect()
    const y = r.top + r.height / 2
    send(band, 'pointerdown', r.left + 120, y)
    for (let k = 1; k <= 10; k++) {
      await frame()
      send(band, 'pointermove', r.left + 120 - k * 12, y)
    }
    await sleep(320) // hold still: release velocity is now genuinely zero
    send(band, 'pointerup', r.left, y)
    const resume = travel(await sample(track, 700), unit).total
    row['resumes after slow drag'] = resume > 25 ? `yes (${Math.round(resume)}px)` : `NO — stalled (${Math.round(resume)}px)`

    // -- click survives a press that did not travel ----------------------
    const chip = band.querySelector('a')
    let clicked = false
    const spy = (e) => { clicked = true; e.preventDefault() }
    chip.addEventListener('click', spy)
    const c = chip.getBoundingClientRect()
    send(chip, 'pointerdown', c.left + c.width / 2, c.top + c.height / 2)
    send(chip, 'pointerup', c.left + c.width / 2, c.top + c.height / 2)
    chip.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    chip.removeEventListener('click', spy)
    row['click still works'] = clicked ? 'yes' : 'NO — suppressed'

    row['cursor'] = getComputedStyle(band).cursor
    report.push(row)
    await sleep(600)
  }

  console.table(report)
  console.log('Rows driven per band:', bands.map((b) => b.querySelectorAll('.drag-track').length).join(', '))
})()
