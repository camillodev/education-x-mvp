import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

// Integração roda contra o banco dev real (DATABASE_URL). Sem jsdom: é Node + Prisma.
// Sequencial (single fork) para evitar corrida entre testes que tocam o mesmo banco.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/integration/**/*.integration.test.ts'],
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
})
