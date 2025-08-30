module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/integration/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/helpers/setup.ts'],
  testTimeout: 30000,
  globalSetup: '<rootDir>/src/__tests__/helpers/globalSetup.ts',
  globalTeardown: '<rootDir>/src/__tests__/helpers/globalTeardown.ts',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/index.ts'
  ],
  // Ensure test environment variables are loaded
  setupFiles: ['<rootDir>/src/__tests__/helpers/loadEnv.ts']
};