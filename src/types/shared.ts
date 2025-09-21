export interface CellAddress {
  row: number;
  col: number;
}

export interface ToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

export interface ToolArgs {
  [key: string]: any;
}

export interface FileHandlerContext {
  readFileContent: (filePath: string, sheet?: string) => Promise<any[][]>;
  parseA1Notation: (a1: string) => CellAddress;
}