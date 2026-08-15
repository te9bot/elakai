# ELAKAI — Your Local Information. One Place.

Trusted local services and emergency contacts for Kushtia. Search, find, call, get help.

**Live:** https://te9bot.github.io/elakai/

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

## Architecture

There is no server of our own. Five pieces, and nothing between them:

| Piece | What it is |
| --- | --- |
| GitHub Pages | The frontend. Static build of this repo, served under `/elakai/`. |
| Supabase Auth | Admin sign-in, email + password. |
| Supabase Postgres | `public.listings` — the content the admin panel writes. |
| Supabase Storage | `elakai-images` — listing photos, public bucket. |
| Supabase RLS | Authorization. The only thing that actually enforces it. |

The browser talks to Supabase directly with the **publishable (anon) key**,
which ships in the bundle because that is what it is for. It grants no authority
on its own: the RLS policies let anyone read `status = 'active'` rows and let
exactly one user id write anything. A `service_role` key would bypass all of
that and must never appear in `.env.local`, in CI, or anywhere Vite can inline
it.

### The listings table

`public.listings` is the whole content model — one flat table, edited by one
form, read by every public section. `section` says which part of the site a row
belongs to (`healthcare`, `services`, `rentals`, `utilities`, `emergency`),
`display_order` sets the sequence, and `status` decides whether the public site
sees it at all. Only `'active'` is ever served publicly; anything else is
treated as hidden, so a typo hides a listing rather than publishing one.

`src/lib/listings.ts` holds the row shape and vocabulary, `src/lib/api.ts` the
public reads, `src/lib/listings-admin.ts` the admin writes and the storage
calls. Nothing else touches the table.

### The bundled dataset

`src/data/` still backs the directory pages — the businesses, rentals, doctors
and emergency contacts the site shipped with. Those live in tables this project
does not have, so `src/lib/api.ts` falls back to the bundled copies when a table
is missing, and only when it is missing; every other error still surfaces. That
is what lets the backend be switched on for `listings` without the rest of the
site going dark. Admin-managed listings render alongside that content, never
instead of it.

### Connecting a different project

Copy `.env.example` to `.env.local` and fill in the project URL and the
publishable key (Project Settings → Data API / API Keys). Vite only exposes
`VITE_`-prefixed variables to client code — `NEXT_PUBLIC_` names are inert here.

The project needs `public.listings`, the `elakai-images` bucket, and RLS
policies comparing `auth.uid()` to the admin's id. Set that same id as
`ADMIN_USER_ID` in `src/lib/config.ts`; it decides which screen renders, while
the policies decide what the queries are actually allowed to do. Create the
admin under Authentication → Users — there is no `admin_users` table to
populate.

## Deployment

GitHub Pages serves the `gh-pages` branch, which holds a production build of
`main`. Redeploying is manual:

```bash
npm run build
git worktree add --orphan -b gh-pages /tmp/ghpages   # first time only
cp -r dist/* /tmp/ghpages/
cd /tmp/ghpages && git add -A && git commit -m "Deploy" && git push origin gh-pages
```

Build locally, not in CI, unless the Supabase URL and publishable key are
configured as repository variables — `.env.local` is gitignored, so a CI build
without them produces a bundle with no backend, and an admin panel that reports
itself unconfigured.

`dist/404.html` is emitted by the build (see `githubPagesSpaFallback` in
`vite.config.ts`) and must ship with the rest of `dist/`. Pages has no rewrite
rules, so it is the only reason `/elakai/admin` survives a refresh or a
bookmarked deep link: Pages serves it for any path with no matching file, the
router reads the URL, and the right screen renders.

`.github/workflows/deploy.yml` exists locally and would automate this on every
push to `main`, but it is **not committed** — pushing a file under
`.github/workflows/` requires the `workflow` OAuth scope. To switch over:

```bash
gh auth refresh -h github.com -s workflow
git add .github/workflows/deploy.yml && git commit -m "Add Pages deploy workflow"
git push
gh api -X PUT /repos/te9bot/elakai/pages -f build_type=workflow
git push origin --delete gh-pages
```

The site is served from a subpath, so `base` in `vite.config.ts` and `basename` in
`src/App.tsx` are both set to `/elakai`. If the repository is ever renamed, update
both, along with the PWA `start_url`, `scope`, and icon paths in `vite.config.ts`.
