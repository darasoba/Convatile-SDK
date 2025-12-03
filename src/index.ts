// Main conversion functions
export {
  convert,
  convertTo,
  convertToMarkdown,
  convertToHtml,
  convertToPdf,
  convertToDocx,
  detectInputFormat,
} from './core/engine.js';

// Template functions
export {
  registerTemplate,
  getTemplate,
  hasTemplate,
  unregisterTemplate,
  listTemplates,
  listTemplatesByType,
} from './templates/index.js';

// Parsers (for advanced usage)
export { parseMarkdown } from './parsers/markdown.js';
export { parseHtml } from './parsers/html.js';
export { parseDocx } from './parsers/docx.js';
export { parsePdf } from './parsers/pdf.js';

// Renderers (for advanced usage)
export { renderMarkdown } from './renderers/markdown.js';
export { renderHtml } from './renderers/html.js';
export { renderPdf } from './renderers/pdf.js';
export { renderDocx } from './renderers/docx.js';

// AST utilities (for advanced usage)
export {
  createRoot,
  createParagraph,
  createHeading,
  createList,
  createCodeBlock,
  createBlockquote,
  walkAst,
  countNodesByType,
  extractAllText,
  extractTitle,
  cloneAst,
  isEmptyAst,
} from './core/ast.js';

// Types
export type {
  OutputFormat,
  InputFormat,
  ConvertOptions,
  ConvertResult,
  DocumentMetadata,
  TemplateConfig,
  Template,
  Renderer,
  RenderOptions,
  PdfStyles,
  DocxStyles,
  HtmlStyles,
  LogLevel,
  LoggerConfig,
} from './types/index.js';

// Errors
export {
  MarkdownExportError,
  ConversionError,
  ParseError,
  TemplateError,
  FormatError,
  ValidationError,
} from './utils/errors.js';

// Logger (for configuration)
export { Logger, logger } from './utils/logger.js';
