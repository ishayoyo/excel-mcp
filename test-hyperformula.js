// Test HyperFormula integration
const { hyperFormulaEngine } = require('./dist/formula/hyperformula-engine');

console.log('=== Testing HyperFormula Integration ===');

// Test basic formula evaluation
try {
  const mockContext = {
    getCellValue: (ref) => {
      if (ref === 'A1') return 100;
      if (ref === 'B1') return 200;
      return 0;
    },
    getNamedRangeValue: () => 0,
    getRangeValues: () => [[100, 200]],
    getSheetCellValue: () => 0,
    getSheetRangeValues: () => []
  };

  // Test SUM function (should use HyperFormula)
  console.log('Testing SUM function...');
  const sumResult = hyperFormulaEngine.evaluateFormula('SUM(100,200)', mockContext);
  console.log('SUM(100,200) =', sumResult);

  // Test AVERAGE function
  console.log('Testing AVERAGE function...');
  const avgResult = hyperFormulaEngine.evaluateFormula('AVERAGE(100,200,300)', mockContext);
  console.log('AVERAGE(100,200,300) =', avgResult);

  // Check available functions
  console.log('\n=== Available Functions ===');
  const functions = hyperFormulaEngine.getAvailableFunctions();
  console.log(`HyperFormula supports ${functions.length} functions`);
  console.log('Sample functions:', functions.slice(0, 10));

  console.log('\n✅ HyperFormula integration successful!');

} catch (error) {
  console.error('❌ Error:', error.message);
}


