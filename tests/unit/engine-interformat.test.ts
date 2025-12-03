import { describe, it, expect } from 'vitest';
import { convert, detectInputFormat } from '../../src/core/engine.js';

describe('Inter-format conversion', () => {
  describe('detectInputFormat', () => {
    it('should detect markdown/text as md', () => {
      expect(detectInputFormat('# Hello World')).toBe('md');
      expect(detectInputFormat('Plain text')).toBe('md');
    });

    it('should detect HTML strings', () => {
      expect(detectInputFormat('<h1>Hello</h1>')).toBe('html');
      expect(detectInputFormat('<!DOCTYPE html><html></html>')).toBe('html');
      expect(detectInputFormat('<html><body></body></html>')).toBe('html');
    });

    it('should detect DOCX buffer by magic bytes', () => {
      // ZIP/DOCX magic bytes: PK\x03\x04
      const docxBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
      expect(detectInputFormat(docxBuffer)).toBe('docx');
    });

    it('should detect PDF buffer by magic bytes', () => {
      // PDF magic bytes: %PDF-
      const pdfBuffer = Buffer.from('%PDF-1.4 some content');
      expect(detectInputFormat(pdfBuffer)).toBe('pdf');
    });

    it('should default to md for unknown buffers', () => {
      const unknownBuffer = Buffer.from('some random content');
      expect(detectInputFormat(unknownBuffer)).toBe('md');
    });
  });

  describe('HTML to other formats', () => {
    it('should convert HTML to Markdown', async () => {
      const html = '<h1>Title</h1><p>Content</p>';
      const result = await convert(html, {
        format: ['md'],
        inputFormat: 'html',
      });

      expect(result.md).toBeDefined();
      expect(result.md).toContain('Title');
      expect(result.md).toContain('Content');
    });

    it('should convert HTML to PDF', async () => {
      const html = '<h1>Title</h1><p>Content</p>';
      const result = await convert(html, {
        format: ['pdf'],
        inputFormat: 'html',
      });

      expect(result.pdf).toBeDefined();
      expect(result.pdf).toBeInstanceOf(Buffer);
      expect(result.pdf!.length).toBeGreaterThan(0);
    });

    it('should convert HTML to DOCX', async () => {
      const html = '<h1>Title</h1><p>Content</p>';
      const result = await convert(html, {
        format: ['docx'],
        inputFormat: 'html',
      });

      expect(result.docx).toBeDefined();
      expect(result.docx).toBeInstanceOf(Buffer);
      expect(result.docx!.length).toBeGreaterThan(0);
    });

    it('should auto-detect HTML format', async () => {
      const html = '<!DOCTYPE html><html><body><h1>Test</h1></body></html>';
      const result = await convert(html, {
        format: ['md'],
      });

      expect(result.md).toBeDefined();
      expect(result.md).toContain('Test');
    });
  });

  describe('Markdown to other formats', () => {
    it('should convert Markdown to HTML', async () => {
      const md = '# Title\n\nContent';
      const result = await convert(md, {
        format: ['html'],
        inputFormat: 'md',
      });

      expect(result.html).toBeDefined();
      expect(result.html).toContain('<h1>');
      expect(result.html).toContain('Title');
    });

    it('should convert Markdown to PDF', async () => {
      const md = '# Title\n\nContent';
      const result = await convert(md, {
        format: ['pdf'],
        inputFormat: 'md',
      });

      expect(result.pdf).toBeDefined();
      expect(result.pdf).toBeInstanceOf(Buffer);
    });

    it('should convert Markdown to DOCX', async () => {
      const md = '# Title\n\nContent';
      const result = await convert(md, {
        format: ['docx'],
        inputFormat: 'md',
      });

      expect(result.docx).toBeDefined();
      expect(result.docx).toBeInstanceOf(Buffer);
    });
  });

  describe('Multi-format output', () => {
    it('should convert to multiple formats simultaneously', async () => {
      const html = '<h1>Title</h1><p>Content</p>';
      const result = await convert(html, {
        format: ['md', 'html', 'pdf', 'docx'],
        inputFormat: 'html',
      });

      expect(result.md).toBeDefined();
      expect(result.html).toBeDefined();
      expect(result.pdf).toBeDefined();
      expect(result.docx).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('should throw error for invalid input format', async () => {
      await expect(
        convert('content', {
          format: ['md'],
          inputFormat: 'invalid' as any,
        })
      ).rejects.toThrow();
    });

    it('should throw error when DOCX format needs Buffer but gets string', async () => {
      await expect(
        convert('not a buffer', {
          format: ['md'],
          inputFormat: 'docx',
        })
      ).rejects.toThrow('DOCX input must be a Buffer');
    });

    it('should throw error when PDF format needs Buffer but gets string', async () => {
      await expect(
        convert('not a buffer', {
          format: ['md'],
          inputFormat: 'pdf',
        })
      ).rejects.toThrow('PDF input must be a Buffer');
    });
  });
});
