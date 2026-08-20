import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { domAnimation, LazyMotion } from 'framer-motion'

import { ListingDialog } from '@/components/admin/listing-dialog'
import { ToastProvider } from '@/components/admin/toast'
import { Button } from '@/components/ui/button'
import type { Listing } from '@/lib/listings'
import '@/index.css'

/* ==========================================================================
 * Modal lab — development only.
 *
 * Renders the listing modal outside the admin panel so its geometry can be
 * measured at every target viewport without a Supabase session. Follows the
 * same pattern as motion-lab.html and marquee-preview.html: a separate HTML
 * entry that is not a build input, so none of this reaches production.
 *
 * The surrounding boxes are deliberate. Each one reproduces a property that
 * creates a containing block for fixed-position descendants — `transform`,
 * `filter`, `backdrop-filter` — alongside a fake sidebar. A modal that centres
 * correctly in here is centred against the viewport and not against its
 * parent, which is the exact failure being fixed.
 * ========================================================================== */

const queryClient = new QueryClient()

const SAMPLE: Listing = {
  id: 1,
  section: 'services',
  title: 'Bismillah Electric Works',
  description:
    'House and shop wiring, fan fitting and meter work across Kushtia Sadar. Emergency callouts accepted at any hour.',
  phone: '01711-000111',
  subcategory: '',
  altPhone: '',
  email: 'bismillah.electric@example.com',
  address: '12 N.S. Road, Kushtia',
  location: 'Kushtia Sadar',
  category: 'electrician',
  verified: true,
  featured: false,
  price: '450 BDT/visit',
  availability: 'Sat-Thu, 9am-8pm',
  // A real stored URL, so the lab exercises the "existing image" state of the
  // picker — the one an editor sees on every edit — rather than only the empty
  // dropzone.
  imageUrl:
    'https://cvbwpclogcpbdovrsftj.supabase.co/storage/v1/object/public/elakai-images/listings/2026-08-15-6676aa3c-d960-4ce3-9e36-5f57df84a4df-unnamed.jpg',
  services: ['House wiring', 'Fan and light fitting', 'Meter installation'],
  mapsUrl: 'https://maps.app.goo.gl/vShaXmhDVdxMMavF9',
  status: 'active',
  displayOrder: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

function Lab() {
  const [open, setOpen] = useState(false)
  const [listing, setListing] = useState<Listing | null>(null)

  return (
    // A stand-in for the admin shell: a fixed sidebar plus a transformed,
    // blurred wrapper. Under the old centring these would drag the modal right.
    <div className="min-h-dvh bg-canvas" style={{ transform: 'translateZ(0)' }}>
      <aside className="fixed inset-y-0 left-0 z-50 w-[264px] border-r border-line bg-surface p-4">
        <p className="text-meta font-bold text-ink-subtle">FAKE SIDEBAR</p>
        <p className="mt-2 text-meta text-ink-muted">
          264px wide, like the real one. The modal must ignore it entirely.
        </p>
      </aside>

      <div className="lg:pl-[264px]" style={{ filter: 'saturate(1)' }}>
        <header className="sticky top-0 z-30 h-16 border-b border-line bg-canvas/85 px-4 backdrop-blur" />
        <main className="p-6" style={{ willChange: 'transform' }}>
          <h1 className="text-title">Modal lab</h1>
          <p className="mt-1 text-body-sm text-ink-muted">
            Development only. Verifies viewport centring inside containers that
            create fixed-position containing blocks.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              onClick={() => {
                setListing(null)
                setOpen(true)
              }}
            >
              Open “New listing”
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setListing(SAMPLE)
                setOpen(true)
              }}
            >
              Open “Edit listing”
            </Button>
          </div>

          {/* Tall filler, so body-scroll locking is observable. */}
          <div className="mt-6 h-[2400px] rounded-card border border-dashed border-line" />
        </main>
      </div>

      <ListingDialog
        open={open}
        onOpenChange={setOpen}
        listing={listing}
        onSaved={() => undefined}
      />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LazyMotion features={domAnimation} strict>
        <ToastProvider>
          <Lab />
        </ToastProvider>
      </LazyMotion>
    </QueryClientProvider>
  </StrictMode>,
)
