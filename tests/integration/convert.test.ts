import { describe, it, expect } from 'vitest';
import { convert } from '../../src/index.js';

describe('Integration: convert', () => {
  const sampleMarkdown = `# Sample Document

This is a sample document for testing the Markdown Export SDK.

## Features

- Convert plain text to Markdown
- Export to PDF
- Export to DOCX
- Export to HTML

## Code Example

\`\`\`javascript
const { convert } = require('markdown-export-sdk');

const result = await convert(text, {
  format: ['pdf', 'docx']
});
\`\`\`

## Conclusion

> The SDK makes document conversion simple and straightforward.

Thank you for using the SDK!
`;

  it('should convert sample document to all formats', async () => {
    const result = await convert(sampleMarkdown, {
      format: ['md', 'html', 'pdf', 'docx'],
      metadata: {
        title: 'Sample Document',
        author: 'Test Author',
        date: '2024-01-01',
      },
    });

    // Verify all formats are present
    expect(result.md).toBeDefined();
    expect(result.html).toBeDefined();
    expect(result.pdf).toBeDefined();
    expect(result.docx).toBeDefined();

    // Verify Markdown output
    expect(result.md).toContain('# Sample Document');
    expect(result.md).toContain('---'); // Frontmatter
    expect(result.md).toContain('title: Sample Document');

    // Verify HTML output
    expect(result.html).toContain('<!DOCTYPE html>');
    expect(result.html).toContain('<h1>');
    expect(result.html).toContain('Sample Document');
    expect(result.html).toContain('<ul>');
    expect(result.html).toContain('<code');

    // Verify PDF output (is a valid PDF)
    expect(result.pdf!.slice(0, 4).toString()).toBe('%PDF');

    // Verify DOCX output (is a valid ZIP/DOCX)
    expect(result.docx!.slice(0, 2).toString()).toBe('PK');
  });

  it('should handle plain text input', async () => {
    const plainText = `
My Report

This is a simple report about something important.

Key points:
• First point
• Second point
• Third point

In conclusion, this is the end of the report.
`;

    const result = await convert(plainText, {
      format: ['md', 'html'],
    });

    expect(result.md).toBeDefined();
    expect(result.html).toBeDefined();
  });

  it('should handle complex nested content', async () => {
    const complexContent = `# Main Title

## Section 1

Some introductory text.

### Subsection 1.1

- List item with **bold** text
- List item with _italic_ text
- List item with \`code\`

### Subsection 1.2

1. Ordered item one
2. Ordered item two
3. Ordered item three

## Section 2

> This is a blockquote
> with multiple lines

\`\`\`python
def hello():
    print("Hello, World!")
\`\`\`

---

The end.
`;

    const result = await convert(complexContent, {
      format: ['html', 'pdf', 'docx'],
    });

    expect(result.html).toContain('<h1>');
    expect(result.html).toContain('<h2>');
    expect(result.html).toContain('<h3>');
    expect(result.html).toContain('<blockquote>');
    expect(result.html).toContain('<pre>');

    expect(result.pdf).toBeInstanceOf(Buffer);
    expect(result.docx).toBeInstanceOf(Buffer);
  });

  it('should preserve metadata across all formats', async () => {
    const content = '# Test\n\nContent here.';
    const metadata = {
      title: 'Test Document',
      author: 'John Doe',
      description: 'A test document',
      keywords: ['test', 'document', 'markdown'],
    };

    const result = await convert(content, {
      format: ['md', 'html'],
      metadata,
    });

    // Check Markdown frontmatter
    expect(result.md).toContain('title: Test Document');
    expect(result.md).toContain('author: John Doe');

    // Check HTML meta tags
    expect(result.html).toContain('<title>Test Document</title>');
    expect(result.html).toContain('name="author"');
    expect(result.html).toContain('content="John Doe"');
  });

  it('should handle empty input gracefully', async () => {
    const result = await convert('', { format: ['md', 'html'] });

    expect(result.md).toBeDefined();
    expect(result.html).toBeDefined();
  });

  it('should handle special characters', async () => {
    const content = `# Special Characters

Ampersand: &
Less than: <
Greater than: >
Quote: "
Apostrophe: '
`;

    const result = await convert(content, { format: ['html'] });

    // HTML should escape these characters
    expect(result.html).toContain('&amp;');
    expect(result.html).toContain('&lt;');
    expect(result.html).toContain('&gt;');
  });
});
