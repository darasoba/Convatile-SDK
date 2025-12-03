import { describe, it, expect } from 'vitest';
import { renderHtml } from '../../../src/renderers/html.js';
import { parseMarkdown } from '../../../src/parsers/markdown.js';

describe('renderHtml', () => {
  it('should render AST to HTML string', async () => {
    const ast = await parseMarkdown('# Hello\n\nWorld');
    const result = await renderHtml(ast);

    expect(result).toContain('<!DOCTYPE html>');
    expect(result).toContain('<h1>');
    expect(result).toContain('Hello');
    expect(result).toContain('<p>');
    expect(result).toContain('World');
  });

  it('should include default styles', async () => {
    const ast = await parseMarkdown('Content');
    const result = await renderHtml(ast);

    expect(result).toContain('<style>');
    expect(result).toContain('font-family');
  });

  it('should set document title', async () => {
    const ast = await parseMarkdown('Content');
    const result = await renderHtml(ast, {
      metadata: { title: 'My Document' },
    });

    expect(result).toContain('<title>My Document</title>');
  });

  it('should add meta tags from metadata', async () => {
    const ast = await parseMarkdown('Content');
    const result = await renderHtml(ast, {
      metadata: {
        author: 'John Doe',
        description: 'A test document',
        keywords: ['test', 'document'],
      },
    });

    expect(result).toContain('name="author"');
    expect(result).toContain('content="John Doe"');
    expect(result).toContain('name="description"');
    expect(result).toContain('name="keywords"');
  });

  it('should render lists', async () => {
    const ast = await parseMarkdown('- Item 1\n- Item 2');
    const result = await renderHtml(ast);

    expect(result).toContain('<ul>');
    expect(result).toContain('<li>');
    expect(result).toContain('Item 1');
  });

  it('should render ordered lists', async () => {
    const ast = await parseMarkdown('1. First\n2. Second');
    const result = await renderHtml(ast);

    expect(result).toContain('<ol>');
    expect(result).toContain('<li>');
  });

  it('should render code blocks', async () => {
    const ast = await parseMarkdown('# Code\n\n```javascript\nconst x = 1;\n```');
    const result = await renderHtml(ast);

    expect(result).toContain('<pre>');
    expect(result).toContain('<code');
  });

  it('should render blockquotes', async () => {
    const ast = await parseMarkdown('# Quote\n\n> Quote text');
    const result = await renderHtml(ast);

    expect(result).toContain('<blockquote>');
  });

  it('should escape HTML in content', async () => {
    const ast = await parseMarkdown('<script>alert("xss")</script>');
    const result = await renderHtml(ast);

    expect(result).not.toContain('<script>alert');
    expect(result).toContain('&lt;script&gt;');
  });
});
