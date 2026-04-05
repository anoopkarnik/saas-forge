import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    alias: {
      '@': path.resolve(__dirname, './src')
    },
    include: ['**/*.test.{ts,tsx}']
  }
})
