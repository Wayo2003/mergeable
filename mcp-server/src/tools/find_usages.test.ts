import * as path from 'path';
import { findUsages } from './find_usages';

// demo-target/ is the fixture: a real Express 4 app at ../../demo-target
const DEMO_TARGET = path.resolve(__dirname, '..', '..', '..', 'demo-target');

describe('find_usages — express in demo-target', () => {
  let usages: Awaited<ReturnType<typeof findUsages>>;

  beforeAll(async () => {
    usages = await findUsages({ package: 'express', root: DEMO_TARGET });
  });

  it('returns a non-empty array', () => {
    expect(usages.length).toBeGreaterThan(0);
  });

  it('each entry has required fields', () => {
    for (const u of usages) {
      expect(typeof u.file).toBe('string');
      expect(typeof u.line).toBe('number');
      expect(u.line).toBeGreaterThan(0);
      expect(typeof u.symbol).toBe('string');
      expect(typeof u.snippet).toBe('string');
      expect(u.file).not.toContain('\\');
    }
  });

  it('returns forward-slash relative paths', () => {
    const filesWithSubdirs = usages.filter((u) => u.file.includes('/'));
    expect(filesWithSubdirs.length).toBeGreaterThan(0);
    for (const u of filesWithSubdirs) {
      expect(u.file).toMatch(/^[^\\:]+(\/[^\\:]+)+$/);
    }
  });

  it('detects res.send usage', () => {
    const found = usages.filter((u) => u.symbol.startsWith('res.send'));
    expect(found.length).toBeGreaterThan(0);
  });

  it('detects res.json usage', () => {
    const found = usages.filter((u) => u.symbol.startsWith('res.json'));
    expect(found.length).toBeGreaterThan(0);
  });

  it('detects res.redirect usage', () => {
    const found = usages.filter((u) => u.symbol.startsWith('res.redirect'));
    expect(found.length).toBeGreaterThan(0);
  });

  it('detects req.param usage', () => {
    const found = usages.filter((u) => u.symbol.startsWith('req.param'));
    expect(found.length).toBeGreaterThan(0);
  });

  it('detects router.get usage with path', () => {
    const found = usages.filter((u) => u.symbol.startsWith('router.get('));
    expect(found.length).toBeGreaterThan(0);
  });

  it('detects router.post usage', () => {
    const found = usages.filter((u) => u.symbol.startsWith('router.post'));
    expect(found.length).toBeGreaterThan(0);
  });

  it('detects router.delete or router.del usage', () => {
    const found = usages.filter(
      (u) => u.symbol.startsWith('router.delete') || u.symbol.startsWith('router.del')
    );
    expect(found.length).toBeGreaterThan(0);
  });

  it('does not include node_modules files', () => {
    const withNodeModules = usages.filter((u) => u.file.includes('node_modules'));
    expect(withNodeModules).toHaveLength(0);
  });

  it('snippet is non-empty and not too long', () => {
    for (const u of usages) {
      expect(u.snippet.length).toBeGreaterThan(0);
      expect(u.snippet.length).toBeLessThanOrEqual(120);
    }
  });
});

describe('find_usages — package not present', () => {
  it('returns empty array when package is not imported', async () => {
    const result = await findUsages({ package: 'lodash', root: DEMO_TARGET });
    expect(result).toEqual([]);
  });
});
