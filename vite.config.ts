import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: process.env.ELECTRON === 'true' ? './' : '/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    exclude: ['node_modules', 'dist', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      // Only measure coverage for the pure-logic modules that have unit tests.
      // Scene/rendering code requires WebGL and is exercised by E2E tests instead.
      include: [
        'src/lib/formula/**',
        'src/lib/io/sceneSerializer.ts',
        'src/lib/io/capnpSerializer.ts',
        'src/lib/materials/materialLibrary.ts',
        'src/lib/tools/SmoothingEngine.ts',
        'src/store/sceneStore.ts',
      ],
      // Thresholds reflect current baseline; raise as coverage grows
      thresholds: { lines: 30, functions: 24, branches: 25 },
    },
  },
})
