import { describe, it, expect } from 'vitest';
import { convert, convertToMarkdown, convertToHtml } from '../../src/core/engine.js';
import { ValidationError, FormatError } from '../../src/utils/errors.js';

describe('convert', () => {
  it('should convert text to markdown', async () => {
    const result = await convert('Hello, world!', { format: ['md'] });

    expect(result.md).toBeDefined();
    expect(typeof result.md).toBe('string');
    expect(result.md).toContain('Hello, world!');
  });

  it('should convert text to HTML', async () => {
    const result = await convert('# Hello\n\nWorld', { format: ['html'] });

    expect(result.html).toBeDefined();
    expect(typeof result.html).toBe('string');
    expect(result.html).toContain('<h1>');
    expect(result.html).toContain('Hello');
  });

  it('should convert text to PDF', async () => {
    const result = await convert('Hello, world!', { format: ['pdf'] });

    expect(result.pdf).toBeDefined();
    expect(result.pdf).toBeInstanceOf(Buffer);
    expect(result.pdf!.length).toBeGreaterThan(0);
  });

  it('should convert text to DOCX', async () => {
    const result = await convert('Hello, world!', { format: ['docx'] });

    expect(result.docx).toBeDefined();
    expect(result.docx).toBeInstanceOf(Buffer);
    expect(result.docx!.length).toBeGreaterThan(0);
  });

  it('should convert to multiple formats at once', async () => {
    const result = await convert('Hello', { format: ['md', 'html'] });

    expect(result.md).toBeDefined();
    expect(result.html).toBeDefined();
  });

  it('should include metadata in output', async () => {
    const result = await convert('Content', {
      format: ['md'],
      metadata: { title: 'Test', author: 'Author' },
    });

    expect(result.md).toContain('title: Test');
    expect(result.md).toContain('author: Author');
  });

  it('should throw ValidationError for missing text', async () => {
    await expect(convert(undefined as unknown as string, { format: ['md'] })).rejects.toThrow(
      ValidationError
    );
  });

  it('should throw ValidationError for missing format', async () => {
    await expect(convert('text', { format: [] })).rejects.toThrow(ValidationError);
  });

  it('should throw FormatError for invalid format', async () => {
    await expect(convert('text', { format: ['invalid' as 'md'] })).rejects.toThrow(FormatError);
  });
});

describe('convertToMarkdown', () => {
  it('should convert text to markdown string', async () => {
    const result = await convertToMarkdown('Hello');

    expect(typeof result).toBe('string');
    expect(result).toContain('Hello');
  });
});

describe('convertToHtml', () => {
  it('should convert text to HTML string', async () => {
    const result = await convertToHtml('# Title\n\nParagraph');

    expect(typeof result).toBe('string');
    expect(result).toContain('<!DOCTYPE html>');
    expect(result).toContain('<h1>');
  });
});
