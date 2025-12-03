import { describe, it, expect } from 'vitest';
import { parsePdf } from '../../../src/parsers/pdf.js';

describe('parsePdf', () => {
  it('should return empty AST for empty buffer', async () => {
    const ast = await parsePdf(Buffer.alloc(0));

    expect(ast.type).toBe('root');
    expect(ast.children).toHaveLength(0);
  });

  it('should throw error for invalid PDF', async () => {
    const invalidBuffer = Buffer.from('not a pdf file');

    await expect(parsePdf(invalidBuffer)).rejects.toThrow();
  });

  // Note: Real PDF parsing tests would require sample PDF files
  // These are placeholder tests for the parsing logic

  it('should be defined', () => {
    expect(parsePdf).toBeDefined();
    expect(typeof parsePdf).toBe('function');
  });
});
