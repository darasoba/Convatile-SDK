#!/usr/bin/env node

import { Command } from 'commander';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename, extname } from 'path';
import {
  convert,
  registerTemplate,
  listTemplates,
  detectInputFormat,
  type OutputFormat,
  type InputFormat,
  type ConvertOptions,
} from '../index.js';

const program = new Command();

program
  .name('mdexport')
  .description('Convert documents between formats (MD, PDF, DOCX, HTML)')
  .version('1.0.0');

// Convert command
program
  .command('convert')
  .description('Convert text or file to specified formats')
  .argument('<input>', 'Input file path or text string')
  .option('-f, --format <formats>', 'Output formats (comma-separated: md,pdf,docx,html)', 'md')
  .option('-i, --input-format <format>', 'Input format (auto-detected if not specified: text,md,html,pdf,docx)')
  .option('-o, --output <dir>', 'Output directory', '.')
  .option('-n, --name <name>', 'Output file name (without extension)')
  .option('-t, --template <id>', 'Template ID to use')
  .option('--title <title>', 'Document title')
  .option('--author <author>', 'Document author')
  .option('--stdin', 'Read input from stdin')
  .action(async (input: string, options) => {
    try {
      // Parse output formats
      const formats = parseFormats(options.format as string);

      // Parse input format if provided
      const inputFormat = options.inputFormat ? parseInputFormat(options.inputFormat) : undefined;

      // Get input content (string or Buffer)
      let content: string | Buffer;
      let inputFileName: string | undefined;

      if (options.stdin) {
        content = await readStdin();
      } else if (existsSync(input)) {
        inputFileName = input;
        const ext = extname(input).toLowerCase();

        // Read as buffer for binary formats
        if (ext === '.pdf' || ext === '.docx') {
          content = await readFile(input);
        } else {
          content = await readFile(input, 'utf-8');
        }
      } else {
        // Treat input as raw text
        content = input;
      }

      // Build convert options
      const convertOptions: ConvertOptions = {
        format: formats,
        inputFormat,
        templateId: options.template,
        metadata: {},
      };

      if (options.title) {
        convertOptions.metadata!.title = options.title;
      }
      if (options.author) {
        convertOptions.metadata!.author = options.author;
      }

      // Detect and display input format
      const detectedFormat = inputFormat || detectInputFormat(content);
      console.log(`Input format: ${detectedFormat}`);
      console.log(`Converting to: ${formats.join(', ')}`);

      // Perform conversion
      const result = await convert(content, convertOptions);

      // Determine output name
      const outputName =
        options.name ||
        (inputFileName ? basename(inputFileName, extname(inputFileName)) : 'output');
      const outputDir = options.output as string;

      // Ensure output directory exists
      if (!existsSync(outputDir)) {
        await mkdir(outputDir, { recursive: true });
      }

      // Write outputs
      for (const format of formats) {
        const output = result[format];
        if (output) {
          const outputPath = join(outputDir, `${outputName}.${format}`);
          if (typeof output === 'string') {
            await writeFile(outputPath, output, 'utf-8');
          } else {
            await writeFile(outputPath, output);
          }
          console.log(`  ✓ ${outputPath}`);
        }
      }

      console.log('Conversion complete!');
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Templates command
const templatesCmd = program.command('templates').description('Manage templates');

templatesCmd
  .command('list')
  .description('List all registered templates')
  .action(() => {
    const templates = listTemplates();
    if (templates.length === 0) {
      console.log('No templates registered.');
      return;
    }

    console.log('Registered templates:');
    for (const template of templates) {
      console.log(`  - ${template.id} (${template.type}): ${template.name}`);
    }
  });

templatesCmd
  .command('add')
  .description('Register a new template')
  .argument('<path>', 'Path to template file')
  .option('-i, --id <id>', 'Template ID')
  .option('-n, --name <name>', 'Template name')
  .option('-t, --type <type>', 'Template type (html, pdf, docx)')
  .action(async (path: string, options) => {
    try {
      if (!existsSync(path)) {
        console.error(`Error: Template file not found: ${path}`);
        process.exit(1);
      }

      // Infer type from extension if not provided
      const ext = extname(path).slice(1);
      const type = (options.type || ext) as 'html' | 'pdf' | 'docx';

      if (!['html', 'pdf', 'docx'].includes(type)) {
        console.error(`Error: Invalid template type: ${type}`);
        process.exit(1);
      }

      const id = options.id || basename(path, extname(path));
      const name = options.name || id;

      await registerTemplate({
        id,
        name,
        type,
        path,
      });

      console.log(`Template registered: ${id}`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Parse and run
program.parse();

/**
 * Parse comma-separated format string
 */
function parseFormats(formatStr: string): OutputFormat[] {
  const validFormats: OutputFormat[] = ['md', 'pdf', 'docx', 'html'];
  const formats = formatStr.split(',').map((f) => f.trim().toLowerCase());

  const result: OutputFormat[] = [];
  for (const format of formats) {
    if (!validFormats.includes(format as OutputFormat)) {
      console.error(`Error: Invalid format "${format}". Valid formats: ${validFormats.join(', ')}`);
      process.exit(1);
    }
    result.push(format as OutputFormat);
  }

  return result;
}

/**
 * Parse input format string
 */
function parseInputFormat(formatStr: string): InputFormat {
  const validFormats: InputFormat[] = ['text', 'md', 'html', 'pdf', 'docx'];
  const format = formatStr.trim().toLowerCase() as InputFormat;

  if (!validFormats.includes(format)) {
    console.error(
      `Error: Invalid input format "${format}". Valid formats: ${validFormats.join(', ')}`
    );
    process.exit(1);
  }

  return format;
}

/**
 * Read input from stdin
 */
async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data);
    });
    process.stdin.on('error', reject);
  });
}
