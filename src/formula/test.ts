/**
 * Simple test for formula engine
 */

import { parseFormula } from './parser';
import { FormulaEvaluator, WorkbookContext } from './evaluator';

// Create a simple test context
const testContext: WorkbookContext = {
  getCellValue: (reference: string) => {
    const cellValues: Record<string, any> = {
      'A1': 10,
      'A2': 20,
      'A3': 30,
      'B1': 'Hello',
      'B2': 'World',
      'C1': true,
      'C2': false
    };
    return cellValues[reference] || 0;
  },
  
  getNamedRangeValue: (name: string) => {
    return 0; // Not implemented for test
  },
  
  getRangeValues: (range: string) => {
    // Simple implementation for test
    if (range === 'A1:A3') {
      return [[10], [20], [30]];
    }
    return [];
  }
};

// Test function
export function testFormulaEngine(): void {
  const evaluator = new FormulaEvaluator();
  
  const testCases = [
    { formula: '=2+3', expected: 5 },
    { formula: '=A1+A2', expected: 30 },
    { formula: '=SUM(10,20,30)', expected: 60 },
    { formula: '=AVERAGE(10,20,30)', expected: 20 },
    { formula: '=IF(C1,"Yes","No")', expected: 'Yes' },
    { formula: '=CONCATENATE(B1," ",B2)', expected: 'Hello World' },
    { formula: '=ROUND(3.14159,2)', expected: 3.14 }
  ];
  
  console.log('🧪 Testing Formula Engine...\n');
  
  let passed = 0;
  let total = testCases.length;
  
  for (const test of testCases) {
    try {
      const ast = parseFormula(test.formula);
      const result = evaluator.evaluate(ast, testContext);
      
      if (result === test.expected) {
        console.log(`✅ ${test.formula} = ${result}`);
        passed++;
      } else {
        console.log(`❌ ${test.formula} = ${result} (expected ${test.expected})`);
      }
    } catch (error) {
      console.log(`❌ ${test.formula} = ERROR: ${error}`);
    }
  }
  
  console.log(`\n📊 Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Formula engine is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the implementation.');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testFormulaEngine();
}