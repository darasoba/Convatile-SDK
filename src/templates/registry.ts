import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import type { TemplateConfig, Template } from '../types/index.js';
import { TemplateError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Template registry for storing and retrieving templates
 */
class TemplateRegistry {
  private templates: Map<string, Template> = new Map();

  /**
   * Register a new template
   */
  async register(config: TemplateConfig): Promise<void> {
    logger.debug('Registering template', { id: config.id, type: config.type });

    // Validate the config
    if (!config.id || typeof config.id !== 'string') {
      throw new TemplateError('Template ID is required');
    }

    if (!config.name || typeof config.name !== 'string') {
      throw new TemplateError('Template name is required', config.id);
    }

    if (!['html', 'pdf', 'docx'].includes(config.type)) {
      throw new TemplateError(`Invalid template type: ${config.type}`, config.id);
    }

    if (!config.path || typeof config.path !== 'string') {
      throw new TemplateError('Template path is required', config.id);
    }

    // Check if file exists
    if (!existsSync(config.path)) {
      throw new TemplateError(`Template file not found: ${config.path}`, config.id);
    }

    // Load the template content
    try {
      const content = await readFile(config.path, 'utf-8');

      const template: Template = {
        id: config.id,
        name: config.name,
        type: config.type,
        path: config.path,
        content,
      };

      this.templates.set(config.id, template);
      logger.debug('Template registered successfully', { id: config.id });
    } catch (error) {
      throw new TemplateError(
        `Failed to load template: ${error instanceof Error ? error.message : 'Unknown error'}`,
        config.id,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get a template by ID
   */
  get(id: string): Template | undefined {
    return this.templates.get(id);
  }

  /**
   * Check if a template exists
   */
  has(id: string): boolean {
    return this.templates.has(id);
  }

  /**
   * Remove a template
   */
  unregister(id: string): boolean {
    logger.debug('Unregistering template', { id });
    return this.templates.delete(id);
  }

  /**
   * List all registered templates
   */
  list(): Template[] {
    return Array.from(this.templates.values());
  }

  /**
   * List templates by type
   */
  listByType(type: 'html' | 'pdf' | 'docx'): Template[] {
    return this.list().filter((t) => t.type === type);
  }

  /**
   * Clear all templates
   */
  clear(): void {
    logger.debug('Clearing all templates');
    this.templates.clear();
  }

  /**
   * Get the number of registered templates
   */
  get size(): number {
    return this.templates.size;
  }
}

// Export singleton instance
export const templateRegistry = new TemplateRegistry();

// Export class for testing
export { TemplateRegistry };
