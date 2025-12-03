import mammoth from 'mammoth';
import type { Root, RootContent, Heading, Paragraph, List, ListItem, Text } from 'mdast';
import { ParseError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { parseHtml } from './html.js';

/**
 * Parse DOCX buffer into an mdast AST
 */
export async function parseDocx(buffer: Buffer): Promise<Root> {
  try {
    logger.debug('Parsing DOCX content');

    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      return { type: 'root', children: [] };
    }

    // Use mammoth to convert DOCX to HTML first
    const result = await mammoth.convertToHtml({ buffer });

    if (result.messages.length > 0) {
      logger.debug('Mammoth conversion messages', { messages: result.messages });
    }

    // If we got HTML, parse it to mdast
    if (result.value) {
      const ast = await parseHtml(result.value);
      logger.debug('DOCX parsing complete via HTML', { nodeCount: countNodes(ast) });
      return ast;
    }

    // Fallback: extract raw text and convert to basic structure
    const textResult = await mammoth.extractRawText({ buffer });
    const ast = parseRawText(textResult.value);

    logger.debug('DOCX parsing complete via raw text', { nodeCount: countNodes(ast) });
    return ast;
  } catch (error) {
    throw new ParseError(
      `Failed to parse DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`,
      undefined,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Parse raw text into a basic AST structure
 */
function parseRawText(text: string): Root {
  if (!text || typeof text !== 'string') {
    return { type: 'root', children: [] };
  }

  const lines = text.split('\n');
  const children: RootContent[] = [];
  let currentParagraphLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine === '') {
      // Empty line - flush current paragraph
      if (currentParagraphLines.length > 0) {
        children.push(createParagraph(currentParagraphLines.join(' ')));
        currentParagraphLines = [];
      }
    } else if (isLikelyHeading(trimmedLine, currentParagraphLines.length === 0)) {
      // Flush current paragraph first
      if (currentParagraphLines.length > 0) {
        children.push(createParagraph(currentParagraphLines.join(' ')));
        currentParagraphLines = [];
      }
      // Add heading
      children.push(createHeading(trimmedLine, detectHeadingLevel(trimmedLine)));
    } else if (isListItem(trimmedLine)) {
      // Flush current paragraph
      if (currentParagraphLines.length > 0) {
        children.push(createParagraph(currentParagraphLines.join(' ')));
        currentParagraphLines = [];
      }
      // Collect list items
      const listItems: string[] = [trimmedLine];
      // Note: In this simple implementation, we just create a single-item list
      // More sophisticated parsing would collect consecutive list items
      children.push(createList(listItems));
    } else {
      currentParagraphLines.push(trimmedLine);
    }
  }

  // Flush remaining paragraph
  if (currentParagraphLines.length > 0) {
    children.push(createParagraph(currentParagraphLines.join(' ')));
  }

  return { type: 'root', children };
}

/**
 * Check if a line looks like a heading
 */
function isLikelyHeading(line: string, isFirstContent: boolean): boolean {
  // Short lines without terminal punctuation might be headings
  if (
    line.length < 80 &&
    !line.match(/[.!?,;:]$/) &&
    !isListItem(line) &&
    (isFirstContent || line === line.toUpperCase() || /^[A-Z]/.test(line))
  ) {
    return isFirstContent && line.length < 60;
  }
  return false;
}

/**
 * Detect heading level based on content
 */
function detectHeadingLevel(line: string): 1 | 2 | 3 | 4 | 5 | 6 {
  // All caps might be h1
  if (line === line.toUpperCase() && line.length < 40) {
    return 1;
  }
  // Shorter lines tend to be higher-level headings
  if (line.length < 30) {
    return 1;
  }
  if (line.length < 50) {
    return 2;
  }
  return 3;
}

/**
 * Check if a line is a list item
 */
function isListItem(line: string): boolean {
  return /^[\s]*[-•·*]\s+/.test(line) || /^[\s]*\d+[.)]\s+/.test(line);
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
  const listItems: ListItem[] = items.map((item) => {
    // Remove list marker
    const cleanText = item.replace(/^[\s]*[-•·*]\s+/, '').replace(/^[\s]*\d+[.)]\s+/, '');
    return {
      type: 'listItem',
      spread: false,
      children: [createParagraph(cleanText)],
    } as ListItem;
  });

  return {
    type: 'list',
    ordered: /^[\s]*\d+[.)]/.test(items[0] || ''),
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
