import react from '@vitejs/plugin-react';
// vitest's defineConfig is vite's, widened to accept the `test` block.
import { defineConfig } from 'vitest/config';

// Pages serves this repo at /DnD/, so the built asset URLs need that prefix.
// `npm run dev` serves from the same path, which keeps hash links identical
// between dev and production.
export default defineConfig({
  base: '/DnD/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
