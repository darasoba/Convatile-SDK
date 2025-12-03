# Markdown Export SDK

A template-driven document export engine that converts plain text into Markdown, PDF, DOCX, and HTML formats.

## Features

- **Multi-format export**: Convert plain text or Markdown to PDF, DOCX, HTML, and Markdown
- **Template support**: Customize output with custom templates
- **Metadata injection**: Add title, author, date, and other metadata to documents
- **CLI tool**: Command-line interface for quick conversions
- **TypeScript**: Full TypeScript support with type definitions
- **Zero external calls**: All processing happens locally, no network requests

## Installation

```bash
npm install markdown-export-sdk
```

## Quick Start

### Programmatic API

```typescript
import { convert } from 'markdown-export-sdk';

const text = `
# My Document

This is a sample document with **bold** and _italic_ text.

## Features

- Feature 1
- Feature 2
- Feature 3
`;

// Convert to multiple formats at once
const result = await convert(text, {
  format: ['pdf', 'docx', 'html'],
  metadata: {
    title: 'My Document',
    author: 'John Doe',
    date: '2024-01-01'
  }
});

// Access the outputs
console.log(result.pdf);   // Buffer
console.log(result.docx);  // Buffer
console.log(result.html);  // string
```

### CLI Usage

```bash
# Convert a file to PDF and DOCX
mdexport convert document.md -f pdf,docx -o output/

# Convert text directly
mdexport convert "# Hello World" -f html

# Convert with metadata
mdexport convert input.txt -f pdf --title "My Report" --author "John Doe"

# Read from stdin
cat document.md | mdexport convert --stdin -f pdf -o output/
```

## API Reference

### `convert(text, options)`

Convert text to one or more output formats.

**Parameters:**

- `text` (string): The input text (plain text or Markdown)
- `options` (object):
  - `format` (array): Output formats (`'md'`, `'pdf'`, `'docx'`, `'html'`)
  - `templateId` (string, optional): Template ID to use
  - `metadata` (object, optional): Document metadata

**Returns:** `Promise<ConvertResult>`

```typescript
interface ConvertResult {
  md?: string;
  pdf?: Buffer;
  docx?: Buffer;
  html?: string;
}
```

### Convenience Functions

```typescript
// Convert to specific formats
const markdown = await convertToMarkdown(text, options);
const html = await convertToHtml(text, options);
const pdf = await convertToPdf(text, options);
const docx = await convertToDocx(text, options);
```

### Template Registration

```typescript
import { registerTemplate } from 'markdown-export-sdk';

await registerTemplate({
  id: 'my-template',
  name: 'My Custom Template',
  type: 'html',
  path: './templates/custom.html'
});

// Use the template
const result = await convert(text, {
  format: ['html'],
  templateId: 'my-template'
});
```

## Document Metadata

Supported metadata fields:

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Document title |
| `author` | string | Author name |
| `date` | string | Publication date |
| `description` | string | Document description |
| `keywords` | string[] | Keywords for the document |

```typescript
const result = await convert(text, {
  format: ['pdf', 'html'],
  metadata: {
    title: 'Annual Report 2024',
    author: 'Jane Smith',
    date: '2024-01-15',
    description: 'Company annual report',
    keywords: ['annual', 'report', 'finance']
  }
});
```

## CLI Reference

### `mdexport convert <input>`

Convert text or a file to specified formats.

**Arguments:**
- `<input>`: Input file path or text string

**Options:**
- `-f, --format <formats>`: Output formats (comma-separated, default: `md`)
- `-o, --output <dir>`: Output directory (default: `.`)
- `-n, --name <name>`: Output file name (without extension)
- `-t, --template <id>`: Template ID to use
- `--title <title>`: Document title
- `--author <author>`: Document author
- `--stdin`: Read input from stdin

### `mdexport templates list`

List all registered templates.

### `mdexport templates add <path>`

Register a new template.

**Options:**
- `-i, --id <id>`: Template ID
- `-n, --name <name>`: Template name
- `-t, --type <type>`: Template type (`html`, `pdf`, `docx`)

## Custom Templates

### HTML Templates

HTML templates use placeholder tokens:

```html
<!DOCTYPE html>
<html>
<head>
  <title>{{TITLE}}</title>
  {{META}}
  <style>{{STYLES}}</style>
</head>
<body>
  {{CONTENT}}
</body>
</html>
```

**Placeholders:**
- `{{TITLE}}`: Document title
- `{{META}}`: Meta tags generated from metadata
- `{{STYLES}}`: CSS styles
- `{{CONTENT}}`: Rendered HTML content

## Error Handling

The SDK exports typed errors for better error handling:

```typescript
import {
  ConversionError,
  ParseError,
  TemplateError,
  FormatError,
  ValidationError
} from 'markdown-export-sdk';

try {
  await convert(text, { format: ['pdf'] });
} catch (error) {
  if (error instanceof ConversionError) {
    console.error(`Conversion failed for ${error.format}: ${error.message}`);
  } else if (error instanceof ValidationError) {
    console.error(`Invalid input: ${error.message}`);
  }
}
```

## Requirements

- Node.js 18 or higher
- Linux or macOS (Windows support coming soon)

## License

MIT
