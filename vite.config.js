import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// ========================================
// Custom API plugin for handling server routes
// ========================================

function apiPlugin() {
  console.log('🚀 Loading modular API structure from server/');
  // Dynamic import of modular structure
  return import('./server/index.js').then(module => {
    return module.apiPlugin();
  }).catch(err => {
    console.error('❌ Failed to load API structure:', err);
    throw err;
  });
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiPlugin()],
  base: '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 3000,
  },
});
