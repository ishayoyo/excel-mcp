/**
 * Formula Parser for Excel-like formulas
 * Tokenizes and parses formulas into an Abstract Syntax Tree (AST)
 */

export enum TokenType {
  // Literals
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  BOOLEAN = 'BOOLEAN',
  
  // References
  CELL_REFERENCE = 'CELL_REFERENCE',
  RANGE_REFERENCE = 'RANGE_REFERENCE',
  NAMED_RANGE = 'NAMED_RANGE',
  
  // Operators
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  MULTIPLY = 'MULTIPLY',
  DIVIDE = 'DIVIDE',
  POWER = 'POWER',
  CONCAT = 'CONCAT',
  
  // Comparison
  EQUAL = 'EQUAL',
  NOT_EQUAL = 'NOT_EQUAL',
  LESS_THAN = 'LESS_THAN',
  GREATER_THAN = 'GREATER_THAN',
  LESS_EQUAL = 'LESS_EQUAL',
  GREATER_EQUAL = 'GREATER_EQUAL',
  
  // Structure
  LEFT_PAREN = 'LEFT_PAREN',
  RIGHT_PAREN = 'RIGHT_PAREN',
  COMMA = 'COMMA',
  COLON = 'COLON',
  
  // Functions
  FUNCTION = 'FUNCTION',
  
  // Special
  EXCLAMATION = 'EXCLAMATION', // For sheet references
  EOF = 'EOF',
  ERROR = 'ERROR'
}

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

export interface ASTNode {
  type: string;
  value?: any;
  children?: ASTNode[];
  position?: number;
}

export class FormulaTokenizer {
  private input: string;
  private position: number = 0;
  private tokens: Token[] = [];

  constructor(formula: string) {
    // Remove leading = if present
    this.input = formula.startsWith('=') ? formula.substring(1) : formula;
  }

  tokenize(): Token[] {
    while (this.position < this.input.length) {
      this.skipWhitespace();
      
      if (this.position >= this.input.length) break;
      
      const char = this.input[this.position];
      
      // Numbers
      if (this.isDigit(char) || (char === '.' && this.isDigit(this.peek()))) {
        this.tokens.push(this.readNumber());
      }
      // Strings
      else if (char === '"') {
        this.tokens.push(this.readString());
      }
      // Cell references or functions
      else if (this.isLetter(char)) {
        const token = this.readIdentifier();
        this.tokens.push(token);
      }
      // Operators and structure
      else {
        this.tokens.push(this.readOperator());
      }
    }
    
    this.tokens.push({ type: TokenType.EOF, value: '', position: this.position });
    return this.tokens;
  }

  private skipWhitespace(): void {
    while (this.position < this.input.length && /\s/.test(this.input[this.position])) {
      this.position++;
    }
  }

  private peek(offset: number = 1): string {
    return this.input[this.position + offset] || '';
  }

  private isDigit(char: string): boolean {
    return /[0-9]/.test(char);
  }

  private isLetter(char: string): boolean {
    return /[a-zA-Z]/.test(char);
  }

  private readNumber(): Token {
    const start = this.position;
    let value = '';
    
    while (this.isDigit(this.input[this.position]) || this.input[this.position] === '.') {
      value += this.input[this.position];
      this.position++;
    }
    
    // Check for percentage
    if (this.input[this.position] === '%') {
      value += '%';
      this.position++;
    }
    
    return { type: TokenType.NUMBER, value, position: start };
  }

  private readString(): Token {
    const start = this.position;
    this.position++; // Skip opening quote
    let value = '';
    
    while (this.position < this.input.length && this.input[this.position] !== '"') {
      if (this.input[this.position] === '\\' && this.input[this.position + 1] === '"') {
        value += '"';
        this.position += 2;
      } else {
        value += this.input[this.position];
        this.position++;
      }
    }
    
    this.position++; // Skip closing quote
    return { type: TokenType.STRING, value, position: start };
  }

  private readIdentifier(): Token {
    const start = this.position;
    let value = '';
    
    // Read letters and numbers (including spaces for sheet names)
    while (this.position < this.input.length && 
           (this.isLetter(this.input[this.position]) || 
            this.isDigit(this.input[this.position]) ||
            this.input[this.position] === '_' ||
            this.input[this.position] === '$' ||
            this.input[this.position] === ' ' ||
            this.input[this.position] === '\'')) { // Handle quoted sheet names
      value += this.input[this.position];
      this.position++;
    }
    
    // Handle sheet references (SheetName!CellRef)
    if (this.input[this.position] === '!') {
      value += this.input[this.position]; // Add the !
      this.position++;
      
      // Read the cell/range reference after !
      while (this.position < this.input.length && 
             (this.isLetter(this.input[this.position]) || 
              this.isDigit(this.input[this.position]) ||
              this.input[this.position] === '_' ||
              this.input[this.position] === '$' ||
              this.input[this.position] === ':')) {
        value += this.input[this.position];
        this.position++;
      }
      
      // Determine if it's a range or cell reference
      if (value.includes(':')) {
        return { type: TokenType.RANGE_REFERENCE, value, position: start };
      } else {
        return { type: TokenType.CELL_REFERENCE, value, position: start };
      }
    }
    
    // Check if it's a function (followed by parenthesis)
    if (this.input[this.position] === '(') {
      return { type: TokenType.FUNCTION, value: value.toUpperCase(), position: start };
    }
    
    // Check if it's a cell reference (e.g., A1, $A$1)
    if (this.isCellReference(value)) {
      // Check for range reference (e.g., A1:B10)
      if (this.input[this.position] === ':') {
        this.position++; // Skip colon
        const endRef = this.readIdentifier();
        return { 
          type: TokenType.RANGE_REFERENCE, 
          value: value + ':' + endRef.value, 
          position: start 
        };
      }
      return { type: TokenType.CELL_REFERENCE, value, position: start };
    }
    
    // Check for boolean values
    if (value.toUpperCase() === 'TRUE' || value.toUpperCase() === 'FALSE') {
      return { type: TokenType.BOOLEAN, value: value.toUpperCase(), position: start };
    }
    
    // Otherwise it's a named range
    return { type: TokenType.NAMED_RANGE, value, position: start };
  }

  private isCellReference(value: string): boolean {
    // Handle sheet references (SheetName!CellRef)
    if (value.includes('!')) {
      const parts = value.split('!');
      if (parts.length === 2) {
        const cellPart = parts[1];
        return /^[$]?[A-Z]+[$]?[0-9]+$/.test(cellPart.toUpperCase());
      }
      return false;
    }
    
    // Simple regex for cell references (handles A1, $A$1, etc.)
    return /^[$]?[A-Z]+[$]?[0-9]+$/.test(value.toUpperCase());
  }

  private readOperator(): Token {
    const start = this.position;
    const char = this.input[this.position];
    this.position++;
    
    switch (char) {
      case '+': return { type: TokenType.PLUS, value: char, position: start };
      case '-': return { type: TokenType.MINUS, value: char, position: start };
      case '*': return { type: TokenType.MULTIPLY, value: char, position: start };
      case '/': return { type: TokenType.DIVIDE, value: char, position: start };
      case '^': return { type: TokenType.POWER, value: char, position: start };
      case '&': return { type: TokenType.CONCAT, value: char, position: start };
      case '(': return { type: TokenType.LEFT_PAREN, value: char, position: start };
      case ')': return { type: TokenType.RIGHT_PAREN, value: char, position: start };
      case ',': return { type: TokenType.COMMA, value: char, position: start };
      case ':': return { type: TokenType.COLON, value: char, position: start };
      case '!': return { type: TokenType.EXCLAMATION, value: char, position: start };
      case '=': 
        if (this.input[this.position] === '=') {
          this.position++;
          return { type: TokenType.EQUAL, value: '==', position: start };
        }
        return { type: TokenType.EQUAL, value: char, position: start };
      case '<':
        if (this.input[this.position] === '=') {
          this.position++;
          return { type: TokenType.LESS_EQUAL, value: '<=', position: start };
        } else if (this.input[this.position] === '>') {
          this.position++;
          return { type: TokenType.NOT_EQUAL, value: '<>', position: start };
        }
        return { type: TokenType.LESS_THAN, value: char, position: start };
      case '>':
        if (this.input[this.position] === '=') {
          this.position++;
          return { type: TokenType.GREATER_EQUAL, value: '>=', position: start };
        }
        return { type: TokenType.GREATER_THAN, value: char, position: start };
      default:
        return { type: TokenType.ERROR, value: char, position: start };
    }
  }
}

export class FormulaParser {
  private tokens: Token[] = [];
  private current: number = 0;

  parse(formula: string): ASTNode {
    const tokenizer = new FormulaTokenizer(formula);
    this.tokens = tokenizer.tokenize();
    this.current = 0;
    
    return this.parseExpression();
  }

  private parseExpression(): ASTNode {
    return this.parseComparison();
  }

  private parseComparison(): ASTNode {
    let left = this.parseConcatenation();
    
    while (this.match(TokenType.EQUAL, TokenType.NOT_EQUAL, TokenType.LESS_THAN, 
                      TokenType.GREATER_THAN, TokenType.LESS_EQUAL, TokenType.GREATER_EQUAL)) {
      const operator = this.previous();
      const right = this.parseConcatenation();
      left = {
        type: 'BinaryOperation',
        value: operator.value,
        children: [left, right],
        position: operator.position
      };
    }
    
    return left;
  }

  private parseConcatenation(): ASTNode {
    let left = this.parseAddition();
    
    while (this.match(TokenType.CONCAT)) {
      const operator = this.previous();
      const right = this.parseAddition();
      left = {
        type: 'BinaryOperation',
        value: operator.value,
        children: [left, right],
        position: operator.position
      };
    }
    
    return left;
  }

  private parseAddition(): ASTNode {
    let left = this.parseMultiplication();
    
    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.previous();
      const right = this.parseMultiplication();
      left = {
        type: 'BinaryOperation',
        value: operator.value,
        children: [left, right],
        position: operator.position
      };
    }
    
    return left;
  }

  private parseMultiplication(): ASTNode {
    let left = this.parsePower();
    
    while (this.match(TokenType.MULTIPLY, TokenType.DIVIDE)) {
      const operator = this.previous();
      const right = this.parsePower();
      left = {
        type: 'BinaryOperation',
        value: operator.value,
        children: [left, right],
        position: operator.position
      };
    }
    
    return left;
  }

  private parsePower(): ASTNode {
    let left = this.parseUnary();
    
    while (this.match(TokenType.POWER)) {
      const operator = this.previous();
      const right = this.parseUnary();
      left = {
        type: 'BinaryOperation',
        value: operator.value,
        children: [left, right],
        position: operator.position
      };
    }
    
    return left;
  }

  private parseUnary(): ASTNode {
    if (this.match(TokenType.MINUS)) {
      const operator = this.previous();
      const expr = this.parseUnary();
      return {
        type: 'UnaryOperation',
        value: operator.value,
        children: [expr],
        position: operator.position
      };
    }
    
    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode {
    // Numbers
    if (this.match(TokenType.NUMBER)) {
      const token = this.previous();
      let value = parseFloat(token.value.replace('%', ''));
      if (token.value.endsWith('%')) {
        value = value / 100;
      }
      return { type: 'Number', value, position: token.position };
    }
    
    // Strings
    if (this.match(TokenType.STRING)) {
      const token = this.previous();
      return { type: 'String', value: token.value, position: token.position };
    }
    
    // Booleans
    if (this.match(TokenType.BOOLEAN)) {
      const token = this.previous();
      return { type: 'Boolean', value: token.value === 'TRUE', position: token.position };
    }
    
    // Cell references
    if (this.match(TokenType.CELL_REFERENCE)) {
      const token = this.previous();
      return { type: 'CellReference', value: token.value, position: token.position };
    }
    
    // Range references
    if (this.match(TokenType.RANGE_REFERENCE)) {
      const token = this.previous();
      return { type: 'RangeReference', value: token.value, position: token.position };
    }
    
    // Named ranges
    if (this.match(TokenType.NAMED_RANGE)) {
      const token = this.previous();
      return { type: 'NamedRange', value: token.value, position: token.position };
    }
    
    // Functions
    if (this.match(TokenType.FUNCTION)) {
      return this.parseFunction();
    }
    
    // Parentheses
    if (this.match(TokenType.LEFT_PAREN)) {
      const expr = this.parseExpression();
      this.consume(TokenType.RIGHT_PAREN, "Expected ')' after expression");
      return expr;
    }
    
    throw new Error(`Unexpected token: ${this.peek().value} at position ${this.peek().position}`);
  }

  private parseFunction(): ASTNode {
    const funcToken = this.previous();
    const args: ASTNode[] = [];
    
    this.consume(TokenType.LEFT_PAREN, `Expected '(' after function ${funcToken.value}`);
    
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        args.push(this.parseExpression());
      } while (this.match(TokenType.COMMA));
    }
    
    this.consume(TokenType.RIGHT_PAREN, `Expected ')' after function arguments`);
    
    return {
      type: 'Function',
      value: funcToken.value,
      children: args,
      position: funcToken.position
    };
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new Error(message + ` at position ${this.peek().position}`);
  }
}

// Export utilities
export function parseFormula(formula: string): ASTNode {
  const parser = new FormulaParser();
  return parser.parse(formula);
}

export function getCellDependencies(formula: string): string[] {
  const ast = parseFormula(formula);
  const dependencies: string[] = [];
  
  function traverse(node: ASTNode) {
    if (node.type === 'CellReference') {
      dependencies.push(node.value);
    } else if (node.type === 'RangeReference') {
      // For ranges, we'd need to expand them
      dependencies.push(node.value);
    } else if (node.children) {
      node.children.forEach(traverse);
    }
  }
  
  traverse(ast);
  return [...new Set(dependencies)]; // Remove duplicates
}

// Utility functions for sheet references
export function parseSheetReference(reference: string): { sheetName?: string; cellRef: string } {
  const exclamationIndex = reference.indexOf('!');
  if (exclamationIndex > 0) {
    return {
      sheetName: reference.substring(0, exclamationIndex),
      cellRef: reference.substring(exclamationIndex + 1)
    };
  }
  return { cellRef: reference };
}

export function isValidSheetName(name: string): boolean {
  // Excel sheet name rules: 1-31 characters, no \/:*?[]'
  return name.length > 0 && name.length <= 31 && 
         !/[\\\/:*?\[\]']/.test(name);
}