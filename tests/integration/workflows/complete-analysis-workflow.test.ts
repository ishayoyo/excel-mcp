/**
 * Integration Tests for Complete Analysis Workflows
 * Tests end-to-end scenarios combining multiple operations
 */

import { DataOperationsHandler } from '../../../src/handlers/data-operations';
import { AnalyticsHandler } from '../../../src/handlers/analytics';
import { AIOperationsHandler } from '../../../src/handlers/ai-operations';
import { FileOperationsHandler } from '../../../src/handlers/file-operations';

describe('Complete Analysis Workflows', () => {
  let dataHandler: DataOperationsHandler;
  let analyticsHandler: AnalyticsHandler;
  let aiHandler: AIOperationsHandler;
  let fileHandler: FileOperationsHandler;
  let businessDatasets: Record<string, string>;

  beforeAll(async () => {
    // Initialize handlers
    dataHandler = new DataOperationsHandler();
    analyticsHandler = new AnalyticsHandler();
    aiHandler = new AIOperationsHandler();
    fileHandler = new FileOperationsHandler();

    // Generate comprehensive business datasets
    businessDatasets = await global.testDataManager.generateBusinessDatasets();

    console.log('📊 Business datasets generated for integration testing');
  });

  describe('Sales Analysis Workflow', () => {
    test('should perform complete sales data analysis', async () => {
      // Step 1: Read and validate the sales data
      const readResult = await dataHandler.readFile({
        filePath: businessDatasets.sales
      });

      const readResponse = JSON.parse(readResult.content[0].text);
      expect(readResponse.success).toBe(true);
      expect(readResponse.headers).toContain('Revenue');

      // Step 2: Get basic statistics
      const statsResult = await analyticsHandler.statisticalAnalysis({
        filePath: businessDatasets.sales,
        column: 'Revenue'
      });

      const statsResponse = JSON.parse(statsResult.content[0].text);
      expect(statsResponse.success).toBe(true);
      expect(statsResponse.statistics.mean).toBeGreaterThan(0);

      // Step 3: Create pivot table by region
      const pivotResult = await analyticsHandler.pivotTable({
        filePath: businessDatasets.sales,
        groupBy: 'Region',
        aggregateColumn: 'Revenue',
        operation: 'sum'
      });

      const pivotResponse = JSON.parse(pivotResult.content[0].text);
      expect(pivotResponse.success).toBe(true);
      expect(pivotResponse.pivotTable).toBeDefined();

      // Step 4: Filter high-value transactions
      const filterResult = await dataHandler.filterRows({
        filePath: businessDatasets.sales,
        column: 'Revenue',
        condition: 'greater_than',
        value: '500'
      });

      const filterResponse = JSON.parse(filterResult.content[0].text);
      expect(filterResponse.success).toBe(true);

      // Step 5: Export analysis results
      const exportResult = await fileHandler.exportAnalysis({
        analysisType: 'pivot_table',
        sourceFile: businessDatasets.sales,
        outputFile: 'tests/temp/sales_analysis_export.xlsx',
        analysisParams: {
          groupBy: 'Region',
          aggregateColumn: 'Revenue',
          operation: 'sum'
        }
      });

      const exportResponse = JSON.parse(exportResult.content[0].text);
      expect(exportResponse.success).toBe(true);

      console.log('✅ Complete sales analysis workflow completed successfully');
    });

    test('should identify sales trends and patterns', async () => {
      // Step 1: Analyze correlation between quantity and revenue
      const correlationResult = await analyticsHandler.correlationAnalysis({
        filePath: businessDatasets.sales,
        column1: 'Quantity',
        column2: 'Revenue'
      });

      const correlationResponse = JSON.parse(correlationResult.content[0].text);
      expect(correlationResponse.success).toBe(true);
      expect(correlationResponse.correlation).toBeDefined();

      // Step 2: Get data profile to understand distribution
      const profileResult = await analyticsHandler.dataProfile({
        filePath: businessDatasets.sales
      });

      const profileResponse = JSON.parse(profileResult.content[0].text);
      expect(profileResponse.success).toBe(true);
      expect(profileResponse.profile).toBeDefined();

      // Step 3: AI-powered analysis suggestions
      const aiResult = await aiHandler.smartDataAnalysis({
        filePath: businessDatasets.sales
      });

      const aiResponse = JSON.parse(aiResult.content[0].text);
      expect(aiResponse.success).toBe(true);
      expect(aiResponse.aiSuggestions).toBeDefined();

      console.log('✅ Sales trend analysis completed');
    });
  });

  describe('Employee Analytics Workflow', () => {
    test('should perform comprehensive employee analysis', async () => {
      // Step 1: Basic employee statistics
      const salaryStats = await analyticsHandler.statisticalAnalysis({
        filePath: businessDatasets.employees,
        column: 'Salary'
      });

      const salaryResponse = JSON.parse(salaryStats.content[0].text);
      expect(salaryResponse.success).toBe(true);

      // Step 2: Department-wise analysis
      const deptPivot = await analyticsHandler.pivotTable({
        filePath: businessDatasets.employees,
        groupBy: 'Department',
        aggregateColumn: 'Salary',
        operation: 'average'
      });

      const deptResponse = JSON.parse(deptPivot.content[0].text);
      expect(deptResponse.success).toBe(true);

      // Step 3: Filter senior employees
      const seniorFilter = await dataHandler.filterRows({
        filePath: businessDatasets.employees,
        column: 'Salary',
        condition: 'greater_than',
        value: '60000'
      });

      const seniorResponse = JSON.parse(seniorFilter.content[0].text);
      expect(seniorResponse.success).toBe(true);

      // Step 4: Search for specific roles
      const searchResult = await dataHandler.search({
        filePath: businessDatasets.employees,
        searchValue: 'Manager',
        exact: false
      });

      const searchResponse = JSON.parse(searchResult.content[0].text);
      expect(searchResponse.success).toBe(true);

      console.log('✅ Employee analytics workflow completed');
    });
  });

  describe('Financial Reporting Workflow', () => {
    test('should generate comprehensive financial report', async () => {
      // Step 1: Read financial data (Excel with multiple sheets)
      const financialRead = await dataHandler.readFile({
        filePath: businessDatasets.financial,
        sheet: 'Income_Statement'
      });

      const financialResponse = JSON.parse(financialRead.content[0].text);
      expect(financialResponse.success).toBe(true);

      // Step 2: Calculate quarterly totals
      const q1Total = await dataHandler.aggregate({
        filePath: businessDatasets.financial,
        column: 'Q1',
        operation: 'sum'
      });

      const q1Response = JSON.parse(q1Total.content[0].text);
      expect(q1Response.success).toBe(true);

      // Step 3: Get range of data for formula evaluation
      const rangeResult = await dataHandler.getRange({
        filePath: businessDatasets.financial,
        startCell: 'B2',
        endCell: 'E6',
        sheet: 'Income_Statement'
      });

      const rangeResponse = JSON.parse(rangeResult.content[0].text);
      expect(rangeResponse.success).toBe(true);

      // Step 4: Use AI to explain financial formulas
      const formulaExplanation = await aiHandler.explainFormula({
        formula: '=SUM(B2:E2)'
      });

      const explanationResponse = JSON.parse(formulaExplanation.content[0].text);
      expect(explanationResponse.success).toBe(true);

      // Step 5: Create multi-sheet report
      const reportData = {
        'Summary': {
          data: [
            ['Metric', 'Q1', 'Q2', 'Q3', 'Q4'],
            ['Total Revenue', 100000, 120000, 130000, 140000],
            ['Total Expenses', 85000, 95000, 100000, 105000],
            ['Net Profit', 15000, 25000, 30000, 35000]
          ],
          headers: ['Metric', 'Q1', 'Q2', 'Q3', 'Q4']
        },
        'Analysis': {
          data: [
            ['Period', 'Growth Rate', 'Profit Margin'],
            ['Q1', '0%', '15%'],
            ['Q2', '20%', '21%'],
            ['Q3', '8%', '23%'],
            ['Q4', '8%', '25%']
          ],
          headers: ['Period', 'Growth Rate', 'Profit Margin']
        }
      };

      const multiSheetResult = await fileHandler.writeFile({
        filePath: 'tests/temp/financial_report.xlsx',
        sheets: Object.entries(reportData).map(([name, config]) => ({
          name,
          data: config.data,
          headers: config.headers
        }))
      });

      const multiSheetResponse = JSON.parse(multiSheetResult.content[0].text);
      expect(multiSheetResponse.success).toBe(true);

      console.log('✅ Financial reporting workflow completed');
    });
  });

  describe('Data Quality and Validation Workflow', () => {
    test('should perform comprehensive data validation', async () => {
      // Generate validation test data
      const validationData = await global.testDataManager.generateValidationTestData();

      // Step 1: Profile both datasets
      const branchProfile = await analyticsHandler.dataProfile({
        filePath: validationData.branches
      });

      const transactionProfile = await analyticsHandler.dataProfile({
        filePath: validationData.transactions
      });

      expect(JSON.parse(branchProfile.content[0].text).success).toBe(true);
      expect(JSON.parse(transactionProfile.content[0].text).success).toBe(true);

      // Step 2: Search for missing values
      const missingCheck = await dataHandler.search({
        filePath: validationData.transactions,
        searchValue: '',
        exact: true
      });

      const missingResponse = JSON.parse(missingCheck.content[0].text);
      expect(missingResponse.success).toBe(true);

      // Step 3: Validate referential integrity using aggregation
      const branchCount = await dataHandler.aggregate({
        filePath: validationData.branches,
        column: 'Branch_ID',
        operation: 'count'
      });

      const transactionBranchCount = await dataHandler.aggregate({
        filePath: validationData.transactions,
        column: 'Branch_ID',
        operation: 'count'
      });

      const branchCountResponse = JSON.parse(branchCount.content[0].text);
      const transactionCountResponse = JSON.parse(transactionBranchCount.content[0].text);

      expect(branchCountResponse.success).toBe(true);
      expect(transactionCountResponse.success).toBe(true);

      console.log('✅ Data validation workflow completed');
    });
  });

  describe('Cross-Module Integration', () => {
    test('should seamlessly integrate all modules in complex workflow', async () => {
      // Step 1: AI suggests analysis approach
      const aiSuggestion = await aiHandler.smartDataAnalysis({
        filePath: businessDatasets.sales
      });

      const aiResponse = JSON.parse(aiSuggestion.content[0].text);
      expect(aiResponse.success).toBe(true);

      // Step 2: Implement one of the AI suggestions using data operations
      const implementSuggestion = await dataHandler.aggregate({
        filePath: businessDatasets.sales,
        column: 'Revenue',
        operation: 'sum'
      });

      const implementResponse = JSON.parse(implementSuggestion.content[0].text);
      expect(implementResponse.success).toBe(true);

      // Step 3: Perform advanced analytics
      const advancedAnalytics = await analyticsHandler.correlationAnalysis({
        filePath: businessDatasets.sales,
        column1: 'Price',
        column2: 'Revenue'
      });

      const analyticsResponse = JSON.parse(advancedAnalytics.content[0].text);
      expect(analyticsResponse.success).toBe(true);

      // Step 4: Use AI to interpret results
      const interpretation = await aiHandler.parseNaturalLanguage({
        query: `Explain what a correlation of ${analyticsResponse.correlation} means`,
        filePath: businessDatasets.sales
      });

      const interpretationResponse = JSON.parse(interpretation.content[0].text);
      expect(interpretationResponse.success).toBe(true);

      // Step 5: Export comprehensive results
      const finalExport = await fileHandler.writeFile({
        filePath: 'tests/temp/comprehensive_analysis.csv',
        data: [
          ['Analysis Type', 'Result', 'Interpretation'],
          ['Total Revenue', implementResponse.result, 'Sum of all sales'],
          ['Price-Revenue Correlation', analyticsResponse.correlation, 'Relationship strength'],
          ['AI Suggestion Count', aiResponse.aiSuggestions?.length || 0, 'Number of AI recommendations']
        ],
        headers: ['Analysis Type', 'Result', 'Interpretation']
      });

      const exportResponse = JSON.parse(finalExport.content[0].text);
      expect(exportResponse.success).toBe(true);

      console.log('✅ Cross-module integration workflow completed successfully');
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should gracefully handle errors and continue workflow', async () => {
      // Step 1: Attempt operation on non-existent file (should fail gracefully)
      const invalidRead = await dataHandler.readFile({
        filePath: 'non-existent-file.csv'
      });

      const invalidResponse = JSON.parse(invalidRead.content[0].text);
      expect(invalidResponse.success).toBe(false);
      expect(invalidResponse.error).toBeDefined();

      // Step 2: Continue with valid operations despite previous failure
      const validRead = await dataHandler.readFile({
        filePath: businessDatasets.sales
      });

      const validResponse = JSON.parse(validRead.content[0].text);
      expect(validResponse.success).toBe(true);

      // Step 3: Handle malformed parameters gracefully
      const malformedFilter = await dataHandler.filterRows({
        filePath: businessDatasets.sales,
        column: 'NonExistentColumn',
        condition: 'equals',
        value: 'test'
      });

      const malformedResponse = JSON.parse(malformedFilter.content[0].text);
      expect(malformedResponse.success).toBe(false);

      // Step 4: Recover and perform valid analysis
      const recoveryAnalysis = await analyticsHandler.statisticalAnalysis({
        filePath: businessDatasets.sales,
        column: 'Revenue'
      });

      const recoveryResponse = JSON.parse(recoveryAnalysis.content[0].text);
      expect(recoveryResponse.success).toBe(true);

      console.log('✅ Error recovery workflow completed - system remains resilient');
    });
  });

  afterAll(async () => {
    console.log('🧹 Integration test cleanup complete');
  });
});