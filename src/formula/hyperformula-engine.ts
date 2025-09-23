/**
 * HyperFormula Integration - Replaces custom 1180-line functions.ts
 * Provides 400+ Excel functions instead of 82 custom implementations
 */

import { HyperFormula } from 'hyperformula';

export interface CellValue {
  value: any;
  formula?: string;
  error?: string;
}

export interface WorkbookContext {
  getCellValue(reference: string): any;
  getNamedRangeValue(name: string): any;
  getRangeValues(range: string): any[][];
  getSheetCellValue(sheetName: string, reference: string): any;
  getSheetRangeValues(sheetName: string, range: string): any[][];
}

export class HyperFormulaEngine {
  private hf: HyperFormula;

  constructor() {
    // Initialize HyperFormula with community license (free for basic use)
    this.hf = HyperFormula.buildEmpty({
      licenseKey: 'gpl-v3' // Free GPL license
    });

    // Ensure we have at least one sheet for formula evaluation
    if (this.hf.getSheetNames().length === 0) {
      this.hf.addSheet('Sheet1');
    }
  }

  /**
   * Convert workbook context to HyperFormula spreadsheet
   */
  private setupSpreadsheet(context: WorkbookContext): void {
    // For now, we'll work with a simple approach and use sheet 0 (default)
    // In a full implementation, you'd manage multiple sheets and populate data
    // This is a simplified version to get the integration working
  }

  /**
   * Evaluate a formula string using HyperFormula
   */
  evaluateFormula(formula: string, context: WorkbookContext): any {
    try {
      this.setupSpreadsheet(context);

      // HyperFormula expects formulas to start with '='
      const normalizedFormula = formula.startsWith('=') ? formula : `=${formula}`;

      // Evaluate using HyperFormula
      const result = this.hf.calculateFormula(normalizedFormula, 0);

      // Handle HyperFormula result types
      if (result instanceof Error) {
        return `#ERROR: ${result.message}`;
      }

      // Return the raw value (HyperFormula handles type conversion)
      return result;

    } catch (error) {
      console.error('Formula evaluation error:', error);
      return '#ERROR!';
    }
  }

  /**
   * Legacy compatibility method - mimics old AST-based evaluation
   */
  evaluateAST(ast: any, context: WorkbookContext): any {
    // Convert AST back to formula string (simplified)
    // In production, you'd implement proper AST-to-formula conversion
    const formulaString = this.astToFormula(ast);
    return this.evaluateFormula(formulaString, context);
  }

  /**
   * Convert AST node to formula string (simplified implementation)
   */
  private astToFormula(ast: any): string {
    // This is a simplified converter - you'd need full AST traversal
    if (ast.type === 'function' && ast.name) {
      const args = ast.args?.map((arg: any) => this.astToFormula(arg)).join(',') || '';
      return `${ast.name}(${args})`;
    }

    if (ast.type === 'reference') {
      return ast.value;
    }

    if (ast.type === 'number' || ast.type === 'string') {
      return ast.value.toString();
    }

    return '#UNSUPPORTED!';
  }

  /**
   * Get available functions (HyperFormula has 400+)
   */
  getAvailableFunctions(): string[] {
    return this.hf.getRegisteredFunctionNames();
  }

  /**
   * Check if a function is supported
   */
  isFunctionSupported(functionName: string): boolean {
    const supportedFunctions = this.hf.getRegisteredFunctionNames();
    return supportedFunctions.includes(functionName.toUpperCase());
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // HyperFormula cleanup if needed
  }
}

// Singleton instance for easy access
export const hyperFormulaEngine = new HyperFormulaEngine();
