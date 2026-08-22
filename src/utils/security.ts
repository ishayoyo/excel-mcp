/**
 * Security helpers shared by every filesystem and CSV write path.
 *
 * Two concerns live here:
 *   1. Workspace containment  - optional, opt-in via EXCEL_MCP_WORKSPACE_ROOT.
 *   2. CSV formula injection  - on by default, opt-out via EXCEL_MCP_CSV_FORMULA_GUARD.
 */

import * as path from 'path';

export const WORKSPACE_ROOT_ENV = 'EXCEL_MCP_WORKSPACE_ROOT';
export const CSV_FORMULA_GUARD_ENV = 'EXCEL_MCP_CSV_FORMULA_GUARD';

/**
 * The configured workspace root, or null when unset.
 *
 * Unset is the default and preserves the historical behaviour of this server:
 * any path the caller names is allowed. Operators who expose the server to
 * untrusted callers should set it.
 */
export function getWorkspaceRoot(): string | null {
  const raw = process.env[WORKSPACE_ROOT_ENV];
  if (!raw || raw.trim() === '') {
    return null;
  }
  return path.resolve(raw.trim());
}

/**
 * Windows filesystems are case-insensitive, so containment must be too.
 * Casing is only folded for the comparison - the caller still receives the
 * path exactly as resolved.
 */
function normalizeForCompare(p: string): string {
  return process.platform === 'win32' ? p.toLowerCase() : p;
}

/**
 * True when `candidate` is the root itself or sits beneath it.
 *
 * This is a lexical check performed after path.resolve, so `..` traversal is
 * already collapsed. It does NOT follow symlinks: a symlink inside the root
 * that points outside it will still pass. Resolving links would require the
 * target to exist, which is never true for a file we are about to create.
 */
export function isWithinRoot(candidate: string, root: string): boolean {
  const rel = path.relative(normalizeForCompare(root), normalizeForCompare(candidate));
  if (rel === '') {
    return true;
  }
  return rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);
}

/**
 * Resolve a caller-supplied path to an absolute path, enforcing the workspace
 * root when one is configured.
 *
 * @throws if the path is empty, or escapes a configured workspace root.
 */
export function resolveSafePath(filePath: string): string {
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    throw new Error('A file path is required.');
  }

  const absolutePath = path.resolve(filePath);
  const root = getWorkspaceRoot();

  if (root && !isWithinRoot(absolutePath, root)) {
    throw new Error(
      `Path "${filePath}" resolves outside the configured workspace root (${root}). ` +
      `Set ${WORKSPACE_ROOT_ENV} to a directory that contains this file, or unset it to allow any path.`
    );
  }

  return absolutePath;
}

/** Leading characters a spreadsheet application may interpret as a formula. */
const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r'];

function guardEnabled(): boolean {
  const raw = process.env[CSV_FORMULA_GUARD_ENV];
  if (raw === undefined) {
    return true;
  }
  const normalized = raw.trim().toLowerCase();
  return !(normalized === 'off' || normalized === 'false' || normalized === '0');
}

/**
 * Plain numbers are the common false positive: "-5" and "+1.2e3" begin with a
 * trigger character but carry no formula risk, and prefixing them would corrupt
 * legitimate data on round-trip.
 */
function isPlainNumber(value: string): boolean {
  return /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(value.trim());
}

/**
 * True when writing `value` into a CSV cell could produce a formula that a
 * spreadsheet application evaluates on open (CWE-1236).
 */
export function isCsvInjectionRisk(value: unknown): boolean {
  if (typeof value !== 'string' || value.length === 0) {
    return false;
  }
  if (!FORMULA_TRIGGERS.includes(value[0])) {
    return false;
  }
  return !isPlainNumber(value);
}

/**
 * Neutralise a single CSV cell by prefixing a single quote, which spreadsheet
 * applications treat as "the rest of this cell is literal text".
 *
 * Non-strings pass through untouched: exceljs and csv-stringify emit numbers
 * and dates as typed values, which are never evaluated as formulas.
 */
export function sanitizeCsvCell(value: unknown): unknown {
  return isCsvInjectionRisk(value) ? `'${value}` : value;
}

/** Apply {@link sanitizeCsvCell} across a 2D row array, honouring the opt-out. */
export function sanitizeCsvRows(rows: any[][]): any[][] {
  if (!guardEnabled()) {
    return rows;
  }
  return rows.map(row => (Array.isArray(row) ? row.map(sanitizeCsvCell) : row));
}
