import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite configuration for SahamGue frontend.
 *
 * API routing options (choose one for local development):
 *
 *   Option A (recommended): Run Caddy gateway on :8080 which routes
 *   all /api/* traffic to the correct backend. No proxy config needed here.
 *   Set VITE_API_URL=http://localhost:8080 in .env.development.
 *
 *   Option B (fallback): Use the Vite dev proxy below without Caddy.
 *   Set VITE_API_URL="" (empty) and the proxy takes over for /api/* paths.
 *
 * NOTE: GEMINI_API_KEY is intentionally NOT defined here.
 * All AI calls go through the Python backend /api/ai/* endpoints.
 */
export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',

    // Option B: Vite proxy fallback (used when Caddy is not running)
    proxy: {
      // Node.js news microservice routes
      '/api/news': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/agent': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Python FastAPI — all other /api/* routes
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
