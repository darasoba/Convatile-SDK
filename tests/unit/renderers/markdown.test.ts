import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../../../src/renderers/markdown.js';
import { parseMarkdown } from '../../../src/parsers/markdown.js';

describe('renderMarkdown', () => {
  it('should render AST to markdown string', async () => {
    const ast = await parseMarkdown('# Hello\n\nWorld');
    const result = await renderMarkdown(ast);

    expect(result).toContain('# Hello');
    expect(result).toContain('World');
  });

  it('should preserve list formatting', async () => {
    const ast = await parseMarkdown('- Item 1\n- Item 2');
    const result = await renderMarkdown(ast);

    expect(result).toContain('- Item 1');
    expect(result).toContain('- Item 2');
  });

  it('should preserve code blocks', async () => {
    const ast = await parseMarkdown('# Title\n\n```js\ncode\n```');
    const result = await renderMarkdown(ast);

    expect(result).toContain('```');
    expect(result).toContain('code');
  });

  it('should add frontmatter with metadata', async () => {
    const ast = await parseMarkdown('Content');
    const result = await renderMarkdown(ast, {
      metadata: {
        title: 'My Title',
        author: 'John Doe',
      },
    });

    expect(result).toContain('---');
    expect(result).toContain('title: My Title');
    expect(result).toContain('author: John Doe');
  });

  it('should handle arrays in metadata', async () => {
    const ast = await parseMarkdown('Content');
    const result = await renderMarkdown(ast, {
      metadata: {
        keywords: ['one', 'two', 'three'],
      },
    });

    expect(result).toContain('keywords:');
    expect(result).toContain('- one');
    expect(result).toContain('- two');
  });

  it('should escape special characters in YAML', async () => {
    const ast = await parseMarkdown('Content');
    const result = await renderMarkdown(ast, {
      metadata: {
        title: 'Title: With Colon',
      },
    });

    expect(result).toContain('title: "Title: With Colon"');
  });
});
