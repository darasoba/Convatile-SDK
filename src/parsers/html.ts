import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeRemark from 'rehype-remark';
import type { Root } from 'mdast';
import { ParseError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Parse HTML string into an mdast AST
 */
export async function parseHtml(html: string): Promise<Root> {
  try {
    logger.debug('Parsing HTML content');

    if (!html || typeof html !== 'string') {
      return { type: 'root', children: [] };
    }

    const processor = unified()
      .use(rehypeParse, { fragment: !html.trim().startsWith('<!DOCTYPE') })
      .use(rehypeRemark);

    const ast = processor.parse(html);

    // Run the transformation pipeline to convert hast to mdast
    const mdast = await processor.run(ast);

    logger.debug('HTML parsing complete', { nodeCount: countNodes(mdast as Root) });
    return mdast as Root;
  } catch (error) {
    throw new ParseError(
      `Failed to parse HTML: ${error instanceof Error ? error.message : 'Unknown error'}`,
      undefined,
      error instanceof Error ? error : undefined
    );
  }
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
