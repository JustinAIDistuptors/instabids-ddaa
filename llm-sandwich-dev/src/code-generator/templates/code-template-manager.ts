/**
 * @file Code Template Manager
 * 
 * This file manages code templates used in the LLM Sandwich Architecture,
 * providing functionality to load, validate, and render templates.
 */

import fs from 'fs/promises';
import path from 'path';
import Handlebars from 'handlebars';
import { CodeTemplate, TemplateParameter } from '../../knowledge-base/types.js';
import { glob } from 'glob';

/**
 * Options for template loading
 */
export interface TemplateLoadOptions {
  /** Directories to search for templates */
  directories: string[];
  /** File pattern to match */
  pattern?: string;
  /** Whether to recursively search directories */
  recursive?: boolean;
  /** Whether to ignore errors */
  ignoreErrors?: boolean;
}

/**
 * Default options for template loading
 */
const DEFAULT_LOAD_OPTIONS: TemplateLoadOptions = {
  directories: ['./templates'],
  pattern: '*.hbs',
  recursive: true,
  ignoreErrors: false,
};

/**
 * Type checking function for template parameters
 */
interface TypeChecker {
  (value: any): boolean;
  typeName: string;
}

/**
 * Template type checkers
 */
const TYPE_CHECKERS: Record<string, TypeChecker> = {
  string: Object.assign((value: any) => typeof value === 'string', { typeName: 'string' }),
  number: Object.assign((value: any) => typeof value === 'number', { typeName: 'number' }),
  boolean: Object.assign((value: any) => typeof value === 'boolean', { typeName: 'boolean' }),
  object: Object.assign((value: any) => typeof value === 'object' && value !== null, { typeName: 'object' }),
  array: Object.assign((value: any) => Array.isArray(value), { typeName: 'array' }),
  any: Object.assign((value: any) => true, { typeName: 'any' }),
};

/**
 * Manager for code templates
 */
export class CodeTemplateManager {
  private templates: Map<string, CodeTemplate> = new Map();
  private compiledTemplates: Map<string, HandlebarsTemplateDelegate> = new Map();

  /**
   * Create a new CodeTemplateManager
   */
  constructor() {
    this.registerHelpers();
  }

  /**
   * Register Handlebars helpers
   */
  private registerHelpers(): void {
    // Conditional helper
    Handlebars.registerHelper('ifCond', function(v1, operator, v2, options) {
      switch (operator) {
        case '==':
          return v1 == v2 ? options.fn(this) : options.inverse(this);
        case '===':
          return v1 === v2 ? options.fn(this) : options.inverse(this);
        case '!=':
          return v1 != v2 ? options.fn(this) : options.inverse(this);
        case '!==':
          return v1 !== v2 ? options.fn(this) : options.inverse(this);
        case '<':
          return v1 < v2 ? options.fn(this) : options.inverse(this);
        case '<=':
          return v1 <= v2 ? options.fn(this) : options.inverse(this);
        case '>':
          return v1 > v2 ? options.fn(this) : options.inverse(this);
        case '>=':
          return v1 >= v2 ? options.fn(this) : options.inverse(this);
        case '&&':
          return v1 && v2 ? options.fn(this) : options.inverse(this);
        case '||':
          return v1 || v2 ? options.fn(this) : options.inverse(this);
        default:
          return options.inverse(this);
      }
    });

    // Pluralize helper
    Handlebars.registerHelper('pluralize', function(count, singular, plural) {
      return count === 1 ? singular : plural;
    });

    // Capitalize helper
    Handlebars.registerHelper('capitalize', function(str) {
      if (typeof str !== 'string') return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    // camelCase helper
    Handlebars.registerHelper('camelCase', function(str) {
      if (typeof str !== 'string') return '';
      return str.replace(/[-_](\w)/g, (_, c) => c.toUpperCase());
    });

    // PascalCase helper
    Handlebars.registerHelper('pascalCase', function(str) {
      if (typeof str !== 'string') return '';
      const camelCase = str.replace(/[-_](\w)/g, (_, c) => c.toUpperCase());
      return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
    });

    // snake_case helper
    Handlebars.registerHelper('snakeCase', function(str) {
      if (typeof str !== 'string') return '';
      return str
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toLowerCase();
    });

    // kebab-case helper
    Handlebars.registerHelper('kebabCase', function(str) {
      if (typeof str !== 'string') return '';
      return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
    });

    // Join arrays
    Handlebars.registerHelper('join', function(array, separator) {
      if (!Array.isArray(array)) return '';
      return array.join(separator);
    });
  }

  /**
   * Load templates from a directory
   */
  public async loadTemplates(options: Partial<TemplateLoadOptions> = {}): Promise<void> {
    const config = { ...DEFAULT_LOAD_OPTIONS, ...options };
    
    // Find all template files matching the pattern
    const files: string[] = [];
    for (const directory of config.directories) {
      const pattern = config.recursive 
        ? `${directory}/**/${config.pattern}`
        : `${directory}/${config.pattern}`;
      
      try {
        const matches = await glob(pattern, {
          ignore: ['**/node_modules/**'],
        });
        files.push(...matches);
      } catch (error) {
        if (!config.ignoreErrors) {
          throw new Error(`Error finding templates in ${directory}: ${error}`);
        }
        console.error(`Error finding templates in ${directory}: ${error}`);
      }
    }
    
    // Load each template file
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const templateId = path.basename(file, path.extname(file));
        const language = this.inferLanguageFromFilename(file);
        
        // Extract metadata from template content
        const template = this.parseTemplateMetadata(content, templateId, language);
        
        this.templates.set(template.id, template);
        this.compileTemplate(template);
      } catch (error) {
        if (!config.ignoreErrors) {
          throw new Error(`Error loading template ${file}: ${error}`);
        }
        console.error(`Error loading template ${file}: ${error}`);
      }
    }
  }

  /**
   * Extract metadata from template content
   */
  private parseTemplateMetadata(
    content: string,
    id: string,
    language: string
  ): CodeTemplate {
    // Look for front matter in the template
    const frontMatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    
    if (frontMatterMatch) {
      try {
        const frontMatter = frontMatterMatch[1];
        const actualContent = frontMatterMatch[2];
        
        // Parse front matter
        const lines = frontMatter.split('\n');
        const metadata: Record<string, any> = {};
        
        for (const line of lines) {
          const match = line.match(/^([^:]+):\s*(.*)$/);
          if (match) {
            const key = match[1].trim();
            const value = match[2].trim();
            
            // Handle array values
            if (value.startsWith('[') && value.endsWith(']')) {
              metadata[key] = value
                .substring(1, value.length - 1)
                .split(',')
                .map(item => item.trim());
            } else {
              metadata[key] = value;
            }
          }
        }
        
        // Parse parameters
        const parameters: TemplateParameter[] = [];
        if (metadata.parameters) {
          for (const paramStr of metadata.parameters) {
            const paramMatch = paramStr.match(/^([^(]+)(\(([^)]+)\))?(=(.+))?$/);
            if (paramMatch) {
              const name = paramMatch[1].trim();
              const type = paramMatch[3]?.trim() || 'any';
              const defaultValue = paramMatch[5]?.trim();
              
              parameters.push({
                name,
                type,
                required: defaultValue === undefined,
                description: `Parameter ${name} of type ${type}`,
                ...(defaultValue !== undefined && { defaultValue })
              });
            }
          }
        }
        
        return {
          id: metadata.id || id,
          name: metadata.name || id,
          description: metadata.description || '',
          language: metadata.language || language,
          content: actualContent,
          parameters: parameters,
          patterns: metadata.patterns || []
        };
      } catch (error) {
        console.error(`Error parsing template metadata: ${error}`);
      }
    }
    
    // Default template if no front matter is found
    return {
      id,
      name: id,
      description: '',
      language,
      content,
      parameters: [],
      patterns: []
    };
  }

  /**
   * Infer language from filename
   */
  private inferLanguageFromFilename(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.js': 'javascript',
      '.tsx': 'typescript',
      '.jsx': 'javascript',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.less': 'less',
      '.py': 'python',
      '.rb': 'ruby',
      '.java': 'java',
      '.cs': 'csharp',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.c': 'c',
      '.cpp': 'cpp',
      '.h': 'cpp',
      '.sql': 'sql',
      '.md': 'markdown',
      '.json': 'json',
      '.yml': 'yaml',
      '.yaml': 'yaml',
      '.xml': 'xml',
      '.sh': 'bash',
      '.bat': 'batch',
      '.ps1': 'powershell',
    };
    
    return languageMap[ext] || 'plaintext';
  }

  /**
   * Compile template
   */
  private compileTemplate(template: CodeTemplate): void {
    try {
      const compiled = Handlebars.compile(template.content);
      this.compiledTemplates.set(template.id, compiled);
    } catch (error) {
      throw new Error(`Error compiling template ${template.id}: ${error}`);
    }
  }

  /**
   * Add a template
   */
  public addTemplate(template: CodeTemplate): void {
    this.templates.set(template.id, template);
    this.compileTemplate(template);
  }

  /**
   * Get a template by ID
   */
  public getTemplate(id: string): CodeTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Get all templates
   */
  public getAllTemplates(): CodeTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by language
   */
  public getTemplatesByLanguage(language: string): CodeTemplate[] {
    return Array.from(this.templates.values())
      .filter(template => template.language === language);
  }

  /**
   * Get templates implementing a pattern
   */
  public getTemplatesByPattern(patternId: string): CodeTemplate[] {
    return Array.from(this.templates.values())
      .filter(template => template.patterns.includes(patternId));
  }

  /**
   * Validate template parameters
   */
  public validateParameters(
    templateId: string, 
    parameters: Record<string, any>
  ): { valid: boolean; errors: string[] } {
    const template = this.templates.get(templateId);
    if (!template) {
      return { valid: false, errors: [`Template not found: ${templateId}`] };
    }
    
    const errors: string[] = [];
    
    // Check for required parameters
    for (const param of template.parameters) {
      if (param.required && !(param.name in parameters)) {
        errors.push(`Missing required parameter: ${param.name}`);
        continue;
      }
      
      // Skip type checking if parameter is not provided and not required
      if (!(param.name in parameters)) {
        continue;
      }
      
      // Check parameter type
      const value = parameters[param.name];
      const typeChecker = TYPE_CHECKERS[param.type.toLowerCase()] || TYPE_CHECKERS.any;
      
      if (!typeChecker(value)) {
        errors.push(`Parameter ${param.name} must be of type ${typeChecker.typeName}, got ${typeof value}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Render a template
   */
  public renderTemplate(
    templateId: string,
    parameters: Record<string, any>
  ): string {
    const validationResult = this.validateParameters(templateId, parameters);
    if (!validationResult.valid) {
      throw new Error(`Invalid template parameters: ${validationResult.errors.join(', ')}`);
    }
    
    const compiled = this.compiledTemplates.get(templateId);
    if (!compiled) {
      throw new Error(`Template not compiled: ${templateId}`);
    }
    
    // Apply default values for missing parameters
    const template = this.templates.get(templateId)!;
    const paramsWithDefaults = { ...parameters };
    
    for (const param of template.parameters) {
      if (!(param.name in paramsWithDefaults) && param.defaultValue !== undefined) {
        paramsWithDefaults[param.name] = param.defaultValue;
      }
    }
    
    try {
      return compiled(paramsWithDefaults);
    } catch (error) {
      throw new Error(`Error rendering template ${templateId}: ${error}`);
    }
  }

  /**
   * Clear all templates
   */
  public clear(): void {
    this.templates.clear();
    this.compiledTemplates.clear();
  }
}
