/**
 * @file Knowledge Repository
 * 
 * This file defines the repository for storing and retrieving knowledge base items
 * extracted from codebases, which are used to inform code generation.
 */

import fs from 'fs/promises';
import path from 'path';
import { 
  KnowledgeRepository,
  Schema,
  Pattern,
  CodeTemplate,
} from '../types.js';

/**
 * Repository options for initialization and configuration
 */
export interface RepositoryOptions {
  /** Base directory to store repository data */
  baseDir: string;
  /** File name for the repository data */
  fileName?: string;
  /** Whether to create the directory if it doesn't exist */
  createIfNotExists?: boolean;
  /** Whether to initialize with empty data */
  initializeEmpty?: boolean;
}

/**
 * Default repository options
 */
const DEFAULT_OPTIONS: RepositoryOptions = {
  baseDir: './.llm-sandwich',
  fileName: 'knowledge-repository.json',
  createIfNotExists: true,
  initializeEmpty: true,
};

/**
 * Repository for managing knowledge base items
 */
export class KnowledgeRepositoryService {
  private repository: KnowledgeRepository;
  private options: RepositoryOptions;
  private filePath: string;
  private initialized = false;

  /**
   * Create a new KnowledgeRepositoryService
   */
  constructor(options: Partial<RepositoryOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.filePath = path.join(this.options.baseDir, this.options.fileName || DEFAULT_OPTIONS.fileName!);
    
    // Initialize empty repository
    this.repository = {
      schemas: {},
      patterns: {},
      templates: {},
      lastUpdated: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  /**
   * Initialize the repository
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Ensure the directory exists
      if (this.options.createIfNotExists) {
        await fs.mkdir(this.options.baseDir, { recursive: true });
      }

      // Try to load existing repository
      try {
        const content = await fs.readFile(this.filePath, 'utf-8');
        this.repository = JSON.parse(content) as KnowledgeRepository;
      } catch (error) {
        // If file doesn't exist and we should initialize empty, continue
        // otherwise rethrow the error
        if (!this.options.initializeEmpty) {
          throw error;
        }
      }

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize repository: ${error}`);
    }
  }

  /**
   * Save the repository to disk
   */
  public async save(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Update last updated timestamp
      this.repository.lastUpdated = new Date().toISOString();
      
      // Save to disk
      const content = JSON.stringify(this.repository, null, 2);
      await fs.writeFile(this.filePath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save repository: ${error}`);
    }
  }

  /**
   * Add or update a schema in the repository
   */
  public async addSchema(schema: Schema): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    this.repository.schemas[schema.id] = schema;
  }

  /**
   * Add or update multiple schemas in the repository
   */
  public async addSchemas(schemas: Schema[]): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    for (const schema of schemas) {
      this.repository.schemas[schema.id] = schema;
    }
  }

  /**
   * Get a schema by ID
   */
  public async getSchema(id: string): Promise<Schema | undefined> {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.repository.schemas[id];
  }

  /**
   * Get all schemas
   */
  public async getAllSchemas(): Promise<Schema[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    return Object.values(this.repository.schemas);
  }

  /**
   * Add or update a pattern in the repository
   */
  public async addPattern(pattern: Pattern): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    this.repository.patterns[pattern.id] = pattern;
  }

  /**
   * Add or update multiple patterns in the repository
   */
  public async addPatterns(patterns: Pattern[]): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    for (const pattern of patterns) {
      this.repository.patterns[pattern.id] = pattern;
    }
  }

  /**
   * Get a pattern by ID
   */
  public async getPattern(id: string): Promise<Pattern | undefined> {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.repository.patterns[id];
  }

  /**
   * Get all patterns
   */
  public async getAllPatterns(): Promise<Pattern[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    return Object.values(this.repository.patterns);
  }

  /**
   * Add or update a template in the repository
   */
  public async addTemplate(template: CodeTemplate): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    this.repository.templates[template.id] = template;
  }

  /**
   * Add or update multiple templates in the repository
   */
  public async addTemplates(templates: CodeTemplate[]): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    for (const template of templates) {
      this.repository.templates[template.id] = template;
    }
  }

  /**
   * Get a template by ID
   */
  public async getTemplate(id: string): Promise<CodeTemplate | undefined> {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.repository.templates[id];
  }

  /**
   * Get all templates
   */
  public async getAllTemplates(): Promise<CodeTemplate[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    return Object.values(this.repository.templates);
  }

  /**
   * Clear all data in the repository
   */
  public async clear(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    this.repository = {
      schemas: {},
      patterns: {},
      templates: {},
      lastUpdated: new Date().toISOString(),
      version: this.repository.version,
    };
  }

  /**
   * Get repository statistics
   */
  public async getStats(): Promise<{
    schemaCount: number;
    patternCount: number;
    templateCount: number;
    lastUpdated: string;
    version: string;
  }> {
    if (!this.initialized) {
      await this.initialize();
    }

    return {
      schemaCount: Object.keys(this.repository.schemas).length,
      patternCount: Object.keys(this.repository.patterns).length,
      templateCount: Object.keys(this.repository.templates).length,
      lastUpdated: this.repository.lastUpdated,
      version: this.repository.version,
    };
  }
}
