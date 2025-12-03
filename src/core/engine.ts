import type { Root } from 'mdast';
import type {
  ConvertOptions,
  ConvertResult,
  OutputFormat,
  InputFormat,
  RenderOptions,
} from '../types/index.js';
import { parseMarkdown } from '../parsers/markdown.js';
import { parseHtml } from '../parsers/html.js';
import { parseDocx } from '../parsers/docx.js';
import { parsePdf } from '../parsers/pdf.js';
import { renderMarkdown } from '../renderers/markdown.js';
import { renderHtml } from '../renderers/html.js';
import { renderPdf } from '../renderers/pdf.js';
import { renderDocx } from '../renderers/docx.js';
import { getTemplateForRendering } from '../templates/index.js';
import { ConversionError, FormatError, ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Valid output formats
 */
const VALID_FORMATS: OutputFormat[] = ['md', 'pdf', 'docx', 'html'];

/**
 * Valid input formats
 */
const VALID_INPUT_FORMATS: InputFormat[] = ['text', 'md', 'docx', 'pdf', 'html'];

/**
 * Convert input (string or Buffer) to multiple output formats
 *
 * Supports inter-format conversion:
 * - Text/Markdown (string) → Any format
 * - DOCX (Buffer) → Any format
 * - PDF (Buffer) → Any format (lossy - PDFs lack semantic structure)
 * - HTML (string) → Any format
 */
export async function convert(
  input: string | Buffer,
  options: ConvertOptions
): Promise<ConvertResult> {
  // Validate input
  validateInput(input, options);

  // Detect or use provided input format
  const inputFormat = options.inputFormat || detectInputFormat(input);
  logger.debug('Starting conversion', { inputFormat, formats: options.format });

  // Parse the input to AST based on format
  const ast = await parseInput(input, inputFormat);

  // Convert to each requested format in parallel
  const result: ConvertResult = {};
  const conversions: Promise<void>[] = [];

  for (const format of options.format) {
    const conversion = convertToFormat(ast, format, options)
      .then((output) => {
        switch (format) {
          case 'md':
            result.md = output as string;
            break;
          case 'html':
            result.html = output as string;
            break;
          case 'pdf':
            result.pdf = output as Buffer;
            break;
          case 'docx':
            result.docx = output as Buffer;
            break;
        }
      })
      .catch((error) => {
        logger.error(`Failed to convert to ${format}`, { error });
        throw error;
      });

    conversions.push(conversion);
  }

  // Wait for all conversions to complete
  await Promise.all(conversions);

  logger.debug('Conversion complete', { formats: Object.keys(result) });
  return result;
}

/**
 * Detect input format based on content
 */
export function detectInputFormat(input: string | Buffer): InputFormat {
  if (Buffer.isBuffer(input)) {
    // Check magic bytes for binary formats

    // DOCX/ZIP: PK\x03\x04
    if (input.length >= 4) {
      const header = input.slice(0, 4);
      if (
        header[0] === 0x50 && // P
        header[1] === 0x4b && // K
        header[2] === 0x03 &&
        header[3] === 0x04
      ) {
        return 'docx';
      }
    }

    // PDF: %PDF-
    if (input.length >= 5) {
      const header = input.slice(0, 5).toString('ascii');
      if (header === '%PDF-') {
        return 'pdf';
      }
    }

    // Try to interpret as string
    try {
      const str = input.toString('utf8');
      return detectStringFormat(str);
    } catch {
      // If can't decode as UTF-8, assume markdown/text
      return 'md';
    }
  }

  return detectStringFormat(input);
}

/**
 * Detect format of string content
 */
function detectStringFormat(str: string): InputFormat {
  const trimmed = str.trim();

  // Check for HTML
  // DOCTYPE declaration
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<!doctype')) {
    return 'html';
  }

  // HTML tag
  if (trimmed.startsWith('<html') || trimmed.startsWith('<HTML')) {
    return 'html';
  }

  // Starts with any HTML tag and contains a closing tag
  if (trimmed.startsWith('<') && !trimmed.startsWith('<![')) {
    // Check for common HTML patterns
    const htmlTagPattern = /^<([a-z][a-z0-9]*)\b[^>]*>/i;
    const match = trimmed.match(htmlTagPattern);
    if (match) {
      const tagName = match[1].toLowerCase();
      // Check if it has a corresponding closing tag or is self-closing HTML element
      const hasClosingTag = new RegExp(`</${tagName}>`, 'i').test(trimmed);
      const isSelfClosing = /\/>$/.test(match[0]);
      const isVoidElement = ['br', 'hr', 'img', 'input', 'meta', 'link'].includes(tagName);

      if (hasClosingTag || isSelfClosing || isVoidElement) {
        return 'html';
      }
    }
  }

  // Default to markdown/text
  return 'md';
}

/**
 * Parse input based on format
 */
async function parseInput(input: string | Buffer, format: InputFormat): Promise<Root> {
  switch (format) {
    case 'docx':
      if (!Buffer.isBuffer(input)) {
        throw new ValidationError('DOCX input must be a Buffer', 'input');
      }
      return parseDocx(input);

    case 'pdf':
      if (!Buffer.isBuffer(input)) {
        throw new ValidationError('PDF input must be a Buffer', 'input');
      }
      return parsePdf(input);

    case 'html':
      if (Buffer.isBuffer(input)) {
        return parseHtml(input.toString('utf8'));
      }
      return parseHtml(input);

    case 'text':
    case 'md':
    default:
      if (Buffer.isBuffer(input)) {
        return parseMarkdown(input.toString('utf8'));
      }
      return parseMarkdown(input);
  }
}

/**
 * Validate input parameters
 */
function validateInput(input: string | Buffer, options: ConvertOptions): void {
  // Validate input
  if (input === undefined || input === null) {
    throw new ValidationError('Input is required', 'input');
  }

  if (typeof input !== 'string' && !Buffer.isBuffer(input)) {
    throw new ValidationError('Input must be a string or Buffer', 'input');
  }

  // Validate options
  if (!options) {
    throw new ValidationError('Options are required', 'options');
  }

  // Validate format
  if (!options.format || !Array.isArray(options.format)) {
    throw new ValidationError('Format must be an array of output formats', 'format');
  }

  if (options.format.length === 0) {
    throw new ValidationError('At least one output format is required', 'format');
  }

  // Validate each output format
  for (const format of options.format) {
    if (!VALID_FORMATS.includes(format)) {
      throw new FormatError(format);
    }
  }

  // Validate input format if provided
  if (options.inputFormat !== undefined && !VALID_INPUT_FORMATS.includes(options.inputFormat)) {
    throw new ValidationError(
      `Invalid input format: ${options.inputFormat}. Valid formats: ${VALID_INPUT_FORMATS.join(', ')}`,
      'inputFormat'
    );
  }

  // Validate metadata if provided
  if (options.metadata !== undefined && typeof options.metadata !== 'object') {
    throw new ValidationError('Metadata must be an object', 'metadata');
  }
}

/**
 * Convert AST to a specific format
 */
async function convertToFormat(
  ast: Root,
  format: OutputFormat,
  options: ConvertOptions
): Promise<string | Buffer> {
  logger.debug(`Converting to ${format}`);

  const renderOptions: RenderOptions = {
    metadata: options.metadata,
  };

  switch (format) {
    case 'md':
      return renderMarkdown(ast, renderOptions);

    case 'html': {
      const htmlTemplate = await getTemplateForRendering(options.templateId, 'html');
      return renderHtml(ast, { ...renderOptions, template: htmlTemplate });
    }

    case 'pdf': {
      const pdfTemplate = await getTemplateForRendering(options.templateId, 'pdf');
      return renderPdf(ast, { ...renderOptions, template: pdfTemplate });
    }

    case 'docx': {
      const docxTemplate = await getTemplateForRendering(options.templateId, 'docx');
      return renderDocx(ast, { ...renderOptions, template: docxTemplate });
    }

    default:
      throw new FormatError(format);
  }
}

/**
 * Convert input to a single format (convenience function)
 */
export async function convertTo<T extends OutputFormat>(
  input: string | Buffer,
  format: T,
  options?: Omit<ConvertOptions, 'format'>
): Promise<T extends 'md' | 'html' ? string : Buffer> {
  const result = await convert(input, {
    ...options,
    format: [format],
  });

  const output = result[format];
  if (output === undefined) {
    throw new ConversionError(`Conversion to ${format} failed`, format);
  }

  return output as T extends 'md' | 'html' ? string : Buffer;
}

/**
 * Convert input to Markdown
 */
export async function convertToMarkdown(
  input: string | Buffer,
  options?: Omit<ConvertOptions, 'format'>
): Promise<string> {
  return convertTo(input, 'md', options);
}

/**
 * Convert input to HTML
 */
export async function convertToHtml(
  input: string | Buffer,
  options?: Omit<ConvertOptions, 'format'>
): Promise<string> {
  return convertTo(input, 'html', options);
}

/**
 * Convert input to PDF
 */
export async function convertToPdf(
  input: string | Buffer,
  options?: Omit<ConvertOptions, 'format'>
): Promise<Buffer> {
  return convertTo(input, 'pdf', options);
}

/**
 * Convert input to DOCX
 */
export async function convertToDocx(
  input: string | Buffer,
  options?: Omit<ConvertOptions, 'format'>
): Promise<Buffer> {
  return convertTo(input, 'docx', options);
}
