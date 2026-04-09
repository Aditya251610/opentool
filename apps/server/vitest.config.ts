import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      TOKEN_ENCRYPTION_KEY: 'a'.repeat(64),
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      REDIS_URL: 'redis://localhost:6379',
    },
  },
})
