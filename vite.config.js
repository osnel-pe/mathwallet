import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      includeAssets: [
        'favicon-32.png',
        'apple-touch-icon.png',
        'logo.png',
        'math-background.jpg'
      ],

      manifest: {
        id: '/',
        name: 'MathWallet',
        short_name: 'MathWallet',

        description:
          'Billetera escolar para administrar y consultar MathCoins.',

        theme_color: '#032219',
        background_color: '#03110d',

        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',

        categories: [
          'education',
          'productivity'
        ],

        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },

      workbox: {
        cleanupOutdatedCaches: true,

        navigateFallback: '/index.html',

        globPatterns: [
          '**/*.{js,css,html,png,jpg,jpeg,svg,webp,woff2}'
        ]
      }
    })
  ]
})