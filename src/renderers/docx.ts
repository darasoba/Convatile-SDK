import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
} from 'docx';
import type { Root } from 'mdast';
import type { RenderOptions, DocumentMetadata } from '../types/index.js';
import { ConversionError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Heading level mapping
 */
const HEADING_LEVELS: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
  6: HeadingLevel.HEADING_6,
};

/**
 * Render AST to DOCX buffer
 */
export async function renderDocx(ast: Root, options: RenderOptions = {}): Promise<Buffer> {
  try {
    logger.debug('Rendering to DOCX');

    const sections = renderAstToDocx(ast, options.metadata);

    const doc = new Document({
      creator: options.metadata?.author || 'Markdown Export SDK',
      title: options.metadata?.title || 'Document',
      description: options.metadata?.description || '',
      keywords: options.metadata?.keywords?.join(', ') || '',
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(1),
                right: convertInchesToTwip(1),
                bottom: convertInchesToTwip(1),
                left: convertInchesToTwip(1),
              },
            },
          },
          children: sections,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    logger.debug('DOCX rendering complete', { size: buffer.length });
    return buffer;
  } catch (error) {
    throw new ConversionError(
      `Failed to render DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'docx',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Render AST to DOCX paragraph array
 */
function renderAstToDocx(ast: Root, metadata?: DocumentMetadata): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Add title if provided
  if (metadata?.title) {
    paragraphs.push(
      new Paragraph({
        text: metadata.title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    if (metadata.author) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `By ${metadata.author}`,
              italics: true,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        })
      );
    }

    if (metadata.date) {
      paragraphs.push(
        new Paragraph({
          text: metadata.date,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        })
      );
    }
  }

  // Render each node
  for (const node of ast.children) {
    const nodeParagraphs = renderNodeToDocx(node);
    paragraphs.push(...nodeParagraphs);
  }

  return paragraphs;
}

/**
 * Render a single AST node to DOCX paragraphs
 */
function renderNodeToDocx(node: unknown): Paragraph[] {
  const n = node as {
    type: string;
    depth?: number;
    value?: string;
    children?: unknown[];
    ordered?: boolean;
    lang?: string;
    url?: string;
  };

  switch (n.type) {
    case 'heading':
      return renderHeading(n);

    case 'paragraph':
      return renderParagraph(n);

    case 'list':
      return renderList(n);

    case 'code':
      return renderCodeBlock(n);

    case 'blockquote':
      return renderBlockquote(n);

    case 'thematicBreak':
      return renderHorizontalRule();

    default:
      return [];
  }
}

/**
 * Render a heading
 */
function renderHeading(node: { depth?: number; children?: unknown[] }): Paragraph[] {
  const depth = Math.min(node.depth || 1, 6);
  const textRuns = extractTextRunsAsDocx(node);

  return [
    new Paragraph({
      children: textRuns,
      heading: HEADING_LEVELS[depth],
      spacing: { before: 240, after: 120 },
    }),
  ];
}

/**
 * Render a paragraph
 */
function renderParagraph(node: { children?: unknown[] }): Paragraph[] {
  const textRuns = extractTextRunsAsDocx(node);

  return [
    new Paragraph({
      children: textRuns,
      spacing: { after: 200 },
    }),
  ];
}

/**
 * Render a list
 */
function renderList(node: { ordered?: boolean; children?: unknown[] }): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const items = node.children || [];
  const isOrdered = node.ordered || false;

  items.forEach((item, index) => {
    const textRuns = extractTextRunsAsDocx(item);
    const bullet = isOrdered ? `${index + 1}.` : '•';

    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: `${bullet} ` }), ...textRuns],
        indent: { left: convertInchesToTwip(0.5) },
        spacing: { after: 100 },
      })
    );
  });

  return paragraphs;
}

/**
 * Render a code block
 */
function renderCodeBlock(node: { value?: string }): Paragraph[] {
  const code = node.value || '';
  const lines = code.split('\n');

  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: line || ' ', // Empty lines need a space
            font: 'Courier New',
            size: 20, // 10pt in half-points
          }),
        ],
        shading: {
          fill: 'F6F8FA',
        },
        spacing: { after: 0 },
      })
    );
  }

  // Add spacing after code block
  if (paragraphs.length > 0) {
    paragraphs.push(new Paragraph({ spacing: { after: 200 } }));
  }

  return paragraphs;
}

/**
 * Render a blockquote
 */
function renderBlockquote(node: { children?: unknown[] }): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Process children of blockquote
  const children = node.children || [];
  for (const child of children) {
    const textRuns = extractTextRuns(child);
    paragraphs.push(
      new Paragraph({
        children: textRuns.map(
          (run) =>
            new TextRun({
              text: run.text,
              italics: true,
              color: '6A737D',
            })
        ),
        indent: { left: convertInchesToTwip(0.5) },
        border: {
          left: {
            style: BorderStyle.SINGLE,
            size: 12,
            color: 'DFE2E5',
          },
        },
        spacing: { after: 200 },
      })
    );
  }

  return paragraphs;
}

/**
 * Render a horizontal rule
 */
function renderHorizontalRule(): Paragraph[] {
  return [
    new Paragraph({
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 6,
          color: 'E1E4E8',
        },
      },
      spacing: { before: 200, after: 200 },
    }),
  ];
}

/**
 * Extract text runs from a node, handling inline formatting
 */
function extractTextRuns(
  node: unknown
): { text: string; bold?: boolean; italic?: boolean; code?: boolean }[] {
  const n = node as {
    type?: string;
    value?: string;
    children?: unknown[];
    url?: string;
  };

  if (n.value) {
    return [{ text: n.value }];
  }

  if (!n.children || !Array.isArray(n.children)) {
    return [];
  }

  const runs: { text: string; bold?: boolean; italic?: boolean; code?: boolean }[] = [];

  for (const child of n.children) {
    const c = child as {
      type?: string;
      value?: string;
      children?: unknown[];
    };

    switch (c.type) {
      case 'text':
        runs.push({ text: c.value || '' });
        break;

      case 'strong':
        for (const subRun of extractTextRuns(c)) {
          runs.push({ ...subRun, bold: true });
        }
        break;

      case 'emphasis':
        for (const subRun of extractTextRuns(c)) {
          runs.push({ ...subRun, italic: true });
        }
        break;

      case 'inlineCode':
        runs.push({ text: c.value || '', code: true });
        break;

      case 'link':
        for (const subRun of extractTextRuns(c)) {
          runs.push(subRun);
        }
        break;

      default:
        // Recursively handle other node types
        runs.push(...extractTextRuns(c));
    }
  }

  return runs;
}

/**
 * Convert extracted runs to TextRun objects
 */
function extractTextRunsAsDocx(node: unknown): TextRun[] {
  const runs = extractTextRuns(node);
  return runs.map(
    (run) =>
      new TextRun({
        text: run.text,
        bold: run.bold,
        italics: run.italic,
        font: run.code ? 'Courier New' : undefined,
        size: run.code ? 20 : undefined,
      })
  );
}
