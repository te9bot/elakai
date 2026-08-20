import { KushtiaMap } from '@/components/home/kushtia-map'

/* ==========================================================================
 * The district, behind everything.
 *
 * ONE LINE, AND THAT IS THE POINT
 *
 * This component adds no animation, no parallax and no map. All three already
 * exist in `components/home/kushtia-map.tsx`, driven by the single scroll
 * pipeline in `lib/scroll.ts`. What was missing was a name for "mount the
 * backdrop the way the public site mounts it", so the class string that decides
 * the layer's position lived in `AppShell` and would have had to be copied into
 * `AdminShell` — two literals that must agree forever, which is the shape a
 * duplicated animation system starts as.
 *
 * So the brief's "shared MapBackground / ParallaxMap component" is this file,
 * and it is deliberately thin. The alternative reading — build a new parallax
 * component for the dashboards — would have produced a second system driving
 * the same frames, which is the specific thing the brief asks not to happen and
 * which this project has already been burned by once (see the note at the top
 * of `components/layout/app-shell.tsx` about the scroll engine that was
 * removed).
 *
 * WHAT IT INHERITS, FREE
 *
 * Everything the public site's backdrop already does, because it is the same
 * component instance type:
 *
 *   * the real Kushtia projection — upazila boundaries, trunk roads, the
 *     Padma and Gorai, char land, the towns, in both languages;
 *   * five layers at different scroll rates, plus the velocity lean, plus the
 *     ambient focus light that lifts while the reader is moving;
 *   * light and dark, from the same CSS variables as the rest of the app;
 *   * `pointer-events-none` and `aria-hidden` on its root, so it can never
 *     take a click from a button, a link, a dropdown, a modal or the sidebar,
 *     and never reaches a screen reader;
 *   * the mobile budget — the five layers collapse to one composited sheet on
 *     phones, which is what keeps fill rate off the critical path;
 *   * `prefers-reduced-motion`, through `useReducedMotion` inside it.
 *
 * WHY `fixed` RATHER THAN A SCROLLING LAYER
 *
 * A backdrop that scrolls with the page has to be as tall as the page, and an
 * admin listings table can be very tall. Fixed to the viewport it is exactly
 * one screen of SVG no matter how long the document is, and the sense of travel
 * comes from the layers moving against each other rather than from the element
 * moving — which is also why the parallax costs the same on a short dashboard
 * and a thousand-row table.
 *
 * `-z-10` puts it behind every content block while staying above the body's own
 * background. Cards, tables and panels carry opaque surfaces and sit on top; the
 * map shows through the gutters between them.
 * ========================================================================== */

export function MapBackdrop() {
  return <KushtiaMap className="fixed inset-0 -z-10 h-dvh w-full" />
}
