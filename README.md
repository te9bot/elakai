# ELAKAI — Your Local Information. One Place.

Trusted local services and emergency contacts for Kushtia. Search, find, call, get help.

**Live:** https://whitedevil-141.github.io/elakai/

Hospitals, ambulance, pharmacies, electricians, plumbers, and rentals — all in one
place, in Bangla and English, installable as a PWA and usable offline.

## Stack

React 18 · TypeScript · Vite 6 · Tailwind CSS · Radix UI · React Router 6 ·
TanStack Query · Framer Motion · Leaflet · vite-plugin-pwa

## Local development

```bash
npm install
npm run dev        # dev server
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build locally
npm run typecheck  # types only, no emit
```

## Deployment

Every push to `main` triggers `.github/workflows/deploy.yml`, which builds the app
and publishes `dist/` to GitHub Pages.

The site is served from a subpath, so `base` in `vite.config.ts` and `basename` in
`src/App.tsx` are both set to `/elakai`. If the repository is ever renamed, update
both, along with the PWA `start_url`, `scope`, and icon paths in `vite.config.ts`.
