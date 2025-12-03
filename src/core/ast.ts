import type { Root, Content, Paragraph, Heading, List, Code, Blockquote } from 'mdast';

/**
 * Create an empty AST root node
 */
export function createRoot(children: Content[] = []): Root {
  return {
    type: 'root',
    children,
  };
}

/**
 * Create a paragraph node
 */
export function createParagraph(text: string): Paragraph {
  return {
    type: 'paragraph',
    children: [{ type: 'text', value: text }],
  };
}

/**
 * Create a heading node
 */
export function createHeading(text: string, depth: 1 | 2 | 3 | 4 | 5 | 6 = 1): Heading {
  return {
    type: 'heading',
    depth,
    children: [{ type: 'text', value: text }],
  };
}

/**
 * Create a list node
 */
export function createList(
  items: string[],
  ordered: boolean = false
): List {
  return {
    type: 'list',
    ordered,
    spread: false,
    children: items.map((item) => ({
      type: 'listItem',
      spread: false,
      children: [createParagraph(item)],
    })),
  };
}

/**
 * Create a code block node
 */
export function createCodeBlock(code: string, lang?: string): Code {
  return {
    type: 'code',
    lang: lang || null,
    meta: null,
    value: code,
  };
}

/**
 * Create a blockquote node
 */
export function createBlockquote(text: string): Blockquote {
  return {
    type: 'blockquote',
    children: [createParagraph(text)],
  };
}

/**
 * Walk through all nodes in the AST
 */
export function walkAst(
  ast: Root,
  visitor: (node: Content | Root, parent?: Content | Root) => void
): void {
  function walk(node: Content | Root, parent?: Content | Root): void {
    visitor(node, parent);

    if ('children' in node && Array.isArray(node.children)) {
      for (const child of node.children) {
        walk(child as Content, node);
      }
    }
  }

  walk(ast);
}

/**
 * Count nodes of a specific type
 */
export function countNodesByType(ast: Root, type: string): number {
  let count = 0;

  walkAst(ast, (node) => {
    if (node.type === type) {
      count++;
    }
  });

  return count;
}

/**
 * Extract all text content from an AST
 */
export function extractAllText(ast: Root): string {
  const texts: string[] = [];

  walkAst(ast, (node) => {
    if (node.type === 'text' && 'value' in node) {
      texts.push(node.value);
    }
  });

  return texts.join(' ');
}

/**
 * Get the first heading from the AST
 */
export function getFirstHeading(ast: Root): Heading | undefined {
  for (const child of ast.children) {
    if (child.type === 'heading') {
      return child;
    }
  }
  return undefined;
}

/**
 * Extract the title (first h1) from the AST
 */
export function extractTitle(ast: Root): string | undefined {
  for (const child of ast.children) {
    if (child.type === 'heading' && child.depth === 1) {
      return extractNodeText(child);
    }
  }
  return undefined;
}

/**
 * Extract text from a single node
 */
function extractNodeText(node: Content): string {
  if ('value' in node && typeof node.value === 'string') {
    return node.value;
  }

  if ('children' in node && Array.isArray(node.children)) {
    return node.children.map((child) => extractNodeText(child as Content)).join('');
  }

  return '';
}

/**
 * Clone an AST (deep copy)
 */
export function cloneAst(ast: Root): Root {
  return JSON.parse(JSON.stringify(ast)) as Root;
}

/**
 * Check if AST is empty (no meaningful content)
 */
export function isEmptyAst(ast: Root): boolean {
  if (ast.children.length === 0) {
    return true;
  }

  const text = extractAllText(ast).trim();
  return text.length === 0;
}
