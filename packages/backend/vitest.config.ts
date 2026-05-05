import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test-setup.ts'],
  },
  resolve: {
    alias: {
      '@natis/shared': decodeURIComponent(
        new URL('../shared/src/index.ts', import.meta.url).pathname
      ),
    },
  },
})
