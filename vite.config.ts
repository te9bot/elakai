import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Emits `dist/404.html` as a byte-for-byte copy of `dist/index.html`.
 *
 * GitHub Pages is static file hosting with no rewrite rules, so a request for
 * `/elakai/admin` — a route that exists only inside the React router — finds no
 * file and is served the 404 page. Making that page the app means the router
 * boots, reads `location.pathname`, and renders the right screen. Without it,
 * every deep link and every refresh away from `/elakai/` is a hard 404: opening
 * a bookmarked `/elakai/admin`, or simply pressing reload while signed in.
 *
 * This has to happen at build time rather than as a documented `cp` in the
 * deploy steps, because a manual step that only breaks deep links is a step
 * that gets skipped and stays broken until somebody reloads the admin panel.
 *
 * The copy is written after the bundle closes; `globIgnores` below keeps it out
 * of the service worker's precache manifest, so this is one route fallback
 * rather than a second copy of the app shell shipped to every visitor.
 */
function githubPagesSpaFallback(): Plugin {
  let outDir = 'dist'
  return {
    name: 'elakai:gh-pages-spa-fallback',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    closeBundle() {
      const index = path.resolve(outDir, 'index.html')
      if (!fs.existsSync(index)) {
        this.warn('index.html was not emitted — skipping the 404.html SPA fallback.')
        return
      }
      fs.copyFileSync(index, path.resolve(outDir, '404.html'))
    },
  }
}

export default defineConfig({
  // Served from https://te9bot.github.io/elakai/, not a domain root.
  base: '/elakai/',
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',

      /*
       * We register the service worker ourselves, in src/lib/pwa.ts.
       *
       * The script this would otherwise inject only calls `.register()`. It
       * never notices that an update has activated, so a returning visitor
       * kept seeing the previous build until their *next* navigation — which
       * is what made a shipped deploy look like it had not shipped at all.
       *
       * `null` stops the injection so the two registrations cannot race.
       */
      injectRegister: null,

      includeAssets: ['favicon.svg', 'offline.html'],
      manifest: {
        name: 'ELAKAI — Your Local Information. One Place.',
        short_name: 'ELAKAI',
        description:
          'Find trusted local services and emergency contacts in Kushtia. Search, find, call, get help.',
        theme_color: '#2498EB',
        background_color: '#F8FAFC',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/elakai/',
        scope: '/elakai/',
        lang: 'bn',
        categories: ['navigation', 'utilities', 'medical'],
        icons: [
          { src: '/elakai/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/elakai/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/elakai/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // 404.html is a byte-for-byte copy of index.html that exists only so
        // GitHub Pages has something to serve for client-side routes. Precaching
        // it would ship the app shell twice; navigations are already handled by
        // navigateFallback against the real index.html.
        globIgnores: ['404.html'],
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            // Map tiles are the only external request in the app, and only
            // after the user explicitly taps "Show map".
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
    // Last, so it copies the fully transformed index.html — the one that
    // already carries the PWA registration script.
    githubPagesSpaFallback(),
  ],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('leaflet')) return 'maps'
            if (id.includes('framer-motion')) return 'motion'
            // Split out so the admin panel's auth/storage usage does not sit in
            // the entry chunk that every public visitor downloads.
            if (id.includes('@supabase')) return 'supabase'
            if (id.includes('react-dom') || id.includes('react-router')) return 'react-vendor'
          }
        },
      },
    },
  },
})
