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

export interface ChunkMetadata {
  offset: number;
  limit: number;
  totalRows: number;
  returnedRows: number;
  hasMore: boolean;
  nextOffset: number | null;
  note?: string;
}

export interface FileInfo {
  filePath: string;
  fileSize: number;
  totalRows: number;
  totalColumns: number;
  estimatedTokens: number;
  recommendedChunkSize: number;
  sheets?: string[];
}

export interface FileHandlerContext {
  readFileContent: (filePath: string, sheet?: string) => Promise<any[][]>;
  parseA1Notation: (a1: string) => CellAddress;
}