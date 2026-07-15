import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { execSync } from 'child_process'

const buildNumber = (() => {
  try { return execSync('git rev-list --count HEAD').toString().trim() }
  catch { return '0' }
})()

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(`1.0.${buildNumber}`),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'sv_logo.png'],
      manifest: {
        name: 'SV Recommend',
        short_name: 'SV Recommend',
        description: 'Recommendations app for SV College students',
        theme_color: '#0F1117',
        background_color: '#0F1117',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
