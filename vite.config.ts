import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { version } from './package.json';

export default defineConfig({
  plugins: [
    react(),
    // The published version, fetched (never cached) by the running app to notice it's out of date (utils/appUpdate.ts).
    {
      name: 'chorequest-version-file',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version }) });
      },
    },
    // Installable PWA: web manifest + service worker that precaches the app shell for offline launch.
    VitePWA({
      registerType: 'autoUpdate',
      // Registered by utils/appUpdate.ts, which also checks for updates on resume and reloads into them.
      injectRegister: false,
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'logo.svg'],
      manifest: {
        id: '/',
        name: 'ChoreQuest',
        short_name: 'ChoreQuest',
        description: 'A cozy quest for a happier home',
        lang: 'vi',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#3d2518',
        background_color: '#2b1a12',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // A new version waits until utils/appUpdate.ts tells it to take over (when nothing is in progress), then claims
        // the open pages, which reload into it.
        clientsClaim: true,
        // Firebase's sign-in pages (proxied in vercel.json) must reach the network, not the app shell.
        navigateFallbackDenylist: [/^\/__\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    // The Firebase SDK alone is ~540 kB minified (~127 kB gzipped).
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Split heavy vendor libraries so app updates don't bust their browser cache.
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          react: ['react', 'react-dom', 'framer-motion'],
        },
      },
    },
  },
});
