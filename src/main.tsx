import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Self-hosted so there is no third-party round-trip on a slow connection.
// Manrope carries Latin; Noto Sans Bengali is picked up per-glyph for Bengali.
import '@fontsource-variable/manrope'
import '@fontsource/noto-sans-bengali/400.css'
import '@fontsource/noto-sans-bengali/500.css'
import '@fontsource/noto-sans-bengali/600.css'
import '@fontsource/noto-sans-bengali/700.css'

import './index.css'
import { App } from './App'
import { registerServiceWorker } from './lib/pwa'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// After render, not before: registration is not on the path to first paint,
// and the listener it installs only matters once the app is up. See lib/pwa.ts
// for why this is hand-written rather than the injected registerSW.js.
registerServiceWorker()
