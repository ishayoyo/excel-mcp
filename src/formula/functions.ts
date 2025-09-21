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

  // Conditional Functions
  SUMIF(range: any[], criteria: any, sumRange?: any[]): number {
    if (!Array.isArray(range)) {
      throw new Error('#VALUE!');
    }
    
    const actualSumRange = sumRange || range;
    let total = 0;
    
    for (let i = 0; i < range.length; i++) {
      if (this.evaluateCriteria(range[i], criteria)) {
        const value = actualSumRange[i];
        if (typeof value === 'number') {
          total += value;
        }
      }
    }
    
    return total;
  }

  COUNTIF(range: any[], criteria: any): number {
    if (!Array.isArray(range)) {
      throw new Error('#VALUE!');
    }
    
    let count = 0;
    for (const value of range) {
      if (this.evaluateCriteria(value, criteria)) {
        count++;
      }
    }
    
    return count;
  }

  SUMIFS(sumRange: any[], ...criteriaArgs: any[]): number {
    if (!Array.isArray(sumRange) || criteriaArgs.length % 2 !== 0) {
      throw new Error('#VALUE!');
    }
    
    let total = 0;
    const criteriaCount = criteriaArgs.length / 2;
    
    for (let i = 0; i < sumRange.length; i++) {
      let matches = true;
      
      for (let j = 0; j < criteriaCount; j++) {
        const criteriaRange = criteriaArgs[j * 2];
        const criteria = criteriaArgs[j * 2 + 1];
        
        if (!Array.isArray(criteriaRange) || i >= criteriaRange.length) {
          matches = false;
          break;
        }
        
        if (!this.evaluateCriteria(criteriaRange[i], criteria)) {
          matches = false;
          break;
        }
      }
      
      if (matches && typeof sumRange[i] === 'number') {
        total += sumRange[i];
      }
    }
    
    return total;
  }

  COUNTIFS(...criteriaArgs: any[]): number {
    if (criteriaArgs.length % 2 !== 0) {
      throw new Error('#VALUE!');
    }
    
    const firstRange = criteriaArgs[0];
    if (!Array.isArray(firstRange)) {
      throw new Error('#VALUE!');
    }
    
    let count = 0;
    const criteriaCount = criteriaArgs.length / 2;
    
    for (let i = 0; i < firstRange.length; i++) {
      let matches = true;
      
      for (let j = 0; j < criteriaCount; j++) {
        const criteriaRange = criteriaArgs[j * 2];
        const criteria = criteriaArgs[j * 2 + 1];
        
        if (!Array.isArray(criteriaRange) || i >= criteriaRange.length) {
          matches = false;
          break;
        }
        
        if (!this.evaluateCriteria(criteriaRange[i], criteria)) {
          matches = false;
          break;
        }
      }
      
      if (matches) {
        count++;
      }
    }
    
    return count;
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

  // ============================================================================
  // PHASE 1: CRITICAL DATA FUNCTIONS
  // ============================================================================

  /**
   * XLOOKUP - Modern replacement for VLOOKUP with better functionality
   * @param lookupValue Value to search for
   * @param lookupArray Array to search in
   * @param returnArray Array to return values from
   * @param ifNotFound Optional value to return if not found
   * @param matchMode Optional match mode (0=exact, -1=exact or next smallest, 1=exact or next largest)
   * @param searchMode Optional search mode (1=first to last, -1=last to first)
   */
  XLOOKUP(lookupValue: any, lookupArray: any[], returnArray: any[], ifNotFound?: any, matchMode: number = 0, searchMode: number = 1): any {
    if (!Array.isArray(lookupArray) || !Array.isArray(returnArray)) {
      throw new Error('#VALUE!');
    }

    if (lookupArray.length !== returnArray.length) {
      throw new Error('#VALUE!');
    }

    const searchIndices = searchMode === 1 ?
      Array.from({length: lookupArray.length}, (_, i) => i) :
      Array.from({length: lookupArray.length}, (_, i) => lookupArray.length - 1 - i);

    for (const i of searchIndices) {
      const currentValue = lookupArray[i];

      if (matchMode === 0) {
        // Exact match
        if (this.equals(currentValue, lookupValue)) {
          return returnArray[i];
        }
      } else if (matchMode === -1) {
        // Exact match or next smallest
        if (this.equals(currentValue, lookupValue)) {
          return returnArray[i];
        } else if (this.compare(currentValue, lookupValue) < 0) {
          return returnArray[i];
        }
      } else if (matchMode === 1) {
        // Exact match or next largest
        if (this.equals(currentValue, lookupValue)) {
          return returnArray[i];
        } else if (this.compare(currentValue, lookupValue) > 0) {
          return returnArray[i];
        }
      }
    }

    if (ifNotFound !== undefined) {
      return ifNotFound;
    }
    throw new Error('#N/A');
  }

  /**
   * FILTER - Filter an array based on criteria
   * @param array Array to filter
   * @param include Boolean array indicating which rows to include
   * @param ifEmpty Optional value to return if no matches
   */
  FILTER(array: any[][], include: boolean[], ifEmpty?: any): any[][] {
    if (!Array.isArray(array) || !Array.isArray(include)) {
      throw new Error('#VALUE!');
    }

    if (array.length !== include.length) {
      throw new Error('#VALUE!');
    }

    const filtered = array.filter((_, index) => include[index]);

    if (filtered.length === 0) {
      if (ifEmpty !== undefined) {
        return [[ifEmpty]];
      }
      throw new Error('#CALC!');
    }

    return filtered;
  }

  /**
   * SORT - Sort an array
   * @param array Array to sort
   * @param sortIndex Optional column index to sort by (1-based)
   * @param sortOrder Optional sort order (1=ascending, -1=descending)
   * @param byCol Optional sort by column instead of row
   */
  SORT(array: any[][], sortIndex: number = 1, sortOrder: number = 1, byCol: boolean = false): any[][] {
    if (!Array.isArray(array) || array.length === 0) {
      throw new Error('#VALUE!');
    }

    const sortedArray = [...array];
    const colIndex = sortIndex - 1;

    if (byCol) {
      // Sort by column - transpose, sort, transpose back
      throw new Error('#N/A'); // Not implemented for simplicity
    } else {
      // Sort by row
      sortedArray.sort((a, b) => {
        const aVal = Array.isArray(a) ? a[colIndex] : a;
        const bVal = Array.isArray(b) ? b[colIndex] : b;
        const comparison = this.compare(aVal, bVal);
        return sortOrder === 1 ? comparison : -comparison;
      });
    }

    return sortedArray;
  }

  /**
   * UNIQUE - Return unique values from an array
   * @param array Array to get unique values from
   * @param byCol Optional return unique columns instead of rows
   * @param exactlyOnce Optional return only values that occur exactly once
   */
  UNIQUE(array: any[][], byCol: boolean = false, exactlyOnce: boolean = false): any[][] {
    if (!Array.isArray(array) || array.length === 0) {
      throw new Error('#VALUE!');
    }

    if (byCol) {
      throw new Error('#N/A'); // Not implemented for simplicity
    }

    const seen = new Map<string, number>();
    const unique: any[][] = [];

    for (const row of array) {
      const key = JSON.stringify(row);
      const count = seen.get(key) || 0;
      seen.set(key, count + 1);

      if (count === 0) {
        unique.push(row);
      }
    }

    if (exactlyOnce) {
      return unique.filter(row => seen.get(JSON.stringify(row)) === 1);
    }

    return unique;
  }

  /**
   * SEQUENCE - Generate a sequence of numbers
   * @param rows Number of rows
   * @param columns Number of columns (optional)
   * @param start Starting number (optional)
   * @param step Step between numbers (optional)
   */
  SEQUENCE(rows: number, columns: number = 1, start: number = 1, step: number = 1): any[][] {
    if (rows <= 0 || columns <= 0) {
      throw new Error('#VALUE!');
    }

    const result: any[][] = [];
    let current = start;

    for (let r = 0; r < rows; r++) {
      const row: any[] = [];
      for (let c = 0; c < columns; c++) {
        row.push(current);
        current += step;
      }
      result.push(row);
    }

    return result;
  }

  // ============================================================================
  // PHASE 1: STATISTICAL FUNCTIONS
  // ============================================================================

  /**
   * PERCENTILE - Return the k-th percentile of values
   * @param array Array of values
   * @param k Percentile value (0 to 1)
   */
  PERCENTILE(array: any[], k: number): number {
    const numbers = this.flattenToNumbers([array]);
    if (numbers.length === 0) throw new Error('#NUM!');
    if (k < 0 || k > 1) throw new Error('#NUM!');

    const sorted = numbers.sort((a, b) => a - b);
    const index = (sorted.length - 1) * k;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return sorted[lower];
    }

    const fraction = index - lower;
    return sorted[lower] * (1 - fraction) + sorted[upper] * fraction;
  }

  /**
   * QUARTILE - Return the quartile of a dataset
   * @param array Array of values
   * @param quart Quartile to return (0-4)
   */
  QUARTILE(array: any[], quart: number): number {
    if (quart < 0 || quart > 4) throw new Error('#NUM!');

    const percentiles = [0, 0.25, 0.5, 0.75, 1];
    return this.PERCENTILE(array, percentiles[quart]);
  }

  /**
   * RANK - Return the rank of a number in a list
   * @param number Number to rank
   * @param ref Array of numbers
   * @param order Sort order (0=descending, 1=ascending)
   */
  RANK(number: number, ref: any[], order: number = 0): number {
    const numbers = this.flattenToNumbers([ref]);
    if (numbers.length === 0) throw new Error('#N/A');

    const sorted = order === 0 ?
      numbers.sort((a, b) => b - a) :
      numbers.sort((a, b) => a - b);

    const rank = sorted.indexOf(number);
    if (rank === -1) throw new Error('#N/A');

    return rank + 1;
  }

  /**
   * STDEV.S - Calculate sample standard deviation
   */
  'STDEV.S'(...args: any[]): number {
    return this.STDEV(...args);
  }

  /**
   * STDEV.P - Calculate population standard deviation
   */
  'STDEV.P'(...args: any[]): number {
    const numbers = this.flattenToNumbers(args);
    if (numbers.length === 0) return 0;

    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
    return Math.sqrt(variance);
  }

  /**
   * STDEV - Calculate sample standard deviation (legacy function)
   */
  STDEV(...args: any[]): number {
    const numbers = this.flattenToNumbers(args);
    if (numbers.length <= 1) return 0;

    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / (numbers.length - 1);
    return Math.sqrt(variance);
  }

  // ============================================================================
  // PHASE 2: TEXT FUNCTIONS
  // ============================================================================

  /**
   * TEXTJOIN - Join text with a delimiter
   * @param delimiter Delimiter to use
   * @param ignoreEmpty Whether to ignore empty cells
   * @param texts Text values to join
   */
  TEXTJOIN(delimiter: string, ignoreEmpty: boolean, ...texts: any[]): string {
    const flatTexts = this.flatten(texts);
    const filteredTexts = ignoreEmpty ?
      flatTexts.filter(t => t !== null && t !== undefined && t !== '') :
      flatTexts;

    return filteredTexts.map(t => this.toString(t)).join(this.toString(delimiter));
  }

  /**
   * TEXTSPLIT - Split text into an array
   * @param text Text to split
   * @param colDelimiter Column delimiter
   * @param rowDelimiter Optional row delimiter
   * @param ignoreEmpty Whether to ignore empty values
   */
  TEXTSPLIT(text: string, colDelimiter: string, rowDelimiter?: string, ignoreEmpty: boolean = false): any[][] {
    const textStr = this.toString(text);
    const colDel = this.toString(colDelimiter);

    if (rowDelimiter) {
      const rowDel = this.toString(rowDelimiter);
      const rows = textStr.split(rowDel);
      return rows.map(row => {
        const cols = row.split(colDel);
        return ignoreEmpty ? cols.filter(c => c !== '') : cols;
      });
    } else {
      const cols = textStr.split(colDel);
      const filtered = ignoreEmpty ? cols.filter(c => c !== '') : cols;
      return [filtered];
    }
  }

  /**
   * REGEX - Extract text using regular expressions
   * @param text Text to search
   * @param pattern Regular expression pattern
   * @param flags Optional regex flags
   */
  REGEX(text: string, pattern: string, flags: string = ''): string {
    try {
      const textStr = this.toString(text);
      const regex = new RegExp(pattern, flags);
      const match = textStr.match(regex);
      return match ? match[0] : '';
    } catch (error) {
      throw new Error('#VALUE!');
    }
  }

  // ============================================================================
  // PHASE 2: FINANCIAL FUNCTIONS
  // ============================================================================

  /**
   * NPV - Net Present Value
   * @param rate Discount rate
   * @param values Cash flow values
   */
  NPV(rate: number, ...values: any[]): number {
    const cashFlows = this.flattenToNumbers(values);
    let npv = 0;

    for (let i = 0; i < cashFlows.length; i++) {
      npv += cashFlows[i] / Math.pow(1 + rate, i + 1);
    }

    return npv;
  }

  /**
   * IRR - Internal Rate of Return
   * @param values Cash flow values
   * @param guess Initial guess (optional)
   */
  IRR(values: any[], guess: number = 0.1): number {
    const cashFlows = this.flattenToNumbers([values]);

    // Newton-Raphson method
    let rate = guess;
    const maxIterations = 100;
    const tolerance = 1e-6;

    for (let i = 0; i < maxIterations; i++) {
      let npv = 0;
      let dnpv = 0;

      for (let j = 0; j < cashFlows.length; j++) {
        const power = j + 1;
        const denominator = Math.pow(1 + rate, power);
        npv += cashFlows[j] / denominator;
        dnpv -= cashFlows[j] * power / (denominator * (1 + rate));
      }

      if (Math.abs(npv) < tolerance) {
        return rate;
      }

      if (Math.abs(dnpv) < tolerance) {
        throw new Error('#NUM!');
      }

      rate = rate - npv / dnpv;
    }

    throw new Error('#NUM!');
  }

  /**
   * PMT - Payment calculation
   * @param rate Interest rate per period
   * @param nper Number of periods
   * @param pv Present value
   * @param fv Future value (optional)
   * @param type Payment type (0=end, 1=beginning)
   */
  PMT(rate: number, nper: number, pv: number, fv: number = 0, type: number = 0): number {
    if (rate === 0) {
      return -(pv + fv) / nper;
    }

    const pvif = Math.pow(1 + rate, nper);
    const pmt = -(pv * pvif + fv) / (((pvif - 1) / rate) * (1 + rate * type));

    return pmt;
  }

  /**
   * PV - Present Value
   * @param rate Interest rate
   * @param nper Number of periods
   * @param pmt Payment per period
   * @param fv Future value (optional)
   * @param type Payment type (0=end, 1=beginning)
   */
  PV(rate: number, nper: number, pmt: number, fv: number = 0, type: number = 0): number {
    if (rate === 0) {
      return -pmt * nper - fv;
    }

    const pvif = Math.pow(1 + rate, nper);
    const pv = -(pmt * (pvif - 1) / rate * (1 + rate * type) + fv) / pvif;

    return pv;
  }

  /**
   * FV - Future Value
   * @param rate Interest rate
   * @param nper Number of periods
   * @param pmt Payment per period
   * @param pv Present value (optional)
   * @param type Payment type (0=end, 1=beginning)
   */
  FV(rate: number, nper: number, pmt: number, pv: number = 0, type: number = 0): number {
    if (rate === 0) {
      return -pv - pmt * nper;
    }

    const pvif = Math.pow(1 + rate, nper);
    const fv = -(pv * pvif + pmt * (pvif - 1) / rate * (1 + rate * type));

    return fv;
  }

  // ============================================================================
  // PHASE 2: DATE FUNCTIONS
  // ============================================================================

  /**
   * WORKDAY - Add business days to a date
   * @param startDate Starting date
   * @param days Number of workdays to add
   * @param holidays Optional array of holiday dates
   */
  WORKDAY(startDate: Date | number, days: number, holidays?: any[]): Date {
    const start = this.toDate(startDate);
    const holidayDates = holidays ? holidays.map(h => this.toDate(h).getTime()) : [];

    let current = new Date(start);
    let remainingDays = Math.abs(days);
    const direction = days >= 0 ? 1 : -1;

    while (remainingDays > 0) {
      current.setDate(current.getDate() + direction);

      // Skip weekends (Saturday = 6, Sunday = 0)
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Check if it's not a holiday
        if (!holidayDates.includes(current.getTime())) {
          remainingDays--;
        }
      }
    }

    return current;
  }

  /**
   * NETWORKDAYS - Count business days between two dates
   * @param startDate Start date
   * @param endDate End date
   * @param holidays Optional array of holiday dates
   */
  NETWORKDAYS(startDate: Date | number, endDate: Date | number, holidays?: any[]): number {
    const start = this.toDate(startDate);
    const end = this.toDate(endDate);
    const holidayDates = holidays ? holidays.map(h => this.toDate(h).getTime()) : [];

    let current = new Date(Math.min(start.getTime(), end.getTime()));
    const last = new Date(Math.max(start.getTime(), end.getTime()));
    let workdays = 0;

    while (current <= last) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        if (!holidayDates.includes(current.getTime())) {
          workdays++;
        }
      }
      current.setDate(current.getDate() + 1);
    }

    return workdays;
  }

  /**
   * DATEDIF - Calculate difference between two dates
   * @param startDate Start date
   * @param endDate End date
   * @param unit Unit of difference (Y, M, D, YM, YD, MD)
   */
  DATEDIF(startDate: Date | number, endDate: Date | number, unit: string): number {
    const start = this.toDate(startDate);
    const end = this.toDate(endDate);

    if (start > end) {
      throw new Error('#NUM!');
    }

    const unitUpper = unit.toUpperCase();

    switch (unitUpper) {
      case 'Y': // Years
        return end.getFullYear() - start.getFullYear();

      case 'M': // Months
        return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());

      case 'D': // Days
        return Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));

      case 'YM': // Months ignoring years
        return end.getMonth() - start.getMonth();

      case 'YD': // Days ignoring years
        const yearDiff = end.getFullYear() - start.getFullYear();
        const adjustedEnd = new Date(end);
        adjustedEnd.setFullYear(start.getFullYear());
        return Math.floor((adjustedEnd.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));

      case 'MD': // Days ignoring months and years
        return end.getDate() - start.getDate();

      default:
        throw new Error('#VALUE!');
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

  private evaluateCriteria(value: any, criteria: any): boolean {
    // Handle numeric criteria
    if (typeof criteria === 'number') {
      return this.toNumber(value) === criteria;
    }
    
    // Handle string criteria
    const criteriaStr = this.toString(criteria);
    const valueStr = this.toString(value);
    
    // Handle comparison operators
    if (criteriaStr.startsWith('>=')) {
      const threshold = this.toNumber(criteriaStr.substring(2));
      return this.toNumber(value) >= threshold;
    }
    if (criteriaStr.startsWith('<=')) {
      const threshold = this.toNumber(criteriaStr.substring(2));
      return this.toNumber(value) <= threshold;
    }
    if (criteriaStr.startsWith('<>')) {
      const compareValue = criteriaStr.substring(2);
      return !this.equals(value, compareValue);
    }
    if (criteriaStr.startsWith('>')) {
      const threshold = this.toNumber(criteriaStr.substring(1));
      return this.toNumber(value) > threshold;
    }
    if (criteriaStr.startsWith('<')) {
      const threshold = this.toNumber(criteriaStr.substring(1));
      return this.toNumber(value) < threshold;
    }
    if (criteriaStr.startsWith('=')) {
      const compareValue = criteriaStr.substring(1);
      return this.equals(value, compareValue);
    }
    
    // Handle wildcards (* and ?)
    if (criteriaStr.includes('*') || criteriaStr.includes('?')) {
      const regexPattern = criteriaStr
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\\\*/g, '.*')
        .replace(/\\\?/g, '.');
      const regex = new RegExp(`^${regexPattern}$`, 'i');
      return regex.test(valueStr);
    }
    
    // Default: exact match (case-insensitive for strings)
    return this.equals(value, criteria);
  }
}