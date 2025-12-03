import { describe, it, expect } from 'vitest';
import { parseDocx } from '../../../src/parsers/docx.js';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('parseDocx', () => {
  it('should return empty AST for empty buffer', async () => {
    const ast = await parseDocx(Buffer.alloc(0));

    expect(ast.type).toBe('root');
    expect(ast.children).toHaveLength(0);
  });

  it('should throw error for invalid DOCX', async () => {
    const invalidBuffer = Buffer.from('not a docx file');

    await expect(parseDocx(invalidBuffer)).rejects.toThrow();
  });

  // Note: Real DOCX parsing tests would require sample DOCX files
  // These are placeholder tests for the parsing logic

  it('should be defined', () => {
    expect(parseDocx).toBeDefined();
    expect(typeof parseDocx).toBe('function');
  });
});
