# 🧪 Excel MCP Server - Comprehensive Test Suite

This directory contains a complete testing framework for the Excel MCP Server, designed to ensure reliability, performance, and correctness across all features.

## 📁 Test Structure

```
tests/
├── unit/                          # Unit tests for individual components
│   ├── data-operations/           # Basic data reading/writing operations
│   ├── ai-operations/             # AI-powered functionality
│   ├── analytics/                 # Statistical analysis and correlations
│   ├── file-operations/           # File creation and export
│   ├── bulk-operations/           # Multi-file parallel processing
│   ├── validation/                # Data consistency validation
│   ├── formula/                   # Formula parsing and evaluation
│   └── error-handling/            # Edge cases and error scenarios
├── integration/                   # Integration tests
│   ├── workflows/                 # End-to-end business workflows
│   └── cross-module/              # Inter-module communication
├── performance/                   # Performance and load testing
│   ├── benchmarks/                # Performance benchmarks
│   ├── load/                      # Load testing scenarios
│   └── stress/                    # Stress testing with extreme loads
├── e2e/                          # End-to-end tests
├── data/                         # Test data files
│   ├── csv/                      # Sample CSV files
│   ├── excel/                    # Sample Excel files
│   ├── large/                    # Large datasets for performance testing
│   └── invalid/                  # Invalid/corrupted files for error testing
├── mocks/                        # Mock implementations
│   ├── ai-providers/             # Mock AI providers for testing
│   ├── file-system/              # File system mocks
│   └── network/                  # Network operation mocks
├── utils/                        # Test utilities and helpers
└── temp/                         # Temporary files (auto-cleaned)
```

## 🚀 Quick Start

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Unit tests only (fastest)
npm run test:unit

# Integration tests
npm run test:integration

# Performance tests
npm run test:performance

# End-to-end tests
npm run test:e2e

# Quick smoke test
npm run test:quick
```

### Development Testing
```bash
# Watch mode for development
npm run test:watch

# Verbose output for debugging
npm run test:verbose

# Debug mode with detailed logging
npm run test:debug

# Coverage report
npm run test:coverage
```

## 📊 Test Categories

### 🔧 Unit Tests
- **Data Operations**: File reading, cell access, range operations, search, filtering, aggregation
- **AI Operations**: Natural language processing, formula explanation, smart analysis
- **Analytics**: Statistical analysis, correlations, pivot tables, data profiling
- **File Operations**: File writing, Excel creation, multi-sheet operations
- **Formula Engine**: Formula parsing, evaluation, cross-sheet references
- **Error Handling**: Edge cases, invalid inputs, resource limits

### 🔄 Integration Tests
- **Complete Workflows**: End-to-end business analysis scenarios
- **Cross-Module**: Testing interaction between different system components
- **Data Validation**: Multi-file consistency checks and referential integrity

### ⚡ Performance Tests
- **Benchmarks**: Performance metrics for core operations
- **Load Testing**: Behavior under high concurrent usage
- **Memory Testing**: Memory usage and leak detection
- **Large Dataset**: Handling of 100k+ row datasets

### 🎯 End-to-End Tests
- **Real-world Scenarios**: Complete user workflows from start to finish
- **AI Provider Integration**: Testing with actual AI services
- **File Format Compatibility**: Testing across different Excel/CSV variations

## 🛠️ Test Utilities

### TestDataManager
Generates realistic test data for various scenarios:
```javascript
// Generate business datasets
const datasets = await global.testDataManager.generateBusinessDatasets();

// Create large dataset for performance testing
const largeFile = await global.testDataManager.generateLargeDataset('test.csv', 100000);

// Generate corrupted data for error testing
const invalidFile = await global.testDataManager.generateInvalidData('corrupt.csv', 'malformed');
```

### MockProviderFactory
Creates mock AI providers for reliable testing:
```javascript
// Create working provider
const workingProvider = global.mockProviderFactory.createWorkingProvider('deepseek');

// Create failing provider
const failingProvider = global.mockProviderFactory.createFailingProvider('gemini', 'Service unavailable');

// Create slow provider for timeout testing
const slowProvider = global.mockProviderFactory.createSlowProvider('openai', 5000);
```

## 📈 Coverage Goals

| Component | Target Coverage | Current Status |
|-----------|----------------|----------------|
| Data Operations | 95% | ✅ |
| AI Operations | 90% | ✅ |
| Analytics | 95% | ✅ |
| File Operations | 90% | ✅ |
| Formula Engine | 85% | ✅ |
| Error Handling | 100% | ✅ |

## 🏃‍♂️ CI/CD Integration

### GitHub Actions
Tests run automatically on:
- Pull requests
- Pushes to main branch
- Daily scheduled runs
- Manual triggers

### Test Matrix
- Node.js versions: 18, 20, 22
- Operating systems: Ubuntu, Windows, macOS
- Test suites: unit, integration, performance

## 📋 Test Configuration

### Jest Configuration
- TypeScript support with ts-jest
- ESM module compatibility
- Coverage reporting with multiple formats
- Parallel test execution
- Custom test environments for different scenarios

### Environment Variables
```bash
# Enable debug output
DEBUG_TESTS=true npm test

# Set test timeout
JEST_TIMEOUT=60000 npm test

# Configure AI provider testing
TEST_WITH_REAL_AI=false npm test
```

## 🔍 Debugging Tests

### Common Issues
1. **File permission errors**: Ensure test temp directory is writable
2. **Memory issues**: Increase Node.js memory limit with `--max-old-space-size=4096`
3. **Timeout errors**: Increase timeout for performance tests
4. **AI provider failures**: Check API keys and network connectivity

### Debug Commands
```bash
# Run single test file
npx jest tests/unit/data-operations/data-operations.test.ts

# Run with debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Verbose output with stack traces
npm run test:debug
```

## 📝 Writing New Tests

### Test Naming Convention
```
describe('ComponentName', () => {
  describe('methodName', () => {
    test('should do something when condition is met', async () => {
      // Test implementation
    });
  });
});
```

### Best Practices
1. **Use descriptive test names** that explain the scenario and expected outcome
2. **Test both success and failure paths**
3. **Include performance assertions** for critical operations
4. **Clean up resources** in afterEach/afterAll hooks
5. **Use mocks** for external dependencies (AI providers, file system)
6. **Test edge cases** like empty files, large datasets, invalid inputs

### Example Test Structure
```typescript
describe('DataOperationsHandler', () => {
  let handler: DataOperationsHandler;
  let testFile: string;

  beforeAll(async () => {
    handler = new DataOperationsHandler();
    testFile = await global.testDataManager.generateCSV('test.csv', config);
  });

  test('should read CSV file successfully', async () => {
    const result = await handler.readFile({ filePath: testFile });
    const response = JSON.parse(result.content[0].text);

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
    expect(response.rowCount).toBeGreaterThan(0);
  });

  afterAll(async () => {
    await global.testDataManager.cleanup();
  });
});
```

## 🎯 Performance Benchmarks

### Current Benchmarks (on average hardware)
- **File Reading**: 100k rows in < 10 seconds
- **Search Operations**: 100k rows in < 5 seconds
- **Aggregations**: 100k rows in < 2 seconds
- **Cell Access**: 100 random cells in < 5 seconds
- **Formula Evaluation**: Simple formulas in < 100ms

### Performance Test Results
Run `npm run test:performance` to see current performance metrics on your system.

## 🔗 Related Documentation
- [Main README](../README.md) - Project overview and setup
- [API Documentation](../OPERATIONS.md) - Detailed API reference
- [Configuration Guide](../INSTALL.md) - Installation and configuration
- [Enhancement Suggestions](../EXCEL_MCP_ENHANCEMENT_SUGGESTIONS.md) - Future improvements