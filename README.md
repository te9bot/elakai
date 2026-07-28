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

GitHub Pages serves the `gh-pages` branch, which holds a production build of
`main`. Redeploying is manual:

```bash
npm run build
cp dist/index.html dist/404.html          # SPA fallback; Pages has no rewrites
git worktree add --orphan -b gh-pages /tmp/ghpages   # first time only
cp -r dist/* /tmp/ghpages/
cd /tmp/ghpages && git add -A && git commit -m "Deploy" && git push origin gh-pages
```

`.github/workflows/deploy.yml` exists locally and would automate this on every
push to `main`, but it is **not committed** — pushing a file under
`.github/workflows/` requires the `workflow` OAuth scope. To switch over:

```bash
gh auth refresh -h github.com -s workflow
git add .github/workflows/deploy.yml && git commit -m "Add Pages deploy workflow"
git push
gh api -X PUT /repos/whitedevil-141/elakai/pages -f build_type=workflow
git push origin --delete gh-pages
```

The site is served from a subpath, so `base` in `vite.config.ts` and `basename` in
`src/App.tsx` are both set to `/elakai`. If the repository is ever renamed, update
both, along with the PWA `start_url`, `scope`, and icon paths in `vite.config.ts`.
