import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

/*
 * Self-hosted so there is no third-party round-trip on a slow connection.
 *
 * ONE SUPERFAMILY ACROSS BOTH SCRIPTS.
 *
 * Anek (Ek Type) is drawn as a multi-script family: the Bangla and Latin cuts
 * share proportions, stroke contrast and vertical metrics by design. That
 * matters more here than on a monolingual site, because ELAKAI's headlines are
 * not English text with Bangla mixed in — the whole interface renders in one
 * script or the other depending on the language toggle, so the display face has
 * to carry Bangla as a first-class citizen rather than as a fallback. Pairing a
 * Latin display face with an unrelated Bengali one is what produces the effect
 * of two different websites behind one switch.
 *
 * Both are variable, so the weight range costs two files rather than eight.
 * Latin is listed first in `--font-ui`; Bangla glyphs fall through to the
 * Bangla cut per character.
 */
import '@fontsource-variable/anek-latin'
import '@fontsource-variable/anek-bangla'

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
