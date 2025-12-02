
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Custom plugin to copy sw.js to dist folder during build
const copySwPlugin = () => {
  return {
    name: 'copy-sw',
    closeBundle() {
      try {
        const swPath = path.resolve('sw.js');
        const distSwPath = path.resolve('dist/sw.js');
        
        // Ensure dist directory exists
        if (!fs.existsSync(path.resolve('dist'))) {
            fs.mkdirSync(path.resolve('dist'));
        }

        if (fs.existsSync(swPath)) {
          fs.copyFileSync(swPath, distSwPath);
          console.log('✅ [Vite Build] Copied sw.js to dist/ successfully.');
        } else {
          console.warn('⚠️ [Vite Build] sw.js not found in root.');
        }
      } catch (e) {
        console.error('❌ [Vite Build] Failed to copy sw.js:', e);
      }
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve('.'), '');
  // Prioritize VITE_ prefixed keys, fallback to standard
  const apiKey = env.VITE_API_KEY || env.API_KEY || process.env.VITE_API_KEY || process.env.API_KEY || '';

  return {
    plugins: [
      react(), 
      copySwPlugin() // Activate the copy plugin
    ],
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1600,
    },
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
  };
});
