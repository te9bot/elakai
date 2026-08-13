import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import MarqueeAlongSvgPathDemo from '@/components/marquee-along-svg-path-demo'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MarqueeAlongSvgPathDemo />
  </StrictMode>
)
