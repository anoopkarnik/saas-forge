import { defineConfig } from 'vitest/config'
import path from 'path'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  // Next compiles JSX with the automatic runtime; match it so components need no React import.
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './')
    },
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', '.turbo', 'coverage', 'dist', 'build']
  }
})
