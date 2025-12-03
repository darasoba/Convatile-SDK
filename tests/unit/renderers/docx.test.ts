import { describe, it, expect } from 'vitest';
import { renderDocx } from '../../../src/renderers/docx.js';
import { parseMarkdown } from '../../../src/parsers/markdown.js';

describe('renderDocx', () => {
  it('should render AST to DOCX buffer', async () => {
    const ast = await parseMarkdown('# Hello\n\nWorld');
    const result = await renderDocx(ast);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should create valid DOCX file (ZIP format)', async () => {
    const ast = await parseMarkdown('Content');
    const result = await renderDocx(ast);

    // DOCX files are ZIP files, starting with PK
    const header = result.slice(0, 2).toString();
    expect(header).toBe('PK');
  });

  it('should handle headings', async () => {
    const ast = await parseMarkdown('# H1\n\n## H2\n\n### H3');
    const result = await renderDocx(ast);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle paragraphs', async () => {
    const ast = await parseMarkdown('First paragraph.\n\nSecond paragraph.');
    const result = await renderDocx(ast);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle lists', async () => {
    const ast = await parseMarkdown('- Item 1\n- Item 2\n- Item 3');
    const result = await renderDocx(ast);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle ordered lists', async () => {
    const ast = await parseMarkdown('1. First\n2. Second\n3. Third');
    const result = await renderDocx(ast);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle code blocks', async () => {
    const ast = await parseMarkdown('```javascript\nconst x = 1;\n```');
    const result = await renderDocx(ast);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle blockquotes', async () => {
    const ast = await parseMarkdown('> This is a quote');
    const result = await renderDocx(ast);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should add title when metadata is provided', async () => {
    const ast = await parseMarkdown('Content');
    const result = await renderDocx(ast, {
      metadata: {
        title: 'Test Document',
        author: 'Test Author',
      },
    });

    expect(result).toBeInstanceOf(Buffer);
    // DOCX with title should be larger
    expect(result.length).toBeGreaterThan(1000);
  });

  it('should handle empty AST', async () => {
    const ast = await parseMarkdown('');
    const result = await renderDocx(ast);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle inline formatting', async () => {
    const ast = await parseMarkdown('This is **bold** and _italic_ text.');
    const result = await renderDocx(ast);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });
});
