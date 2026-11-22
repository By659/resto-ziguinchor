import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Mode offline partiel exigé par le cahier des charges :
      // met en cache les fichiers statiques (HTML/JS/CSS) pour un accès hors-ligne basique.
      // Les données dynamiques (menu, commandes) ne sont pas mises en cache ici (TODO si besoin).
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      manifest: {
        name: 'Plateforme de commande - Ziguinchor',
        short_name: 'RestoZig',
        description: 'Commande en ligne pour restaurants de Ziguinchor',
        theme_color: '#7A5E12',
        background_color: '#FFF3D8',
        display: 'standalone',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  preview: {
    allowedHosts: ['.manus.computer'],
  },
});
