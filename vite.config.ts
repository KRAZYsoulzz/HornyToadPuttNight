import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifestFilename: 'manifest.json',
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
      includeAssets: [
        'favicon-64.png',
        'favicon-v2-64.png',
        'apple-touch-icon.png',
        'apple-touch-icon-v2.png',
        'icon-192.png',
        'icon-512.png',
        'icon-maskable-512.png',
        'icon-v2-192.png',
        'icon-v2-512.png',
        'icon-v2-maskable-512.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'icons.svg'
      ],
      devOptions: {
        enabled: true
      },
      manifest: {
        id: '/?pwa=v2',
        name: 'Horny Toad Putt Night',
        short_name: 'Putt Night',
        description: 'Horny Toad Putt Night Tournament Manager',
        start_url: '/',
        scope: '/',
        theme_color: '#121010',
        background_color: '#121010',
        display: 'standalone',
        icons: [
          {
            src: '/icon-v2-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-v2-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-v2-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
})
