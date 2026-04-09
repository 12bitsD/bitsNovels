import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 20000,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      thresholds: { lines: 73 },
      include: ['src/features/**/*.ts', 'src/features/**/*.tsx'],
      exclude: ['**/*.test.*', '**/mocks/**']
    }
  },
  resolve: {
    alias: {
      '@tiptap/react': path.resolve(__dirname, './src/__mocks__/@tiptap/react.ts'),
      '@tiptap/starter-kit': path.resolve(__dirname, './src/__mocks__/@tiptap/starter-kit.ts'),
      '@tiptap/extension-character-count': path.resolve(__dirname, './src/__mocks__/@tiptap/extension-character-count.ts'),
    }
  }
})
