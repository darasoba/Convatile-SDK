/**
 * Base error class for the Convatile-SDK
 */
export class ConvatileError extends Error {
  public readonly code: string;
  public readonly cause?: Error;

  constructor(message: string, code: string, cause?: Error) {
    super(message);
    this.name = 'ConvatileError';
    this.code = code;
    this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown during document conversion
 */
export class ConversionError extends ConvatileError {
  public readonly format: string;

  constructor(message: string, format: string, cause?: Error) {
    super(message, 'CONVERSION_ERROR', cause);
    this.name = 'ConversionError';
    this.format = format;
  }
}

/**
 * Error thrown during parsing
 */
export class ParseError extends ConvatileError {
  public readonly position?: { line: number; column: number };

  constructor(message: string, position?: { line: number; column: number }, cause?: Error) {
    super(message, 'PARSE_ERROR', cause);
    this.name = 'ParseError';
    this.position = position;
  }
}

/**
 * Error thrown when a template is not found or invalid
 */
export class TemplateError extends ConvatileError {
  public readonly templateId?: string;

  constructor(message: string, templateId?: string, cause?: Error) {
    super(message, 'TEMPLATE_ERROR', cause);
    this.name = 'TemplateError';
    this.templateId = templateId;
  }
}

/**
 * Error thrown when an invalid format is specified
 */
export class FormatError extends ConvatileError {
  public readonly invalidFormat: string;

  constructor(invalidFormat: string) {
    super(`Invalid output format: "${invalidFormat}"`, 'FORMAT_ERROR');
    this.name = 'FormatError';
    this.invalidFormat = invalidFormat;
  }
}

/**
 * Error thrown for validation failures
 */
export class ValidationError extends ConvatileError {
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.field = field;
  }
}
