import { describe, it, expect } from 'vitest';
import { parseHtml } from '../../../src/parsers/html.js';

describe('parseHtml', () => {
  it('should parse simple HTML to AST', async () => {
    const html = '<h1>Hello World</h1>';
    const ast = await parseHtml(html);

    expect(ast.type).toBe('root');
    expect(ast.children.length).toBeGreaterThan(0);
  });

  it('should parse HTML with paragraphs', async () => {
    const html = '<p>First paragraph</p><p>Second paragraph</p>';
    const ast = await parseHtml(html);

    expect(ast.type).toBe('root');
    const paragraphs = ast.children.filter((c) => c.type === 'paragraph');
    expect(paragraphs.length).toBe(2);
  });

  it('should parse HTML headings', async () => {
    const html = '<h1>Title</h1><h2>Subtitle</h2>';
    const ast = await parseHtml(html);

    const headings = ast.children.filter((c) => c.type === 'heading');
    expect(headings.length).toBe(2);
    expect((headings[0] as { depth: number }).depth).toBe(1);
    expect((headings[1] as { depth: number }).depth).toBe(2);
  });

  it('should parse HTML lists', async () => {
    const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
    const ast = await parseHtml(html);

    const list = ast.children.find((c) => c.type === 'list');
    expect(list).toBeDefined();
    expect((list as { children: unknown[] }).children.length).toBe(2);
  });

  it('should parse ordered lists', async () => {
    const html = '<ol><li>First</li><li>Second</li></ol>';
    const ast = await parseHtml(html);

    const list = ast.children.find((c) => c.type === 'list');
    expect(list).toBeDefined();
    expect((list as { ordered: boolean }).ordered).toBe(true);
  });

  it('should parse code blocks', async () => {
    const html = '<pre><code>const x = 1;</code></pre>';
    const ast = await parseHtml(html);

    const code = ast.children.find((c) => c.type === 'code');
    expect(code).toBeDefined();
  });

  it('should parse full HTML document', async () => {
    const html = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <h1>Welcome</h1>
  <p>This is a test.</p>
</body>
</html>`;
    const ast = await parseHtml(html);

    expect(ast.type).toBe('root');
    expect(ast.children.length).toBeGreaterThan(0);
  });

  it('should handle empty input', async () => {
    const ast = await parseHtml('');

    expect(ast.type).toBe('root');
    expect(ast.children).toHaveLength(0);
  });

  it('should parse inline formatting', async () => {
    const html = '<p>This is <strong>bold</strong> and <em>italic</em></p>';
    const ast = await parseHtml(html);

    expect(ast.type).toBe('root');
    const paragraph = ast.children.find((c) => c.type === 'paragraph');
    expect(paragraph).toBeDefined();
  });

  it('should parse links', async () => {
    const html = '<a href="https://example.com">Example</a>';
    const ast = await parseHtml(html);

    expect(ast.type).toBe('root');
  });
});
