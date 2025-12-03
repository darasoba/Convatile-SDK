import type { Root } from 'mdast';
import type { RenderOptions, DocumentMetadata } from '../types/index.js';
import { ConversionError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Default HTML template
 */
const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  {{META}}
  <title>{{TITLE}}</title>
  <style>
    {{STYLES}}
  </style>
</head>
<body>
  <article class="markdown-body">
    {{CONTENT}}
  </article>
</body>
</html>`;

/**
 * Default CSS styles for HTML output
 */
const DEFAULT_STYLES = `
  * {
    box-sizing: border-box;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    font-size: 16px;
    line-height: 1.6;
    color: #24292e;
    background-color: #fff;
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }
  h1, h2, h3, h4, h5, h6 {
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    font-weight: 600;
    line-height: 1.25;
  }
  h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
  h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
  h3 { font-size: 1.25em; }
  h4 { font-size: 1em; }
  h5 { font-size: 0.875em; }
  h6 { font-size: 0.85em; color: #6a737d; }
  p { margin-top: 0; margin-bottom: 1em; }
  a { color: #0366d6; text-decoration: none; }
  a:hover { text-decoration: underline; }
  code {
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 85%;
    background-color: rgba(27, 31, 35, 0.05);
    padding: 0.2em 0.4em;
    border-radius: 3px;
  }
  pre {
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 85%;
    background-color: #f6f8fa;
    padding: 1em;
    border-radius: 6px;
    overflow: auto;
  }
  pre code {
    background-color: transparent;
    padding: 0;
  }
  blockquote {
    margin: 0;
    padding: 0 1em;
    color: #6a737d;
    border-left: 0.25em solid #dfe2e5;
  }
  ul, ol {
    margin-top: 0;
    margin-bottom: 1em;
    padding-left: 2em;
  }
  li + li {
    margin-top: 0.25em;
  }
  table {
    border-spacing: 0;
    border-collapse: collapse;
    margin-bottom: 1em;
    width: 100%;
  }
  th, td {
    padding: 6px 13px;
    border: 1px solid #dfe2e5;
  }
  th {
    font-weight: 600;
    background-color: #f6f8fa;
  }
  tr:nth-child(2n) {
    background-color: #f6f8fa;
  }
  hr {
    height: 0.25em;
    padding: 0;
    margin: 24px 0;
    background-color: #e1e4e8;
    border: 0;
  }
  img {
    max-width: 100%;
    height: auto;
  }
`;

/**
 * Render AST to HTML string
 */
export async function renderHtml(ast: Root, options: RenderOptions = {}): Promise<string> {
  try {
    logger.debug('Rendering to HTML');

    // Convert AST to HTML content
    const htmlContent = await astToHtml(ast);

    // Apply template
    const template = options.template?.content || DEFAULT_TEMPLATE;
    const html = applyTemplate(template, htmlContent, options.metadata);

    logger.debug('HTML rendering complete', { length: html.length });
    return html;
  } catch (error) {
    throw new ConversionError(
      `Failed to render HTML: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'html',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Convert AST to HTML content string
 */
async function astToHtml(ast: Root): Promise<string> {
  // Use a processor that goes directly from mdast to html
  const { visit } = await import('unist-util-visit');

  const htmlParts: string[] = [];

  visit(ast, (node) => {
    switch (node.type) {
      case 'heading': {
        const level = (node as { depth: number }).depth;
        const text = extractText(node);
        htmlParts.push(`<h${level}>${escapeHtml(text)}</h${level}>`);
        break;
      }
      case 'paragraph': {
        const text = extractText(node);
        htmlParts.push(`<p>${escapeHtml(text)}</p>`);
        break;
      }
      case 'list': {
        const listNode = node as { ordered?: boolean; children: unknown[] };
        const tag = listNode.ordered ? 'ol' : 'ul';
        const items = listNode.children
          .map((child) => `<li>${escapeHtml(extractText(child))}</li>`)
          .join('\n');
        htmlParts.push(`<${tag}>\n${items}\n</${tag}>`);
        break;
      }
      case 'code': {
        const codeNode = node as { value: string; lang?: string };
        const lang = codeNode.lang ? ` class="language-${codeNode.lang}"` : '';
        htmlParts.push(`<pre><code${lang}>${escapeHtml(codeNode.value)}</code></pre>`);
        break;
      }
      case 'blockquote': {
        const text = extractText(node);
        htmlParts.push(`<blockquote>${escapeHtml(text)}</blockquote>`);
        break;
      }
      case 'thematicBreak': {
        htmlParts.push('<hr>');
        break;
      }
    }
  });

  // If no content was generated, try a simple fallback
  if (htmlParts.length === 0) {
    return renderAstSimple(ast);
  }

  return htmlParts.join('\n');
}

/**
 * Simple AST to HTML renderer (fallback)
 */
function renderAstSimple(ast: Root): string {
  const parts: string[] = [];

  for (const node of ast.children) {
    parts.push(renderNode(node));
  }

  return parts.join('\n');
}

/**
 * Render a single AST node to HTML
 */
function renderNode(node: unknown): string {
  const n = node as { type: string; children?: unknown[]; value?: string; depth?: number; ordered?: boolean; lang?: string };

  switch (n.type) {
    case 'heading': {
      const text = n.children ? n.children.map((c) => renderNode(c)).join('') : '';
      return `<h${n.depth}>${text}</h${n.depth}>`;
    }
    case 'paragraph': {
      const text = n.children ? n.children.map((c) => renderNode(c)).join('') : '';
      return `<p>${text}</p>`;
    }
    case 'text':
      return escapeHtml(n.value || '');
    case 'strong': {
      const text = n.children ? n.children.map((c) => renderNode(c)).join('') : '';
      return `<strong>${text}</strong>`;
    }
    case 'emphasis': {
      const text = n.children ? n.children.map((c) => renderNode(c)).join('') : '';
      return `<em>${text}</em>`;
    }
    case 'inlineCode':
      return `<code>${escapeHtml(n.value || '')}</code>`;
    case 'code':
      return `<pre><code${n.lang ? ` class="language-${n.lang}"` : ''}>${escapeHtml(n.value || '')}</code></pre>`;
    case 'list': {
      const tag = n.ordered ? 'ol' : 'ul';
      const items = n.children ? n.children.map((c) => renderNode(c)).join('\n') : '';
      return `<${tag}>\n${items}\n</${tag}>`;
    }
    case 'listItem': {
      const text = n.children ? n.children.map((c) => renderNode(c)).join('') : '';
      // Remove wrapping <p> tags from list items
      const cleanText = text.replace(/^<p>/, '').replace(/<\/p>$/, '');
      return `<li>${cleanText}</li>`;
    }
    case 'blockquote': {
      const text = n.children ? n.children.map((c) => renderNode(c)).join('') : '';
      return `<blockquote>${text}</blockquote>`;
    }
    case 'link': {
      const linkNode = n as { url?: string; children?: unknown[] };
      const text = linkNode.children ? linkNode.children.map((c) => renderNode(c)).join('') : '';
      return `<a href="${escapeHtml(linkNode.url || '')}">${text}</a>`;
    }
    case 'image': {
      const imgNode = n as { url?: string; alt?: string };
      return `<img src="${escapeHtml(imgNode.url || '')}" alt="${escapeHtml(imgNode.alt || '')}">`;
    }
    case 'thematicBreak':
      return '<hr>';
    case 'break':
      return '<br>';
    default:
      return '';
  }
}

/**
 * Extract text content from a node and its children
 */
function extractText(node: unknown): string {
  const n = node as { value?: string; children?: unknown[] };

  if (n.value) {
    return n.value;
  }

  if (n.children && Array.isArray(n.children)) {
    return n.children.map((child) => extractText(child)).join('');
  }

  return '';
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Apply template with content and metadata
 */
function applyTemplate(template: string, content: string, metadata?: DocumentMetadata): string {
  let result = template;

  // Replace content placeholder
  result = result.replace('{{CONTENT}}', content);

  // Replace title
  const title = metadata?.title || 'Document';
  result = result.replace('{{TITLE}}', escapeHtml(title));

  // Replace styles
  result = result.replace('{{STYLES}}', DEFAULT_STYLES);

  // Generate meta tags
  const metaTags = generateMetaTags(metadata);
  result = result.replace('{{META}}', metaTags);

  return result;
}

/**
 * Generate HTML meta tags from metadata
 */
function generateMetaTags(metadata?: DocumentMetadata): string {
  if (!metadata) return '';

  const tags: string[] = [];

  if (metadata.author) {
    tags.push(`<meta name="author" content="${escapeHtml(metadata.author)}">`);
  }

  if (metadata.description) {
    tags.push(`<meta name="description" content="${escapeHtml(metadata.description)}">`);
  }

  if (metadata.keywords && metadata.keywords.length > 0) {
    tags.push(`<meta name="keywords" content="${escapeHtml(metadata.keywords.join(', '))}">`);
  }

  return tags.join('\n  ');
}
