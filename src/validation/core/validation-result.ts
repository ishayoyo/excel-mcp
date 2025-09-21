/**
 * Validation Result Types - Standardized validation outputs
 */

export interface ValidationIssue {
  rule: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  location: {
    file: string;
    row: number;
    column: string;
  };
  suggestion: string;
  affectedRows: number[];
  metadata?: Record<string, any>;
}

export interface ValidationSummary {
  totalFiles: number;
  totalRows: number;
  totalIssues: number;
  criticalIssues: number;
  warningIssues: number;
  infoIssues: number;
  filesWithIssues: string[];
  validationTimeMs: number;
}

export interface ValidationResult {
  success: boolean;
  summary: ValidationSummary;
  issues: ValidationIssue[];
  detailedReport?: string;
  recommendations: string[];
}

export interface FileValidationContext {
  filePath: string;
  data: any[][];
  headers: string[];
  rowCount: number;
  columnCount: number;
}

export interface ValidationContext {
  primaryFile: FileValidationContext;
  referenceFiles: Map<string, FileValidationContext>;
  relationships?: DetectedRelationship[];
  indexes?: DataIndexes;
}

export interface DetectedRelationship {
  primaryColumn: string;
  referenceFile: string;
  referenceColumn: string;
  confidence: number;
  matchType: 'exact' | 'fuzzy' | 'inferred';
}

export interface DataIndexes {
  columnMaps: Map<string, Map<string, any[]>>;
  keyIndexes: Map<string, Set<string>>;
  rangeStats: Map<string, ColumnStats>;
  duplicateHashes: Map<string, Set<string>>;
}

export interface ColumnStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  nullCount: number;
  uniqueCount: number;
  dataType: 'number' | 'text' | 'date' | 'mixed';
}