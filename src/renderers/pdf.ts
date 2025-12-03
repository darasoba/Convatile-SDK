import PDFDocument from 'pdfkit';
import type { Root } from 'mdast';
import type { RenderOptions, DocumentMetadata, PdfStyles } from '../types/index.js';
import { ConversionError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Default PDF styles
 */
const DEFAULT_STYLES: PdfStyles = {
  margins: {
    top: 72,
    bottom: 72,
    left: 72,
    right: 72,
  },
  fonts: {
    body: 'Helvetica',
    heading: 'Helvetica-Bold',
    code: 'Courier',
  },
  fontSize: {
    body: 12,
    h1: 28,
    h2: 24,
    h3: 20,
    h4: 16,
    h5: 14,
    h6: 12,
    code: 10,
  },
  lineHeight: 1.5,
};

/**
 * Render AST to PDF buffer
 */
export async function renderPdf(ast: Root, options: RenderOptions = {}): Promise<Buffer> {
  try {
    logger.debug('Rendering to PDF');

    const styles = DEFAULT_STYLES;
    const chunks: Buffer[] = [];

    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: styles.margins?.top ?? 72,
        bottom: styles.margins?.bottom ?? 72,
        left: styles.margins?.left ?? 72,
        right: styles.margins?.right ?? 72,
      },
      info: {
        Title: options.metadata?.title || 'Document',
        Author: options.metadata?.author || '',
        Subject: options.metadata?.description || '',
        Keywords: options.metadata?.keywords?.join(', ') || '',
        CreationDate: new Date(),
      },
    });

    // Collect PDF chunks
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    // Render the AST to PDF
    await renderAstToPdf(doc, ast, styles, options.metadata);

    // Finalize the PDF
    doc.end();

    // Wait for PDF generation to complete
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    logger.debug('PDF rendering complete', { size: buffer.length });
    return buffer;
  } catch (error) {
    throw new ConversionError(
      `Failed to render PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'pdf',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Render AST nodes to PDF document
 */
async function renderAstToPdf(
  doc: PDFKit.PDFDocument,
  ast: Root,
  styles: PdfStyles,
  metadata?: DocumentMetadata
): Promise<void> {
  // Add title page if title is provided
  if (metadata?.title) {
    renderTitlePage(doc, metadata, styles);
  }

  // Render each node
  for (const node of ast.children) {
    await renderNodeToPdf(doc, node, styles);
  }
}

/**
 * Render a title page
 */
function renderTitlePage(
  doc: PDFKit.PDFDocument,
  metadata: DocumentMetadata,
  styles: PdfStyles
): void {
  const pageHeight = doc.page.height;

  // Center the title vertically
  doc.y = pageHeight / 3;

  if (metadata.title) {
    doc
      .font(styles.fonts?.heading || 'Helvetica-Bold')
      .fontSize(36)
      .text(metadata.title, { align: 'center' });
  }

  doc.moveDown(2);

  if (metadata.author) {
    doc
      .font(styles.fonts?.body || 'Helvetica')
      .fontSize(16)
      .text(`By ${metadata.author}`, { align: 'center' });
  }

  if (metadata.date) {
    doc.moveDown();
    doc.fontSize(12).text(metadata.date, { align: 'center' });
  }

  // Start new page for content
  doc.addPage();
}

/**
 * Render a single AST node to PDF
 */
async function renderNodeToPdf(
  doc: PDFKit.PDFDocument,
  node: unknown,
  styles: PdfStyles
): Promise<void> {
  const n = node as {
    type: string;
    depth?: number;
    value?: string;
    children?: unknown[];
    ordered?: boolean;
    lang?: string;
  };

  switch (n.type) {
    case 'heading':
      renderHeading(doc, n, styles);
      break;

    case 'paragraph':
      renderParagraph(doc, n, styles);
      break;

    case 'list':
      renderList(doc, n, styles);
      break;

    case 'code':
      renderCodeBlock(doc, n, styles);
      break;

    case 'blockquote':
      renderBlockquote(doc, n, styles);
      break;

    case 'thematicBreak':
      renderHorizontalRule(doc);
      break;
  }
}

/**
 * Render a heading
 */
function renderHeading(
  doc: PDFKit.PDFDocument,
  node: { depth?: number; children?: unknown[] },
  styles: PdfStyles
): void {
  const depth = node.depth || 1;
  const text = extractText(node);
  const fontSizes = styles.fontSize || {};

  const sizeKey = `h${depth}` as keyof typeof fontSizes;
  const fontSize = fontSizes[sizeKey] || 16;

  doc.moveDown(0.5);
  doc
    .font(styles.fonts?.heading || 'Helvetica-Bold')
    .fontSize(fontSize)
    .text(text);
  doc.moveDown(0.3);

  // Reset to body font
  doc.font(styles.fonts?.body || 'Helvetica').fontSize(styles.fontSize?.body || 12);
}

/**
 * Render a paragraph
 */
function renderParagraph(
  doc: PDFKit.PDFDocument,
  node: { children?: unknown[] },
  styles: PdfStyles
): void {
  const text = extractText(node);

  doc
    .font(styles.fonts?.body || 'Helvetica')
    .fontSize(styles.fontSize?.body || 12)
    .text(text, {
      lineGap: (styles.lineHeight || 1.5) * 2,
      align: 'left',
    });
  doc.moveDown(0.5);
}

/**
 * Render a list
 */
function renderList(
  doc: PDFKit.PDFDocument,
  node: { ordered?: boolean; children?: unknown[] },
  styles: PdfStyles
): void {
  const items = node.children || [];
  const isOrdered = node.ordered || false;

  doc.font(styles.fonts?.body || 'Helvetica').fontSize(styles.fontSize?.body || 12);

  items.forEach((item, index) => {
    const text = extractText(item);
    const bullet = isOrdered ? `${index + 1}.` : '•';
    const indent = 20;

    doc.text(`${bullet} ${text}`, doc.x + indent, doc.y, {
      width: doc.page.width - doc.page.margins.left - doc.page.margins.right - indent,
    });
  });

  doc.moveDown(0.5);
}

/**
 * Render a code block
 */
function renderCodeBlock(
  doc: PDFKit.PDFDocument,
  node: { value?: string; lang?: string },
  styles: PdfStyles
): void {
  const code = node.value || '';
  const backgroundColor = '#f6f8fa';

  // Save current position
  const startY = doc.y;

  // Calculate text height
  doc.font(styles.fonts?.code || 'Courier').fontSize(styles.fontSize?.code || 10);

  // Draw background
  const padding = 10;
  const textWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // Measure the text height
  const textHeight = doc.heightOfString(code, { width: textWidth - padding * 2 });

  doc
    .rect(doc.page.margins.left, startY, textWidth, textHeight + padding * 2)
    .fill(backgroundColor);

  // Draw the code text
  doc.fillColor('black').text(code, doc.page.margins.left + padding, startY + padding, {
    width: textWidth - padding * 2,
  });

  doc.moveDown(0.5);

  // Reset font
  doc.font(styles.fonts?.body || 'Helvetica').fontSize(styles.fontSize?.body || 12);
}

/**
 * Render a blockquote
 */
function renderBlockquote(
  doc: PDFKit.PDFDocument,
  node: { children?: unknown[] },
  styles: PdfStyles
): void {
  const text = extractText(node);
  const indent = 20;
  const borderColor = '#dfe2e5';

  const startY = doc.y;

  doc
    .font(styles.fonts?.body || 'Helvetica')
    .fontSize(styles.fontSize?.body || 12)
    .fillColor('#6a737d')
    .text(text, doc.x + indent, doc.y, {
      width: doc.page.width - doc.page.margins.left - doc.page.margins.right - indent,
    });

  // Draw left border
  const endY = doc.y;
  doc
    .moveTo(doc.page.margins.left + 5, startY)
    .lineTo(doc.page.margins.left + 5, endY)
    .lineWidth(3)
    .stroke(borderColor);

  doc.fillColor('black').moveDown(0.5);
}

/**
 * Render a horizontal rule
 */
function renderHorizontalRule(doc: PDFKit.PDFDocument): void {
  doc.moveDown(0.5);

  const startX = doc.page.margins.left;
  const endX = doc.page.width - doc.page.margins.right;
  const y = doc.y;

  doc.moveTo(startX, y).lineTo(endX, y).lineWidth(1).stroke('#e1e4e8');

  doc.moveDown(0.5);
}

/**
 * Extract text content from a node
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
