import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'inline',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'RiGHT MEDS Pharmacy System',
        short_name: 'RiGHT MEDS',
        description: 'Advanced Pharmacy Management and Inventory System',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/login.html',
        scope: '/',
        id: '/',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        inventory: resolve(__dirname, 'inventory.html'),
        pos: resolve(__dirname, 'POST_terminal.html'),
        sales: resolve(__dirname, 'sales.html'),
        reports: resolve(__dirname, 'reports.html'),
        shifting: resolve(__dirname, 'shifting.html'),
        accounts: resolve(__dirname, 'accounts.html'),
        printer_settings: resolve(__dirname, 'printer_settings.html'),
      }
    }
  }
})
