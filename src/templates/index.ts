import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Template, TemplateConfig } from '../types/index.js';
import { templateRegistry, TemplateRegistry } from './registry.js';
import { TemplateError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

// Get the directory of this module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Default templates directory (relative to package root)
 */
const DEFAULT_TEMPLATES_DIR = join(__dirname, '..', '..', 'templates');

/**
 * Register a custom template
 */
export async function registerTemplate(config: TemplateConfig): Promise<void> {
  await templateRegistry.register(config);
}

/**
 * Get a template by ID
 */
export function getTemplate(id: string): Template | undefined {
  return templateRegistry.get(id);
}

/**
 * Check if a template exists
 */
export function hasTemplate(id: string): boolean {
  return templateRegistry.has(id);
}

/**
 * Remove a template
 */
export function unregisterTemplate(id: string): boolean {
  return templateRegistry.unregister(id);
}

/**
 * List all registered templates
 */
export function listTemplates(): Template[] {
  return templateRegistry.list();
}

/**
 * List templates by type
 */
export function listTemplatesByType(type: 'html' | 'pdf' | 'docx'): Template[] {
  return templateRegistry.listByType(type);
}

/**
 * Load the default HTML template
 */
export async function loadDefaultHtmlTemplate(): Promise<Template | null> {
  const defaultPath = join(DEFAULT_TEMPLATES_DIR, 'default.html');

  if (!existsSync(defaultPath)) {
    logger.debug('Default HTML template not found', { path: defaultPath });
    return null;
  }

  try {
    const content = await readFile(defaultPath, 'utf-8');
    return {
      id: 'default-html',
      name: 'Default HTML Template',
      type: 'html',
      path: defaultPath,
      content,
    };
  } catch (error) {
    logger.warn('Failed to load default HTML template', { error });
    return null;
  }
}

/**
 * Get a template for rendering, falling back to defaults
 */
export async function getTemplateForRendering(
  templateId: string | undefined,
  type: 'html' | 'pdf' | 'docx'
): Promise<Template | undefined> {
  // If a specific template is requested, use it
  if (templateId) {
    const template = templateRegistry.get(templateId);
    if (!template) {
      throw new TemplateError(`Template not found: ${templateId}`, templateId);
    }
    if (template.type !== type) {
      throw new TemplateError(
        `Template type mismatch: expected ${type}, got ${template.type}`,
        templateId
      );
    }
    return template;
  }

  // Try to load default template for the type
  if (type === 'html') {
    return await loadDefaultHtmlTemplate() || undefined;
  }

  // No default template for PDF/DOCX (they use built-in styles)
  return undefined;
}

// Re-export registry for advanced usage
export { templateRegistry, TemplateRegistry };
