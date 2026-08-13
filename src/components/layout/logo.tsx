import { cn } from '@/lib/utils'
import logo from '../../../assets/elakai-logo.png'

/**
 * The brand lockup, used whole: pin mark, wordmark and tagline are all part of
 * the supplied artwork rather than being reassembled here out of text and
 * icons. The only processing applied to the source file was keying its flat
 * backdrop to alpha and trimming the surrounding margin — nothing was cropped,
 * so the original 1.088:1 proportions are intact and `object-contain` keeps
 * them that way at every size.
 *
 * Transparency is what lets one file serve both themes: the wordmark's navy
 * reads on the light canvas, and on the dark canvas the mark keeps its own
 * colour rather than sitting on a white plate.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <img
      src={logo}
      alt="ELAKAI"
      width={512}
      height={471}
      // Eager + high priority: it sits in the header, above the fold, on every
      // route, so lazy-loading it only buys a flash of empty space.
      loading="eager"
      decoding="async"
      draggable={false}
      className={cn('h-11 w-auto select-none object-contain', className)}
    />
  )
}
