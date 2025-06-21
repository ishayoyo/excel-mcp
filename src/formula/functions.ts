/**
 * Excel Functions Library
 * Implements common Excel functions
 */

export class ExcelFunctions {
  // Math & Trig Functions
  SUM(...args: any[]): number {
    return this.aggregateNumbers(args, (a, b) => a + b, 0);
  }

  AVERAGE(...args: any[]): number {
    const numbers = this.flattenToNumbers(args);
    if (numbers.length === 0) return 0;
    return this.SUM(...args) / numbers.length;
  }

  COUNT(...args: any[]): number {
    return this.flattenToNumbers(args).length;
  }

  COUNTA(...args: any[]): number {
    return this.flatten(args).filter(v => v !== null && v !== undefined && v !== '').length;
  }

  MAX(...args: any[]): number {
    const numbers = this.flattenToNumbers(args);
    if (numbers.length === 0) return 0;
    return Math.max(...numbers);
  }

  MIN(...args: any[]): number {
    const numbers = this.flattenToNumbers(args);
    if (numbers.length === 0) return 0;
    return Math.min(...numbers);
  }

  ROUND(number: number, digits: number): number {
    const factor = Math.pow(10, digits);
    return Math.round(number * factor) / factor;
  }

  ROUNDUP(number: number, digits: number): number {
    const factor = Math.pow(10, digits);
    return Math.ceil(number * factor) / factor;
  }

  ROUNDDOWN(number: number, digits: number): number {
    const factor = Math.pow(10, digits);
    return Math.floor(number * factor) / factor;
  }

  ABS(number: number): number {
    return Math.abs(number);
  }

  SQRT(number: number): number {
    if (number < 0) throw new Error('#NUM!');
    return Math.sqrt(number);
  }

  POWER(base: number, exponent: number): number {
    return Math.pow(base, exponent);
  }

  EXP(number: number): number {
    return Math.exp(number);
  }

  LN(number: number): number {
    if (number <= 0) throw new Error('#NUM!');
    return Math.log(number);
  }

  LOG(number: number, base: number = 10): number {
    if (number <= 0 || base <= 0 || base === 1) throw new Error('#NUM!');
    return Math.log(number) / Math.log(base);
  }

  PI(): number {
    return Math.PI;
  }

  RAND(): number {
    return Math.random();
  }

  RANDBETWEEN(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Trigonometric functions
  SIN(angle: number): number {
    return Math.sin(angle);
  }

  COS(angle: number): number {
    return Math.cos(angle);
  }

  TAN(angle: number): number {
    return Math.tan(angle);
  }

  ASIN(number: number): number {
    if (number < -1 || number > 1) throw new Error('#NUM!');
    return Math.asin(number);
  }

  ACOS(number: number): number {
    if (number < -1 || number > 1) throw new Error('#NUM!');
    return Math.acos(number);
  }

  ATAN(number: number): number {
    return Math.atan(number);
  }

  // Text Functions
  CONCATENATE(...args: any[]): string {
    return args.map(arg => this.toString(arg)).join('');
  }

  LEFT(text: string, numChars: number = 1): string {
    return this.toString(text).substring(0, Math.max(0, numChars));
  }

  RIGHT(text: string, numChars: number = 1): string {
    const str = this.toString(text);
    return str.substring(Math.max(0, str.length - numChars));
  }

  MID(text: string, startNum: number, numChars: number): string {
    const str = this.toString(text);
    return str.substring(startNum - 1, startNum - 1 + numChars);
  }

  LEN(text: string): number {
    return this.toString(text).length;
  }

  LOWER(text: string): string {
    return this.toString(text).toLowerCase();
  }

  UPPER(text: string): string {
    return this.toString(text).toUpperCase();
  }

  PROPER(text: string): string {
    return this.toString(text).replace(/\w\S*/g, txt => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  TRIM(text: string): string {
    return this.toString(text).trim().replace(/\s+/g, ' ');
  }

  FIND(findText: string, withinText: string, startNum: number = 1): number {
    const find = this.toString(findText);
    const within = this.toString(withinText);
    const index = within.indexOf(find, startNum - 1);
    if (index === -1) throw new Error('#VALUE!');
    return index + 1;
  }

  SEARCH(findText: string, withinText: string, startNum: number = 1): number {
    const find = this.toString(findText).toLowerCase();
    const within = this.toString(withinText).toLowerCase();
    const index = within.indexOf(find, startNum - 1);
    if (index === -1) throw new Error('#VALUE!');
    return index + 1;
  }

  REPLACE(oldText: string, startNum: number, numChars: number, newText: string): string {
    const str = this.toString(oldText);
    const start = startNum - 1;
    return str.substring(0, start) + this.toString(newText) + str.substring(start + numChars);
  }

  SUBSTITUTE(text: string, oldText: string, newText: string, instanceNum?: number): string {
    let str = this.toString(text);
    const old = this.toString(oldText);
    const replacement = this.toString(newText);
    
    if (instanceNum) {
      let count = 0;
      return str.replace(new RegExp(this.escapeRegex(old), 'g'), match => {
        count++;
        return count === instanceNum ? replacement : match;
      });
    }
    
    return str.replace(new RegExp(this.escapeRegex(old), 'g'), replacement);
  }

  // Logical Functions
  IF(condition: any, trueValue: any, falseValue: any): any {
    return this.toBoolean(condition) ? trueValue : falseValue;
  }

  AND(...args: any[]): boolean {
    return args.every(arg => this.toBoolean(arg));
  }

  OR(...args: any[]): boolean {
    return args.some(arg => this.toBoolean(arg));
  }

  NOT(value: any): boolean {
    return !this.toBoolean(value);
  }

  XOR(...args: any[]): boolean {
    return args.filter(arg => this.toBoolean(arg)).length % 2 === 1;
  }

  IFERROR(value: any, valueIfError: any): any {
    try {
      if (typeof value === 'string' && value.startsWith('#')) {
        return valueIfError;
      }
      return value;
    } catch {
      return valueIfError;
    }
  }

  IFNA(value: any, valueIfNA: any): any {
    return value === '#N/A' ? valueIfNA : value;
  }

  // Lookup Functions (basic implementations)
  VLOOKUP(lookupValue: any, tableArray: any[][], colIndexNum: number, rangeLookup: boolean = true): any {
    if (!Array.isArray(tableArray) || tableArray.length === 0) {
      throw new Error('#VALUE!');
    }
    
    const colIndex = colIndexNum - 1;
    if (colIndex < 0 || colIndex >= tableArray[0].length) {
      throw new Error('#REF!');
    }
    
    if (!rangeLookup) {
      // Exact match
      for (const row of tableArray) {
        if (this.equals(row[0], lookupValue)) {
          return row[colIndex];
        }
      }
      throw new Error('#N/A');
    } else {
      // Approximate match (assumes sorted data)
      let lastValidRow = null;
      for (const row of tableArray) {
        if (this.compare(row[0], lookupValue) > 0) {
          break;
        }
        lastValidRow = row;
      }
      if (!lastValidRow) throw new Error('#N/A');
      return lastValidRow[colIndex];
    }
  }

  HLOOKUP(lookupValue: any, tableArray: any[][], rowIndexNum: number, rangeLookup: boolean = true): any {
    // Transpose the array and use VLOOKUP
    const transposed = tableArray[0].map((_, colIndex) => 
      tableArray.map(row => row[colIndex])
    );
    return this.VLOOKUP(lookupValue, transposed, rowIndexNum, rangeLookup);
  }

  INDEX(array: any[][], rowNum: number, colNum?: number): any {
    if (!Array.isArray(array) || array.length === 0) {
      throw new Error('#VALUE!');
    }
    
    const row = rowNum - 1;
    if (row < 0 || row >= array.length) {
      throw new Error('#REF!');
    }
    
    if (colNum === undefined) {
      return array[row];
    }
    
    const col = colNum - 1;
    if (col < 0 || col >= array[row].length) {
      throw new Error('#REF!');
    }
    
    return array[row][col];
  }

  MATCH(lookupValue: any, lookupArray: any[], matchType: number = 1): number {
    if (!Array.isArray(lookupArray)) {
      throw new Error('#VALUE!');
    }
    
    if (matchType === 0) {
      // Exact match
      for (let i = 0; i < lookupArray.length; i++) {
        if (this.equals(lookupArray[i], lookupValue)) {
          return i + 1;
        }
      }
      throw new Error('#N/A');
    } else if (matchType === 1) {
      // Largest value less than or equal to lookupValue
      let lastIndex = -1;
      for (let i = 0; i < lookupArray.length; i++) {
        if (this.compare(lookupArray[i], lookupValue) > 0) {
          break;
        }
        lastIndex = i;
      }
      if (lastIndex === -1) throw new Error('#N/A');
      return lastIndex + 1;
    } else {
      // Smallest value greater than or equal to lookupValue
      for (let i = 0; i < lookupArray.length; i++) {
        if (this.compare(lookupArray[i], lookupValue) >= 0) {
          return i + 1;
        }
      }
      throw new Error('#N/A');
    }
  }

  // Date & Time Functions (basic)
  TODAY(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  NOW(): Date {
    return new Date();
  }

  YEAR(date: Date | number): number {
    const d = this.toDate(date);
    return d.getFullYear();
  }

  MONTH(date: Date | number): number {
    const d = this.toDate(date);
    return d.getMonth() + 1;
  }

  DAY(date: Date | number): number {
    const d = this.toDate(date);
    return d.getDate();
  }

  HOUR(date: Date | number): number {
    const d = this.toDate(date);
    return d.getHours();
  }

  MINUTE(date: Date | number): number {
    const d = this.toDate(date);
    return d.getMinutes();
  }

  SECOND(date: Date | number): number {
    const d = this.toDate(date);
    return d.getSeconds();
  }

  // Helper methods
  private flatten(args: any[]): any[] {
    const result: any[] = [];
    for (const arg of args) {
      if (Array.isArray(arg)) {
        if (Array.isArray(arg[0])) {
          // 2D array
          for (const row of arg) {
            result.push(...row);
          }
        } else {
          // 1D array
          result.push(...arg);
        }
      } else {
        result.push(arg);
      }
    }
    return result;
  }

  private flattenToNumbers(args: any[]): number[] {
    return this.flatten(args)
      .filter(v => v !== null && v !== undefined && v !== '' && !isNaN(Number(v)))
      .map(v => Number(v));
  }

  private aggregateNumbers(args: any[], operation: (a: number, b: number) => number, initial: number): number {
    const numbers = this.flattenToNumbers(args);
    return numbers.reduce(operation, initial);
  }

  private toNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      if (isNaN(num)) throw new Error('#VALUE!');
      return num;
    }
    if (value instanceof Date) return this.dateToNumber(value);
    throw new Error('#VALUE!');
  }

  private toString(value: any): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (value instanceof Date) return value.toISOString();
    if (value === null || value === undefined) return '';
    return value.toString();
  }

  private toBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      if (value.toUpperCase() === 'TRUE') return true;
      if (value.toUpperCase() === 'FALSE') return false;
      return value !== '';
    }
    return Boolean(value);
  }

  private toDate(value: Date | number): Date {
    if (value instanceof Date) return value;
    if (typeof value === 'number') {
      // Excel date number (days since 1900-01-01)
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(excelEpoch.getTime() + (value - 2) * 24 * 60 * 60 * 1000);
      return date;
    }
    throw new Error('#VALUE!');
  }

  private dateToNumber(date: Date): number {
    const excelEpoch = new Date(1900, 0, 1);
    const days = (date.getTime() - excelEpoch.getTime()) / (24 * 60 * 60 * 1000) + 2;
    return days;
  }

  private equals(a: any, b: any): boolean {
    if (typeof a === 'string' && typeof b === 'string') {
      return a.toUpperCase() === b.toUpperCase();
    }
    return a === b;
  }

  private compare(a: any, b: any): number {
    if (typeof a === 'string' && typeof b === 'string') {
      return a.toUpperCase().localeCompare(b.toUpperCase());
    }
    const numA = this.toNumber(a);
    const numB = this.toNumber(b);
    return numA - numB;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}