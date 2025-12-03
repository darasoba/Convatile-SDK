import { unified } from 'unified';
import remarkStringify from 'remark-stringify';
import type { Root } from 'mdast';
import type { RenderOptions, DocumentMetadata } from '../types/index.js';
import { ConversionError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Render AST to Markdown string
 */
export async function renderMarkdown(ast: Root, options: RenderOptions = {}): Promise<string> {
  try {
    logger.debug('Rendering to Markdown');

    const processor = unified().use(remarkStringify, {
      bullet: '-',
      emphasis: '_',
      strong: '*',
      listItemIndent: 'one',
    });

    const markdown = processor.stringify(ast);

    // Add frontmatter if metadata is provided
    const frontmatter = options.metadata ? generateFrontmatter(options.metadata) : '';

    const result = frontmatter ? `${frontmatter}\n${markdown}` : markdown;

    logger.debug('Markdown rendering complete', { length: result.length });
    return result;
  } catch (error) {
    throw new ConversionError(
      `Failed to render Markdown: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'md',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Generate YAML frontmatter from metadata
 */
function generateFrontmatter(metadata: DocumentMetadata): string {
  const lines: string[] = ['---'];

  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${escapeYamlValue(String(item))}`);
      }
    } else if (typeof value === 'object') {
      lines.push(`${key}:`);
      for (const [subKey, subValue] of Object.entries(value)) {
        lines.push(`  ${subKey}: ${escapeYamlValue(String(subValue))}`);
      }
    } else {
      lines.push(`${key}: ${escapeYamlValue(String(value))}`);
    }
  }

  lines.push('---');
  return lines.join('\n');
}

/**
 * Escape special characters in YAML values
 */
function escapeYamlValue(value: string): string {
  // If the value contains special characters, wrap in quotes
  if (/[:#\[\]{}|>&*!?,]/.test(value) || value.includes('\n') || value.startsWith(' ')) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return value;
}
