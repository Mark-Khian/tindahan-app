import { defineConfig } from 'vitest/config'

// Firestore security rules tests. Run through `npm run test:rules`, which starts the
// Firestore emulator (demo project, no real Firebase project involved).
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
})
