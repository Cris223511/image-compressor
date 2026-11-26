import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// los códecs de jsquash cargan su wasm con import.meta.url, por eso se excluyen del
// prescaneo de dependencias: así vite los sirve tal cual y encuentra los .wasm junto al js
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: [
      '@jsquash/jpeg',
      '@jsquash/png',
      '@jsquash/oxipng',
      '@jsquash/webp',
      '@jsquash/avif',
    ],
  },
  worker: { format: 'es' },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
  },
})
