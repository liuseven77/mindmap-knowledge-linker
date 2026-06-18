import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg'],
      manifest: {
        name: '知识链接器 — MindMap Knowledge Linker',
        short_name: '知识链接器',
        description: '可视化的知识图谱工具，用节点和连线组织你的知识体系',
        theme_color: '#fbbf24',
        background_color: '#fffbeb',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: 'vite.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: 'vite.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
