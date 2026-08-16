import { useEffect, useState } from 'react'

import { ListingArt } from '@/components/listing-art'
import type { IconName } from '@/data/types'
import { cn } from '@/lib/utils'

/* ==========================================================================
 * A record's picture: the uploaded photograph, or the generated artwork.
 *
 * WHY THIS IS ONE COMPONENT
 *
 * Every card and hero on the site used to render `<ListingArt>` directly, which
 * meant none of them had anywhere to put a real photograph — an admin could
 * upload an image, watch it save, and then find the public page still drawing a
 * gradient. Fixing that at each call site would have put the same three-way
 * decision (photo / no photo / photo that fails to load) in a dozen files, and
 * the twelfth would have been the one that forgot the error case.
 *
 * So the decision lives here and the call sites pass a URL. `ListingArt` keeps
 * its exact previous role as the fallback, which is why nothing about the look
 * of a record without a photograph changes.
 *
 * FAILURE IS VISIBLE, NOT SILENT
 *
 * A broken URL falls back to the artwork so a visitor never sees a torn-image
 * icon — but it also logs what failed, because the alternative is an image
 * pipeline that reports success at every layer and quietly shows a gradient. In
 * development the log is loud; in production it stays a single console error
 * rather than anything a visitor can see.
 * ========================================================================== */

export function ListingPhoto({
  src,
  alt,
  seed,
  icon,
  className,
  rounded = true,
  /** Set on the one image that is above the fold; everything else defers. */
  priority = false,
  /** Object-fit for the photograph. The artwork fallback is unaffected. */
  fit = 'cover',
  /** Forwarded to the artwork fallback so a themed surface keeps its palette. */
  paletteIndex,
}: {
  src?: string | null
  alt: string
  seed: number
  icon: IconName
  className?: string
  rounded?: boolean
  priority?: boolean
  fit?: 'cover' | 'contain'
  paletteIndex?: number
}) {
  /*
   * Keyed on the URL rather than a bare boolean: when a card is recycled for a
   * different record — a filter change, a new page of results — a stale `true`
   * would suppress the incoming photograph and show artwork for a listing that
   * has a perfectly good image. Comparing against the current `src` makes the
   * failure specific to the URL that actually failed.
   */
  const [failed, setFailed] = useState<string | null>(null)

  // A URL that previously failed can become valid again — the bucket policy is
  // fixed, the object finishes uploading — and a remount is not guaranteed.
  useEffect(() => setFailed(null), [src])

  const url = src?.trim()
  const usable = url && failed !== url

  if (!usable) {
    return (
      <ListingArt
        seed={seed}
        icon={icon}
        rounded={rounded}
        className={className}
        paletteIndex={paletteIndex}
      />
    )
  }

  return (
    <div
      className={cn(
        'relative isolate overflow-hidden bg-surface-2',
        rounded && 'rounded-control',
        className,
      )}
    >
      <img
        src={url}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        // Lowercase: React 18 passes unknown lowercase attributes straight
        // through but warns on the camelCase spelling it does not yet map.
        {...(priority ? { fetchpriority: 'high' } : {})}
        onError={() => {
          console.error(
            `[elakai] listing image failed to load — falling back to generated artwork.\n` +
              `  url: ${url}\n` +
              `  alt: ${alt}\n` +
              `  Check that the object exists in the bucket and that the bucket is public.`,
          )
          setFailed(url)
        }}
        className={cn(
          'size-full',
          fit === 'cover' ? 'object-cover' : 'object-contain',
        )}
      />
    </div>
  )
}
