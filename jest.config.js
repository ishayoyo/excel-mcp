/** @type {import('jest').Config} */
module.exports = {
  // Environment
  preset: 'ts-jest',
  testEnvironment: 'node',

  // File patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.{js,ts}',
    '<rootDir>/tests/**/*.spec.{js,ts}'
  ],

  // TypeScript support
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        module: 'CommonJS',
        moduleResolution: 'node'
      }
    }]
  },

  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },

  // Coverage configuration
  collectCoverage: false, // Disabled by default for faster runs
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{js,ts}',
    '!src/**/*.spec.{js,ts}'
  ],

  // Test setup
  globalSetup: '<rootDir>/tests/global-setup.ts',
  globalTeardown: '<rootDir>/tests/global-teardown.ts',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Test organization
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],

  // Performance settings
  maxWorkers: '50%',
  testTimeout: 30000,

  // Verbose output for debugging
  verbose: true,

  // Error handling
  bail: false,
  errorOnDeprecated: false
};