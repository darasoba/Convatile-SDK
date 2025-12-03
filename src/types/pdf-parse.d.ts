declare module 'pdf-parse' {
  interface PDFData {
    /** Number of pages */
    numpages: number;
    /** Number of rendered pages */
    numrender: number;
    /** PDF info */
    info: Record<string, unknown>;
    /** PDF metadata */
    metadata: Record<string, unknown> | null;
    /** PDF version */
    version: string;
    /** Extracted text content */
    text: string;
  }

  interface PDFParseOptions {
    /** Max pages to parse. Default: 0 (all pages) */
    max?: number;
    /** Version of PDF.js */
    version?: string;
  }

  function pdfParse(dataBuffer: Buffer, options?: PDFParseOptions): Promise<PDFData>;

  export = pdfParse;
}
