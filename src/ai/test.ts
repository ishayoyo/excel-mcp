/**
 * Test AI Natural Language Processor
 */

import { NLPProcessor } from './nlp-processor';

export async function testNLPProcessor(): Promise<void> {
  console.log('🤖 Testing AI Natural Language Processor...\n');
  
  const nlp = new NLPProcessor();
  
  const testCommands = [
    'sum all values in column A',
    'find the average of sales data',
    'create a chart showing revenue by month',
    'clean duplicate entries',
    'calculate the maximum value'
  ];
  
  for (const command of testCommands) {
    try {
      const result = await nlp.parseCommand(command);
      console.log(`Input: "${command}"`);
      console.log(`Output:`, JSON.stringify(result, null, 2));
      console.log('---');
    } catch (error) {
      console.log(`❌ Error processing: "${command}"`, error);
    }
  }
  
  // Test formula building
  console.log('\n🔧 Testing Formula Building...\n');
  
  const formulaDescriptions = [
    'sum all values in column A',
    'calculate average of numbers in range B1:B10',
    'count non-empty cells'
  ];
  
  for (const description of formulaDescriptions) {
    try {
      const result = await nlp.buildFormula(description);
      console.log(`Description: "${description}"`);
      console.log(`Formula: ${result.formula}`);
      console.log(`Explanation: ${result.explanation}`);
      console.log('---');
    } catch (error) {
      console.log(`❌ Error building formula: "${description}"`, error);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testNLPProcessor().then(() => {
    console.log('✅ AI tests completed');
  }).catch(error => {
    console.error('❌ AI tests failed:', error);
  });
}