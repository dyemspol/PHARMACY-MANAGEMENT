import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Pharmacy Management System',
        short_name: 'PharmacyMS',
        description: 'Advanced Pharmacy Management and Inventory System',
        theme_color: '#0d9488',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'logo.png',
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
        accounts: resolve(__dirname, 'accounts.html'),
        printer_settings: resolve(__dirname, 'printer_settings.html'),
      }
    }
  }
})