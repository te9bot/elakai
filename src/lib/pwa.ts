/* ==========================================================================
 * Service worker registration, and the reason it is written by hand.
 *
 * THE BUG THIS FIXES
 *
 * The generated service worker serves every navigation from the precache:
 *
 *   registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))
 *
 * That is cache-only. It never asks the network whether `index.html` has
 * changed, which is exactly what makes the app open instantly and work
 * offline — and also exactly what made a deploy invisible.
 *
 * The sequence a returning visitor got, every time:
 *
 *   1. Navigate. The old service worker answers from its precache, so the
 *      OLD app shell paints, referencing the OLD hashed bundle.
 *   2. Meanwhile the browser fetches the new sw.js, installs it, and
 *      because the build sets skipWaiting and clientsClaim it activates
 *      and claims the page immediately.
 *   3. Nothing tells the already-painted page any of this happened.
 *
 * So the new build only appeared on the *next* navigation. A deploy looked
 * like it had not shipped — the Contribute entry point was live on the
 * server and absent from the screen — and reporting it as "not deployed"
 * was the correct reading of the evidence available.
 *
 * The injected registerSW.js does not help here. It is three lines and it
 * only calls `.register()`:
 *
 *   navigator.serviceWorker.register('/elakai/sw.js', { scope: '/elakai/' })
 *
 * Hence `injectRegister: null` in vite.config.ts and this file instead.
 *
 * WHY NOT MAKE NAVIGATIONS NETWORK-FIRST
 *
 * The obvious alternative — ask the network for index.html and fall back to
 * the cache — was rejected. The precached navigation is what makes ELAKAI
 * open at all on a bad connection, and this is a directory of ambulance and
 * hospital numbers: the offline path is the one that matters most, and
 * putting a network round-trip in front of every cold start to save a
 * one-load delay after a deploy is the wrong trade. The shell stays
 * cache-first. We just stop ignoring the update when it lands.
 * ========================================================================== */

/**
 * Reload only once per page life.
 *
 * `controllerchange` can fire more than once, and a reload triggered by a
 * reload is a loop the user cannot escape.
 */
let reloading = false

/**
 * True when something on the page would be lost by reloading.
 *
 * The whole point of this file is to reload under the user, so it has to be
 * careful about when. A contributor half-way through the submission form has
 * typed a pharmacy's address into fields that live only in React state, and
 * throwing that away to save them one stale page load is a bad bargain — the
 * update can wait for their next navigation, which is what used to happen
 * anyway.
 *
 * Checked at the moment of the reload rather than tracked as they type, so
 * there is no state to keep in sync and nothing to forget to reset.
 */
function wouldLoseWork(): boolean {
  const fields = document.querySelectorAll<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >('input, textarea, select')

  for (const field of fields) {
    // Buttons and checkboxes carry no typing worth protecting; a file input's
    // value cannot be restored by us either way, but it does mean they are
    // mid-task, so it counts.
    if (field instanceof HTMLInputElement) {
      if (field.type === 'button' || field.type === 'submit' || field.type === 'reset') continue
      if (field.type === 'checkbox' || field.type === 'radio') {
        if (field.checked !== field.defaultChecked) return true
        continue
      }
      if (field.type === 'file' && field.files && field.files.length > 0) return true
    }
    if (field.value.trim() !== '') return true
  }

  return false
}

/**
 * Register the service worker, and take an update as soon as one arrives.
 *
 * Safe to call unconditionally: it no-ops in development (no service worker
 * is generated there) and on browsers without support.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return
  if (!('serviceWorker' in navigator)) return

  /*
   * Whether this page is already under a service worker's control, captured
   * BEFORE registering.
   *
   * This is the load-bearing line. `clientsClaim` makes the very first
   * service worker claim a page that loaded without one, which fires
   * `controllerchange` on a first-ever visit — where the page is already the
   * newest build and reloading it would be a pointless flash. Only a
   * controllerchange on a page that *had* a controller means "the build you
   * are looking at has been replaced".
   */
  const hadController = Boolean(navigator.serviceWorker.controller)

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return
    if (wouldLoseWork()) return
    reloading = true
    window.location.reload()
  })

  window.addEventListener('load', () => {
    // BASE_URL is '/elakai/' in this project. Reading it rather than writing
    // the path out means a change of base in vite.config.ts cannot leave a
    // registration pointing at a 404.
    const url = `${import.meta.env.BASE_URL}sw.js`

    navigator.serviceWorker
      .register(url, { scope: import.meta.env.BASE_URL })
      .then((registration) => {
        /*
         * Ask again when the tab comes back to the foreground.
         *
         * Without this, a tab left open for a week never checks for a new
         * build — the browser only looks for an updated sw.js on navigation,
         * and there has not been one. This is the case that turns "we
         * deployed a fix" into "nobody has it yet".
         */
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') void registration.update()
        })
      })
      .catch((error: unknown) => {
        // A failed registration costs offline support and nothing else, so it
        // must never take the page down with it.
        console.warn('[elakai] service worker registration failed:', error)
      })
  })
}
