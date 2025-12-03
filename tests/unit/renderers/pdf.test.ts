import { describe, it, expect } from 'vitest';
import { renderPdf } from '../../../src/renderers/pdf.js';
import { parseMarkdown } from '../../../src/parsers/markdown.js';

describe('renderPdf', () => {
  it('should render AST to PDF buffer', async () => {
    const ast = await parseMarkdown('# Hello\n\nWorld');
    const result = await renderPdf(ast);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should create valid PDF header', async () => {
    const ast = await parseMarkdown('Content');
    const result = await renderPdf(ast);

    // PDF files start with %PDF
    const header = result.slice(0, 4).toString();
    expect(header).toBe('%PDF');
  });

  it('should handle headings', async () => {
    const ast = await parseMarkdown('# H1\n\n## H2\n\n### H3');
    const result = await renderPdf(ast);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle lists', async () => {
    const ast = await parseMarkdown('- Item 1\n- Item 2\n- Item 3');
    const result = await renderPdf(ast);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle code blocks', async () => {
    const ast = await parseMarkdown('```\ncode\n```');
    const result = await renderPdf(ast);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should include metadata in PDF', async () => {
    const ast = await parseMarkdown('Content');
    const result = await renderPdf(ast, {
      metadata: {
        title: 'Test Document',
        author: 'Test Author',
      },
    });

    expect(result).toBeInstanceOf(Buffer);
    // The PDF should contain the title somewhere
    const pdfString = result.toString('binary');
    expect(pdfString).toContain('Test Document');
  });

  it('should add title page when title is provided', async () => {
    const ast = await parseMarkdown('Content');
    const result = await renderPdf(ast, {
      metadata: {
        title: 'My Title',
        author: 'Author Name',
        date: '2024-01-01',
      },
    });

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(1000); // Should be larger with title page
  });

  it('should handle empty AST', async () => {
    const ast = await parseMarkdown('');
    const result = await renderPdf(ast);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });
});
