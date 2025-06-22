/**
 * Formula Evaluator - Evaluates parsed formula AST
 */

import { ASTNode } from './parser';
import { ExcelFunctions } from './functions';

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

export class FormulaEvaluator {
  private functions: ExcelFunctions;
  private cache: Map<string, any> = new Map();
  
  constructor() {
    this.functions = new ExcelFunctions();
  }

  evaluate(ast: ASTNode, context: WorkbookContext): any {
    try {
      return this.evaluateNode(ast, context);
    } catch (error) {
      if (error instanceof FormulaError) {
        return error.errorValue;
      }
      return '#ERROR!';
    }
  }

  private evaluateNode(node: ASTNode, context: WorkbookContext): any {
    switch (node.type) {
      case 'Number':
        return node.value;
        
      case 'String':
        return node.value;
        
      case 'Boolean':
        return node.value;
        
      case 'CellReference':
        return this.evaluateCellReference(node.value, context);
        
      case 'RangeReference':
        return this.evaluateRangeReference(node.value, context);
        
      case 'NamedRange':
        return context.getNamedRangeValue(node.value);
        
      case 'Function':
        return this.evaluateFunction(node, context);
        
      case 'BinaryOperation':
        return this.evaluateBinaryOperation(node, context);
        
      case 'UnaryOperation':
        return this.evaluateUnaryOperation(node, context);
        
      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  private evaluateCellReference(reference: string, context: WorkbookContext): any {
    // Check if this is a cross-sheet reference (contains !)
    const sheetSeparatorIndex = reference.indexOf('!');
    let value;
    
    if (sheetSeparatorIndex > 0) {
      // Cross-sheet reference: SheetName!CellRef
      const sheetName = reference.substring(0, sheetSeparatorIndex);
      const cellRef = reference.substring(sheetSeparatorIndex + 1);
      value = context.getSheetCellValue(sheetName, cellRef);
    } else {
      // Same sheet reference
      value = context.getCellValue(reference);
    }
    
    // Handle empty cells
    if (value === null || value === undefined) {
      return 0; // Excel treats empty cells as 0 in calculations
    }
    
    // Handle error values
    if (typeof value === 'string' && value.startsWith('#')) {
      throw new FormulaError(value);
    }
    
    return value;
  }

  private evaluateRangeReference(range: string, context: WorkbookContext): any {
    // Check if this is a cross-sheet reference (contains !)
    const sheetSeparatorIndex = range.indexOf('!');
    
    if (sheetSeparatorIndex > 0) {
      // Cross-sheet reference: SheetName!RangeRef
      const sheetName = range.substring(0, sheetSeparatorIndex);
      const rangeRef = range.substring(sheetSeparatorIndex + 1);
      return context.getSheetRangeValues(sheetName, rangeRef);
    } else {
      // Same sheet reference
      return context.getRangeValues(range);
    }
  }

  private evaluateFunction(node: ASTNode, context: WorkbookContext): any {
    const funcName = node.value.toUpperCase(); // Excel functions are case-insensitive
    const args = node.children?.map(child => this.evaluateNode(child, context)) || [];
    
    // Check if function exists
    const func = (this.functions as any)[funcName];
    if (!func || typeof func !== 'function') {
      throw new FormulaError('#NAME?');
    }
    
    // Flatten arrays for functions that expect flattened arguments
    const flattenedArgs = this.shouldFlattenArgs(funcName) ? 
      args.map(arg => Array.isArray(arg) ? this.flattenArray(arg) : arg) : args;
    
    // Call the function
    return func.apply(this.functions, flattenedArgs);
  }

  private evaluateBinaryOperation(node: ASTNode, context: WorkbookContext): any {
    const left = this.evaluateNode(node.children![0], context);
    const right = this.evaluateNode(node.children![1], context);
    
    switch (node.value) {
      case '+':
        return this.add(left, right);
      case '-':
        return this.subtract(left, right);
      case '*':
        return this.multiply(left, right);
      case '/':
        return this.divide(left, right);
      case '^':
        return Math.pow(this.toNumber(left), this.toNumber(right));
      case '&':
        return this.concatenate(left, right);
      case '=':
      case '==':
        return this.equals(left, right);
      case '<>':
        return !this.equals(left, right);
      case '<':
        return this.lessThan(left, right);
      case '>':
        return this.greaterThan(left, right);
      case '<=':
        return this.lessThanOrEqual(left, right);
      case '>=':
        return this.greaterThanOrEqual(left, right);
      default:
        throw new Error(`Unknown operator: ${node.value}`);
    }
  }

  private evaluateUnaryOperation(node: ASTNode, context: WorkbookContext): any {
    const operand = this.evaluateNode(node.children![0], context);
    
    switch (node.value) {
      case '-':
        return -this.toNumber(operand);
      default:
        throw new Error(`Unknown unary operator: ${node.value}`);
    }
  }

  // Helper methods for operations
  private add(left: any, right: any): number {
    return this.toNumber(left) + this.toNumber(right);
  }

  private subtract(left: any, right: any): number {
    return this.toNumber(left) - this.toNumber(right);
  }

  private multiply(left: any, right: any): number {
    return this.toNumber(left) * this.toNumber(right);
  }

  private divide(left: any, right: any): number | string {
    const divisor = this.toNumber(right);
    if (divisor === 0) {
      return '#DIV/0!';
    }
    return this.toNumber(left) / divisor;
  }

  private concatenate(left: any, right: any): string {
    return this.toString(left) + this.toString(right);
  }

  private equals(left: any, right: any): boolean {
    // Excel's equality is case-insensitive for strings
    if (typeof left === 'string' && typeof right === 'string') {
      return left.toUpperCase() === right.toUpperCase();
    }
    return left === right;
  }

  private lessThan(left: any, right: any): boolean {
    if (typeof left === 'string' && typeof right === 'string') {
      return left.toUpperCase() < right.toUpperCase();
    }
    return this.toNumber(left) < this.toNumber(right);
  }

  private greaterThan(left: any, right: any): boolean {
    if (typeof left === 'string' && typeof right === 'string') {
      return left.toUpperCase() > right.toUpperCase();
    }
    return this.toNumber(left) > this.toNumber(right);
  }

  private lessThanOrEqual(left: any, right: any): boolean {
    return this.lessThan(left, right) || this.equals(left, right);
  }

  private greaterThanOrEqual(left: any, right: any): boolean {
    return this.greaterThan(left, right) || this.equals(left, right);
  }

  // Type conversion helpers
  private toNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (typeof value === 'string') {
      if (value === '') return 0;
      const num = parseFloat(value);
      if (isNaN(num)) {
        throw new FormulaError('#VALUE!');
      }
      return num;
    }
    if (value === null || value === undefined) return 0;
    throw new FormulaError('#VALUE!');
  }

  private toString(value: any): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (value === null || value === undefined) return '';
    return value.toString();
  }

  private shouldFlattenArgs(funcName: string): boolean {
    // Functions that should receive flattened arrays as individual arguments
    const flattenFunctions = [
      'SUM', 'AVERAGE', 'COUNT', 'COUNTA', 'MAX', 'MIN',
      'SUMIF', 'COUNTIF', 'SUMIFS', 'COUNTIFS'
    ];
    return flattenFunctions.includes(funcName);
  }

  private flattenArray(arr: any[]): any[] {
    const result: any[] = [];
    for (const item of arr) {
      if (Array.isArray(item)) {
        result.push(...this.flattenArray(item));
      } else {
        result.push(item);
      }
    }
    return result;
  }
}

export class FormulaError extends Error {
  constructor(public errorValue: string) {
    super(errorValue);
  }
}

// Dependency graph for managing calculation order
export class DependencyGraph {
  private dependencies = new Map<string, Set<string>>();
  private dependents = new Map<string, Set<string>>();
  
  addDependency(cell: string, dependsOn: string[]): void {
    // Clear existing dependencies
    const existingDeps = this.dependencies.get(cell);
    if (existingDeps) {
      existingDeps.forEach(dep => {
        const dependents = this.dependents.get(dep);
        if (dependents) {
          dependents.delete(cell);
        }
      });
    }
    
    // Add new dependencies
    this.dependencies.set(cell, new Set(dependsOn));
    
    // Update dependents
    dependsOn.forEach(dep => {
      if (!this.dependents.has(dep)) {
        this.dependents.set(dep, new Set());
      }
      this.dependents.get(dep)!.add(cell);
    });
  }
  
  getCalculationOrder(cells: string[]): string[] {
    const visited = new Set<string>();
    const order: string[] = [];
    const visiting = new Set<string>();
    
    const visit = (cell: string) => {
      if (visited.has(cell)) return;
      if (visiting.has(cell)) {
        throw new FormulaError('#REF!'); // Circular reference
      }
      
      visiting.add(cell);
      
      const deps = this.dependencies.get(cell);
      if (deps) {
        deps.forEach(dep => visit(dep));
      }
      
      visiting.delete(cell);
      visited.add(cell);
      order.push(cell);
    };
    
    cells.forEach(cell => visit(cell));
    return order;
  }
  
  getDependents(cell: string): string[] {
    return Array.from(this.dependents.get(cell) || []);
  }
}