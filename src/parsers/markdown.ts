import { unified } from 'unified';
import remarkParse from 'remark-parse';
import type { Root } from 'mdast';
import { ParseError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Parse plain text or markdown into an AST
 */
export async function parseMarkdown(text: string): Promise<Root> {
  try {
    logger.debug('Parsing markdown text');

    // Normalize the text - handle plain text conversion to markdown
    const normalizedText = normalizeText(text);

    const processor = unified().use(remarkParse);
    const ast = processor.parse(normalizedText) as Root;

    logger.debug('Parsing complete', { nodeCount: countNodes(ast) });
    return ast;
  } catch (error) {
    throw new ParseError(
      `Failed to parse markdown: ${error instanceof Error ? error.message : 'Unknown error'}`,
      undefined,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Normalize plain text into well-structured markdown
 * This function attempts to detect and format common patterns
 */
function normalizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let result = text;

  // Normalize line endings
  result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Detect and convert potential headings (lines that look like titles)
  result = detectHeadings(result);

  // Detect and format lists
  result = detectLists(result);

  // Ensure proper paragraph spacing
  result = ensureParagraphSpacing(result);

  return result.trim();
}

/**
 * Detect potential headings in plain text
 * - Lines followed by === or --- become h1/h2
 * - Short lines (under 60 chars) at the start of text or after blank lines
 *   that don't end with punctuation may be headings
 */
function detectHeadings(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1];

    // Check for setext-style headings (already in markdown format)
    if (nextLine && /^=+\s*$/.test(nextLine)) {
      result.push(`# ${line}`);
      i++; // Skip the underline
      continue;
    }

    if (nextLine && /^-+\s*$/.test(nextLine) && line.trim().length > 0) {
      result.push(`## ${line}`);
      i++; // Skip the underline
      continue;
    }

    // Check for potential title at start
    const looksLikeHeading =
      line.trim().length > 0 &&
      line.trim().length < 60 &&
      !line.trim().match(/[.!?,;:]$/) &&
      !line.trim().startsWith('-') &&
      !line.trim().startsWith('*') &&
      !line.trim().match(/^\d+[.)]/);

    // Only auto-detect heading at the very start
    if (i === 0 && looksLikeHeading && !line.startsWith('#')) {
      result.push(`# ${line}`);
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
}

/**
 * Detect and format list patterns in text
 */
function detectLists(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    // Convert common list patterns to markdown lists
    // - "• item" or "· item" -> "- item"
    let processedLine = line.replace(/^[\s]*[•·]\s*/, '- ');

    // - "1) item" -> "1. item" (but preserve "1. item")
    processedLine = processedLine.replace(/^(\s*)(\d+)\)\s+/, '$1$2. ');

    result.push(processedLine);
  }

  return result.join('\n');
}

/**
 * Ensure proper paragraph spacing (double newlines between paragraphs)
 */
function ensureParagraphSpacing(text: string): string {
  // Don't aggressively add spacing - just normalize existing patterns
  // Replace 3+ newlines with exactly 2
  return text.replace(/\n{3,}/g, '\n\n');
}

/**
 * Count total nodes in an AST (for logging)
 */
function countNodes(node: unknown): number {
  let count = 1;
  const n = node as { children?: unknown[] };
  if (n.children && Array.isArray(n.children)) {
    for (const child of n.children) {
      count += countNodes(child);
    }
  }
  return count;
}
