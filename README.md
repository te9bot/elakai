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

## Backend (Supabase)

Optional. With no backend configured the app runs entirely on the bundled data
in `src/data/` — that is what the live site does today. `HAS_BACKEND` in
`src/lib/supabase.ts` is what switches the two, and `src/lib/api.ts` is the only
module that sees the difference.

To connect a project:

1. **Create it** at [supabase.com/dashboard](https://supabase.com/dashboard).

2. **Run the SQL**, in order, in the dashboard's SQL Editor:

   ```
   supabase/migrations/0001_schema.sql
   supabase/migrations/0002_rls.sql
   supabase/migrations/0003_coverage_bands.sql
   supabase/seed.sql
   ```

   Or, with the CLI: `npx supabase login`, `npx supabase link --project-ref <ref>`,
   `npx supabase db push`. `db push` applies the migrations but not the seed —
   paste `seed.sql` into the SQL Editor after it.

   `seed.sql` is generated. Regenerate it from `src/data/` with
   `node scripts/generate-seed.mjs`; never edit it by hand. It is idempotent, and
   deliberately never overwrites `status` or `featured` — re-seeding cannot
   republish something an editor took down.

3. **Point the app at it.** Copy `.env.example` to `.env.local` and fill in the
   project URL and the **anon** key (Project Settings → Data API / API Keys).
   Both are public and ship in the bundle; that is what the anon key is for.
   The `service_role` key and the database password must never appear in
   `.env.local`, in CI, or anywhere Vite can inline them.

4. **Bootstrap the first admin.** Create the user under Authentication → Users,
   then run this in the SQL Editor — RLS blocks admins from creating the first
   admin, so it has to come from here:

   ```sql
   insert into admin_users (id, email, display_name, role)
   select id, email, 'Owner', 'owner' from auth.users where email = 'you@example.com';
   ```

   `/admin` is then reachable with that account.

### What the admin panel controls

Healthcare facilities, doctors, local services, rentals, emergency contacts, and
**Homepage bands** — the "Covering" strip and "Everything ELAKAI covers", both
rows of `category_bar_items` split on `band`. Publishing, archiving or
reordering a chip there changes the public strip on the next load with no
deploy: the bands measure whatever they are handed and derive the loop from it.
See `src/components/infinite-track.tsx`.

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
gh api -X PUT /repos/te9bot/elakai/pages -f build_type=workflow
git push origin --delete gh-pages
```

The site is served from a subpath, so `base` in `vite.config.ts` and `basename` in
`src/App.tsx` are both set to `/elakai`. If the repository is ever renamed, update
both, along with the PWA `start_url`, `scope`, and icon paths in `vite.config.ts`.
