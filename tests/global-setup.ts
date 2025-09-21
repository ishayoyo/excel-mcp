/**
 * Global Test Setup
 * Runs once before all tests
 */

import { promises as fs } from 'fs';
import path from 'path';
import { TestDataManager } from './utils/test-data-manager';

export default async function globalSetup() {
  console.log('🧪 Setting up Excel MCP Test Environment...');

  // Create test directories
  const testDirs = [
    'tests/temp',
    'tests/temp/output',
    'tests/temp/downloads',
    'tests/temp/cache'
  ];

  for (const dir of testDirs) {
    await fs.mkdir(path.resolve(dir), { recursive: true });
  }

  // Create persistent test data manager
  const testDataManager = new TestDataManager();

  console.log('📊 Generating persistent test data...');

  // Generate basic test files that will persist for performance tests
  await testDataManager.generateCSV('test.csv', {
    rows: 10,
    columns: ['ID', 'Name', 'Value'],
    dataTypes: { ID: 'number', Name: 'string', Value: 'number' },
    includeHeaders: true
  });

  // Generate business datasets for integration tests
  await testDataManager.generateBusinessDatasets();

  // Generate validation test data
  await testDataManager.generateValidationTestData();

  // Generate large datasets for performance tests
  await testDataManager.generateLargeDataset('large_dataset.csv', 100000);
  await testDataManager.generateLargeDataset('medium_dataset.csv', 10000);

  // Create a marker file to indicate setup is complete
  await fs.writeFile(path.resolve('tests/temp/.setup-complete'), 'true');

  console.log('✅ Test environment ready with persistent data');
}