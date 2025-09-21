/**
 * Jest Test Setup
 * Runs before each test file
 */

import 'dotenv/config';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

// Test API keys (using fake values for safety)
process.env.DEEPSEEK_API_KEY = 'test-deepseek-key';
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.OPENAI_API_KEY = 'test-openai-key';

// Global test utilities
import { TestDataManager } from './utils/test-data-manager';
import { MockProviderFactory } from './mocks/ai-providers/mock-provider-factory';

// Make utilities available globally
declare global {
  var testDataManager: any;
  var mockProviderFactory: any;
}

// Initialize test utilities
global.testDataManager = new TestDataManager();
global.mockProviderFactory = new MockProviderFactory();

// Configure test timeouts
jest.setTimeout(30000);

// Suppress console output during tests (unless debugging)
if (!process.env.DEBUG_TESTS) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
}

// Clean up after each test
afterEach(async () => {
  // Check if this is a performance test suite that should preserve files
  const suiteFullName = expect.getState().testPath || '';
  const isPerformanceTest = suiteFullName.includes('performance') || suiteFullName.includes('benchmarks');

  if (!isPerformanceTest) {
    // Clean up test files
    await global.testDataManager.cleanup();
  }

  // Reset all mocks
  jest.clearAllMocks();
  global.mockProviderFactory.resetAll();
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Setup test environment for each test suite
beforeAll(async () => {
  // Check if this is an integration test that needs data
  const suiteFullName = expect.getState().testPath || '';
  const isIntegrationTest = suiteFullName.includes('integration') || suiteFullName.includes('workflow');

  if (isIntegrationTest) {
    // Generate business datasets for integration tests
    console.log('📊 Generating business datasets for integration tests...');
    await global.testDataManager.generateBusinessDatasets();
    await global.testDataManager.generateValidationTestData();
  }
});

// Clean up after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');

  const fs = await import('fs');
  const path = await import('path');

  const tempDir = path.resolve('tests/temp');
  try {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
});