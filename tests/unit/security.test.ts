import * as path from 'path';
import {
  resolveSafePath,
  isWithinRoot,
  isCsvInjectionRisk,
  sanitizeCsvCell,
  sanitizeCsvRows,
  getWorkspaceRoot,
  WORKSPACE_ROOT_ENV,
  CSV_FORMULA_GUARD_ENV,
} from '../../src/utils/security';

describe('workspace containment', () => {
  const originalRoot = process.env[WORKSPACE_ROOT_ENV];

  afterEach(() => {
    if (originalRoot === undefined) {
      delete process.env[WORKSPACE_ROOT_ENV];
    } else {
      process.env[WORKSPACE_ROOT_ENV] = originalRoot;
    }
  });

  it('allows any absolute path when no root is configured', () => {
    delete process.env[WORKSPACE_ROOT_ENV];
    expect(getWorkspaceRoot()).toBeNull();
    const target = path.resolve(process.platform === 'win32' ? 'C:/anywhere/report.xlsx' : '/anywhere/report.xlsx');
    expect(resolveSafePath(target)).toBe(target);
  });

  it('treats an empty root as unset, preserving default behaviour', () => {
    process.env[WORKSPACE_ROOT_ENV] = '   ';
    expect(getWorkspaceRoot()).toBeNull();
  });

  it('permits paths inside the configured root', () => {
    const root = path.resolve('workspace-fixture');
    process.env[WORKSPACE_ROOT_ENV] = root;
    const inside = path.join(root, 'nested', 'book.xlsx');
    expect(resolveSafePath(inside)).toBe(inside);
  });

  it('permits the root directory itself', () => {
    const root = path.resolve('workspace-fixture');
    process.env[WORKSPACE_ROOT_ENV] = root;
    expect(resolveSafePath(root)).toBe(root);
  });

  it('rejects a sibling directory sharing a name prefix', () => {
    const root = path.resolve('workspace-fixture');
    process.env[WORKSPACE_ROOT_ENV] = root;
    // "workspace-fixture-evil" must not be treated as inside "workspace-fixture".
    expect(() => resolveSafePath(`${root}-evil/book.xlsx`)).toThrow(/outside the configured workspace root/);
  });

  it('rejects traversal that escapes the root', () => {
    const root = path.resolve('workspace-fixture');
    process.env[WORKSPACE_ROOT_ENV] = root;
    expect(() => resolveSafePath(path.join(root, '..', 'secrets.csv'))).toThrow(
      /outside the configured workspace root/
    );
  });

  it('rejects an unrelated absolute path', () => {
    const root = path.resolve('workspace-fixture');
    process.env[WORKSPACE_ROOT_ENV] = root;
    const outside = path.resolve(process.platform === 'win32' ? 'C:/Windows/system.ini' : '/etc/passwd');
    expect(() => resolveSafePath(outside)).toThrow(/outside the configured workspace root/);
  });

  it('rejects an empty path', () => {
    expect(() => resolveSafePath('')).toThrow(/file path is required/);
  });

  it('isWithinRoot matches paths differing only by case on Windows', () => {
    const root = path.resolve('Workspace-Fixture');
    const candidate = path.join(root.toLowerCase(), 'book.xlsx');
    expect(isWithinRoot(candidate, root)).toBe(process.platform === 'win32');
  });
});

describe('CSV formula injection guard', () => {
  const originalGuard = process.env[CSV_FORMULA_GUARD_ENV];

  afterEach(() => {
    if (originalGuard === undefined) {
      delete process.env[CSV_FORMULA_GUARD_ENV];
    } else {
      process.env[CSV_FORMULA_GUARD_ENV] = originalGuard;
    }
  });

  it.each(['=1+1', "=cmd|'/c calc'!A1", '@SUM(A1)', '+HYPERLINK("http://x")', '-2+3+cmd|x', '\tlead', '\rlead'])(
    'flags %j as a risk',
    value => {
      expect(isCsvInjectionRisk(value)).toBe(true);
      expect(sanitizeCsvCell(value)).toBe(`'${value}`);
    }
  );

  it.each(['-5', '+1.5', '-0.25e3', '.5', '5', 'plain text', '', 'a=b'])(
    'leaves %j untouched',
    value => {
      expect(isCsvInjectionRisk(value)).toBe(false);
      expect(sanitizeCsvCell(value)).toBe(value);
    }
  );

  it('passes non-string values through unchanged', () => {
    expect(sanitizeCsvCell(-5)).toBe(-5);
    expect(sanitizeCsvCell(null)).toBeNull();
    expect(sanitizeCsvCell(undefined)).toBeUndefined();
    const date = new Date(0);
    expect(sanitizeCsvCell(date)).toBe(date);
  });

  it('sanitizes a 2D row array in place of the original', () => {
    const rows = [
      ['name', 'amount'],
      ['=cmd|x', -5],
      ['safe', '+2'],
    ];
    expect(sanitizeCsvRows(rows)).toEqual([
      ['name', 'amount'],
      ["'=cmd|x", -5],
      ['safe', '+2'],
    ]);
  });

  it('can be disabled via the environment', () => {
    for (const off of ['off', 'false', '0', 'OFF']) {
      process.env[CSV_FORMULA_GUARD_ENV] = off;
      expect(sanitizeCsvRows([['=cmd|x']])).toEqual([['=cmd|x']]);
    }
  });

  it('stays enabled for any other value', () => {
    process.env[CSV_FORMULA_GUARD_ENV] = 'on';
    expect(sanitizeCsvRows([['=cmd|x']])).toEqual([["'=cmd|x"]]);
  });
});
