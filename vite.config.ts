import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import pkg from './package.json'

// los códecs de jsquash cargan su wasm con import.meta.url, por eso se excluyen del
// prescaneo de dependencias: así vite los sirve tal cual y encuentra los .wasm junto al js
export default defineConfig({
  plugins: [react()],
  // la versión del paquete llega al código para mostrarla en el footer
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
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
