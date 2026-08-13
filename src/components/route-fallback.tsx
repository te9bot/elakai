import { BrandLoader } from '@/components/brand-loader'

/** Shown while a lazily-loaded route chunk arrives. */
export function RouteFallback() {
  // A route chunk resolves in well under a second on a warm cache, so guessing
  // at the shape of the page behind it just flashes a layout that is wrong as
  // often as it is right. The mark is honest about what it is: a wait.
  return <BrandLoader className="min-h-[60vh]" />
}
