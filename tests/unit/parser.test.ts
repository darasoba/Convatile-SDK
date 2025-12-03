import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../../src/parsers/markdown.js';

describe('parseMarkdown', () => {
  it('should parse plain text into AST', async () => {
    const text = 'Hello, world!';
    const ast = await parseMarkdown(text);

    expect(ast.type).toBe('root');
    expect(ast.children).toHaveLength(1);
    expect(ast.children[0].type).toBe('paragraph');
  });

  it('should parse markdown headings', async () => {
    const text = '# Heading 1\n\n## Heading 2';
    const ast = await parseMarkdown(text);

    expect(ast.children).toHaveLength(2);
    expect(ast.children[0].type).toBe('heading');
    expect((ast.children[0] as { depth: number }).depth).toBe(1);
    expect(ast.children[1].type).toBe('heading');
    expect((ast.children[1] as { depth: number }).depth).toBe(2);
  });

  it('should parse lists', async () => {
    const text = '- Item 1\n- Item 2\n- Item 3';
    const ast = await parseMarkdown(text);

    expect(ast.children).toHaveLength(1);
    expect(ast.children[0].type).toBe('list');
    expect((ast.children[0] as { children: unknown[] }).children).toHaveLength(3);
  });

  it('should parse ordered lists', async () => {
    const text = '1. First\n2. Second\n3. Third';
    const ast = await parseMarkdown(text);

    expect(ast.children).toHaveLength(1);
    expect(ast.children[0].type).toBe('list');
    expect((ast.children[0] as { ordered: boolean }).ordered).toBe(true);
  });

  it('should parse code blocks', async () => {
    const text = '# Title\n\n```javascript\nconst x = 1;\n```';
    const ast = await parseMarkdown(text);

    const codeBlock = ast.children.find((c) => c.type === 'code');
    expect(codeBlock).toBeDefined();
    expect((codeBlock as { lang: string }).lang).toBe('javascript');
  });

  it('should parse blockquotes', async () => {
    const text = '# Title\n\n> This is a quote';
    const ast = await parseMarkdown(text);

    const blockquote = ast.children.find((c) => c.type === 'blockquote');
    expect(blockquote).toBeDefined();
    expect(blockquote?.type).toBe('blockquote');
  });

  it('should handle empty input', async () => {
    const ast = await parseMarkdown('');

    expect(ast.type).toBe('root');
    expect(ast.children).toHaveLength(0);
  });

  it('should normalize bullet points', async () => {
    const text = '# List\n\n• Item 1\n• Item 2';
    const ast = await parseMarkdown(text);

    const list = ast.children.find((c) => c.type === 'list');
    expect(list).toBeDefined();
    expect(list?.type).toBe('list');
  });

  it('should detect title at start of document', async () => {
    const text = 'My Document Title\n\nSome paragraph text here.';
    const ast = await parseMarkdown(text);

    // First element should be a heading
    expect(ast.children[0].type).toBe('heading');
  });
});
