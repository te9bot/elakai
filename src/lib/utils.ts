import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * The type scale is renamed rather than t-shirt sized — `text-body`, `text-meta`,
 * `text-display-lg` and friends (see tailwind.config.ts). tailwind-merge has no
 * way to know those are font sizes, so it files them under text-colour and treats
 * `text-white text-body` as a conflict, keeping only the last one.
 *
 * cva emits variant classes before size classes, so every solid button was
 * losing its `text-white` to the `text-body` that followed it and falling back
 * to inherited ink — invisible in dark mode, near-black on red in light mode.
 * Teaching the merger the scale fixes it everywhere at once.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'display-lg',
            'display',
            'title',
            'heading',
            'body',
            'body-sm',
            'meta',
            'micro',
          ],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
