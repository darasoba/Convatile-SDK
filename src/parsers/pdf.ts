import pdfParse from 'pdf-parse';
import type { Root, RootContent, Heading, Paragraph, List, ListItem, Text } from 'mdast';
import { ParseError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Parse PDF buffer into an mdast AST
 *
 * Note: PDF parsing is inherently lossy as PDFs don't contain semantic structure.
 * This parser extracts text and applies heuristics to detect structure.
 */
export async function parsePdf(buffer: Buffer): Promise<Root> {
  try {
    logger.debug('Parsing PDF content');

    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      return { type: 'root', children: [] };
    }

    const data = await pdfParse(buffer);
    const text = data.text;

    if (!text) {
      logger.debug('No text content found in PDF');
      return { type: 'root', children: [] };
    }

    const ast = parseExtractedText(text);

    logger.debug('PDF parsing complete', {
      pages: data.numpages,
      nodeCount: countNodes(ast),
    });

    return ast;
  } catch (error) {
    throw new ParseError(
      `Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      undefined,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Parse extracted PDF text into an AST structure using heuristics
 */
function parseExtractedText(text: string): Root {
  const lines = text.split('\n');
  const children: RootContent[] = [];
  let currentParagraphLines: string[] = [];
  let inList = false;
  let listItems: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    const nextLine = lines[i + 1]?.trim() || '';

    // Skip empty lines
    if (trimmedLine === '') {
      // Flush current paragraph
      if (currentParagraphLines.length > 0) {
        children.push(createParagraph(currentParagraphLines.join(' ')));
        currentParagraphLines = [];
      }
      // Flush list if we were in one
      if (inList && listItems.length > 0) {
        children.push(createList(listItems));
        listItems = [];
        inList = false;
      }
      continue;
    }

    // Check for list items
    if (isListItem(trimmedLine)) {
      // Flush paragraph first
      if (currentParagraphLines.length > 0) {
        children.push(createParagraph(currentParagraphLines.join(' ')));
        currentParagraphLines = [];
      }
      inList = true;
      listItems.push(trimmedLine);
      continue;
    }

    // If we were in a list but this isn't a list item, flush the list
    if (inList && listItems.length > 0) {
      children.push(createList(listItems));
      listItems = [];
      inList = false;
    }

    // Check for potential headings
    if (isLikelyHeading(trimmedLine, nextLine, currentParagraphLines.length === 0)) {
      // Flush current paragraph
      if (currentParagraphLines.length > 0) {
        children.push(createParagraph(currentParagraphLines.join(' ')));
        currentParagraphLines = [];
      }
      const depth = detectHeadingLevel(trimmedLine);
      children.push(createHeading(trimmedLine, depth));
      continue;
    }

    // Regular text - add to current paragraph
    currentParagraphLines.push(trimmedLine);
  }

  // Flush remaining content
  if (currentParagraphLines.length > 0) {
    children.push(createParagraph(currentParagraphLines.join(' ')));
  }
  if (listItems.length > 0) {
    children.push(createList(listItems));
  }

  return { type: 'root', children };
}

/**
 * Determine if a line is likely a heading based on heuristics
 */
function isLikelyHeading(
  line: string,
  nextLine: string,
  isFirstContent: boolean
): boolean {
  // Skip if it's a list item
  if (isListItem(line)) {
    return false;
  }

  // All caps short lines are likely headings
  if (line === line.toUpperCase() && line.length < 60 && line.length > 2) {
    return true;
  }

  // Short lines followed by empty line might be headings
  if (line.length < 60 && nextLine === '' && !line.match(/[.!?,;:]$/)) {
    // First content is very likely a title
    if (isFirstContent) {
      return true;
    }
    // Title case lines that are short
    if (isTitleCase(line) && line.length < 50) {
      return true;
    }
  }

  // Numbered section headers like "1. Introduction" or "1.1 Background"
  if (/^\d+(\.\d+)*\s+[A-Z]/.test(line) && line.length < 80) {
    return true;
  }

  return false;
}

/**
 * Check if text is in Title Case
 */
function isTitleCase(text: string): boolean {
  const words = text.split(/\s+/);
  if (words.length < 2) return false;

  const significantWords = words.filter(
    (w) => !['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of'].includes(w.toLowerCase())
  );

  return significantWords.every((word) => /^[A-Z]/.test(word));
}

/**
 * Detect heading level based on characteristics
 */
function detectHeadingLevel(line: string): 1 | 2 | 3 | 4 | 5 | 6 {
  // All caps = h1
  if (line === line.toUpperCase()) {
    return 1;
  }

  // Numbered sections
  const sectionMatch = line.match(/^(\d+)(\.\d+)*/);
  if (sectionMatch) {
    const depth = (sectionMatch[0].match(/\./g) || []).length + 1;
    return Math.min(depth, 6) as 1 | 2 | 3 | 4 | 5 | 6;
  }

  // Based on length
  if (line.length < 25) return 1;
  if (line.length < 40) return 2;
  if (line.length < 60) return 3;
  return 4;
}

/**
 * Check if a line is a list item
 */
function isListItem(line: string): boolean {
  // Bullet patterns: -, *, •, ·, ‣, ▪
  if (/^[\s]*[-*•·‣▪]\s+/.test(line)) {
    return true;
  }
  // Numbered patterns: 1. 1) a. a) i. i)
  if (/^[\s]*(\d+|[a-z]|[ivx]+)[.)]\s+/i.test(line)) {
    return true;
  }
  return false;
}

/**
 * Create a heading node
 */
function createHeading(text: string, depth: 1 | 2 | 3 | 4 | 5 | 6): Heading {
  return {
    type: 'heading',
    depth,
    children: [{ type: 'text', value: text } as Text],
  };
}

/**
 * Create a paragraph node
 */
function createParagraph(text: string): Paragraph {
  return {
    type: 'paragraph',
    children: [{ type: 'text', value: text } as Text],
  };
}

/**
 * Create a list node
 */
function createList(items: string[]): List {
  const isOrdered = /^[\s]*(\d+|[a-z])[.)]/.test(items[0] || '');

  const listItems: ListItem[] = items.map((item) => {
    // Remove list marker
    const cleanText = item
      .replace(/^[\s]*[-*•·‣▪]\s+/, '')
      .replace(/^[\s]*(\d+|[a-z]|[ivx]+)[.)]\s+/i, '');

    return {
      type: 'listItem',
      spread: false,
      children: [createParagraph(cleanText)],
    } as ListItem;
  });

  return {
    type: 'list',
    ordered: isOrdered,
    spread: false,
    children: listItems,
  };
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
