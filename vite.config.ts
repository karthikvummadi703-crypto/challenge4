import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    server: {
      host: '0.0.0.0',
      port: 5000,
      allowedHosts: true as const,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },

    build: {
      // ── Performance: raise the inline-asset threshold ──────────────────────
      // Small assets (<8 KB) are inlined as base64 instead of separate requests.
      assetsInlineLimit: 8192,

      // ── Performance: vendor code splitting ────────────────────────────────
      // Splits the bundle into named chunks so the browser can cache heavy
      // libraries independently from application code. Each chunk is only
      // downloaded once and reused across navigations.
      rollupOptions: {
        output: {
          manualChunks: {
            // React runtime — changes rarely, cached aggressively
            'vendor-react': ['react', 'react-dom'],

            // Motion (formerly Framer Motion) — animation library, separate chunk
            'vendor-motion': ['motion'],

            // Three.js + React Three Fiber — heavy 3D runtime
            'vendor-three': ['three', '@react-three/fiber', 'ogl'],

            // Firebase client SDK — authentication + Firestore
            'vendor-firebase': [
              'firebase/app',
              'firebase/auth',
              'firebase/firestore',
            ],

            // Gemini / Google AI client
            'vendor-ai': ['@google/genai'],

            // UI icon library
            'vendor-icons': ['lucide-react'],
          },
        },
      },
    },
  };
});
