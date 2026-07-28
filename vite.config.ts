import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  // Served from https://whitedevil-141.github.io/elakai/, not a domain root.
  base: '/elakai/',
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'offline.html'],
      manifest: {
        name: 'ELAKAI — Your Local Information. One Place.',
        short_name: 'ELAKAI',
        description:
          'Find trusted local services and emergency contacts in Kushtia. Search, find, call, get help.',
        theme_color: '#2563EB',
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
            if (id.includes('react-dom') || id.includes('react-router')) return 'react-vendor'
          }
        },
      },
    },
  },
})
