import type { Root } from 'mdast';

/**
 * Supported output formats for document conversion
 */
export type OutputFormat = 'md' | 'pdf' | 'docx' | 'html';

/**
 * Supported input formats for document parsing
 */
export type InputFormat = 'text' | 'md' | 'docx' | 'pdf' | 'html';

/**
 * Options for the convert function
 */
export interface ConvertOptions {
  /** Array of output formats to generate */
  format: OutputFormat[];
  /** Input format (auto-detected if not specified) */
  inputFormat?: InputFormat;
  /** Optional template ID to use for rendering */
  templateId?: string;
  /** Optional metadata to include in the document */
  metadata?: DocumentMetadata;
}

/**
 * Document metadata that can be included in exports
 */
export interface DocumentMetadata {
  title?: string;
  author?: string;
  date?: string;
  description?: string;
  keywords?: string[];
  [key: string]: unknown;
}

/**
 * Result of the convert function
 */
export interface ConvertResult {
  /** Markdown string output */
  md?: string;
  /** PDF buffer output */
  pdf?: Buffer;
  /** DOCX buffer output */
  docx?: Buffer;
  /** HTML string output */
  html?: string;
}

/**
 * Configuration for registering a custom template
 */
export interface TemplateConfig {
  /** Unique identifier for the template */
  id: string;
  /** Human-readable name */
  name: string;
  /** Type of template */
  type: 'html' | 'pdf' | 'docx';
  /** Path to the template file */
  path: string;
  /** Optional description */
  description?: string;
}

/**
 * Internal template representation
 */
export interface Template {
  id: string;
  name: string;
  type: 'html' | 'pdf' | 'docx';
  content: string;
  path: string;
}

/**
 * Renderer interface that all renderers must implement
 */
export interface Renderer<T> {
  /** Render the AST to the target format */
  render(ast: Root, options: RenderOptions): Promise<T>;
}

/**
 * Options passed to renderers
 */
export interface RenderOptions {
  /** Document metadata */
  metadata?: DocumentMetadata;
  /** Template to apply */
  template?: Template;
}

/**
 * PDF-specific styling options
 */
export interface PdfStyles {
  /** Page margins in points */
  margins?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  /** Font settings */
  fonts?: {
    body?: string;
    heading?: string;
    code?: string;
  };
  /** Font sizes in points */
  fontSize?: {
    body?: number;
    h1?: number;
    h2?: number;
    h3?: number;
    h4?: number;
    h5?: number;
    h6?: number;
    code?: number;
  };
  /** Line height multiplier */
  lineHeight?: number;
}

/**
 * DOCX-specific styling options
 */
export interface DocxStyles {
  /** Default font family */
  fontFamily?: string;
  /** Font sizes in half-points */
  fontSize?: {
    body?: number;
    h1?: number;
    h2?: number;
    h3?: number;
    h4?: number;
    h5?: number;
    h6?: number;
  };
}

/**
 * HTML-specific styling options
 */
export interface HtmlStyles {
  /** CSS styles to inject */
  css?: string;
  /** Whether to include default styles */
  includeDefaultStyles?: boolean;
}

/**
 * Logger levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  prefix?: string;
}
