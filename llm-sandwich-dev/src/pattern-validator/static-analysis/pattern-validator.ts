/**
 * @file Pattern Validator
 * 
 * This file provides functionality to validate code against architectural patterns,
 * ensuring that generated code adheres to defined best practices and patterns.
 */

import { Pattern, PatternRule, RuleSeverity } from '../../knowledge-base/types.js';
import { ESLint } from 'eslint';
import { Project, Node, SyntaxKind, ts } from 'ts-morph';
import path from 'path';

/**
 * Result of a pattern validation
 */
export interface ValidationResult {
  /** Whether the validation passed (no errors) */
  passed: boolean;
  /** Individual rule violations */
  violations: RuleViolation[];
  /** Summary of the validation */
  summary: string;
  /** Time taken to validate (ms) */
  timeTaken: number;
}

/**
 * Violation of a pattern rule
 */
export interface RuleViolation {
  /** Pattern ID */
  patternId: string;
  /** Pattern name */
  patternName: string;
  /** Rule description */
  ruleDescription: string;
  /** Severity of the violation */
  severity: RuleSeverity;
  /** File where the violation occurred */
  file: string;
  /** Line number where the violation occurred */
  line: number;
  /** Column number where the violation occurred */
  column: number;
  /** Suggested fix, if available */
  fix?: string;
}

/**
 * Options for pattern validation
 */
export interface PatternValidatorOptions {
  /** Directories to validate */
  directories: string[];
  /** File patterns to include */
  include?: string[];
  /** File patterns to exclude */
  exclude?: string[];
  /** Whether to ignore errors */
  ignoreErrors?: boolean;
  /** Whether to apply fixes when possible */
  autoFix?: boolean;
  /** Patterns to validate against */
  patterns: Pattern[];
}

/**
 * Default pattern validator options
 */
const DEFAULT_OPTIONS: Partial<PatternValidatorOptions> = {
  include: ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx'],
  exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],
  ignoreErrors: false,
  autoFix: false,
};

/**
 * Validates code against architectural patterns
 */
export class PatternValidator {
  private options: PatternValidatorOptions;
  private project: Project;
  private eslint: ESLint;

  /**
   * Create a new PatternValidator
   */
  constructor(options: PatternValidatorOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    
    // Initialize ts-morph project
    this.project = new Project({
      tsConfigFilePath: path.resolve('tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });
    
    // Add source files
    for (const directory of this.options.directories) {
      this.project.addSourceFilesAtPaths(
        this.options.include!.map(pattern => path.join(directory, pattern))
      );
    }
    
    // Initialize ESLint
    this.eslint = new ESLint({
      useEslintrc: true,
      fix: this.options.autoFix,
      extensions: ['.ts', '.js', '.tsx', '.jsx'],
    });
  }

  /**
   * Validate the code against patterns
   */
  public async validate(): Promise<ValidationResult> {
    const startTime = Date.now();
    const violations: RuleViolation[] = [];
    
    try {
      // Run static analysis
      const staticViolations = await this.runStaticAnalysis();
      violations.push(...staticViolations);
      
      // Run ESLint analysis
      const eslintViolations = await this.runESLintAnalysis();
      violations.push(...eslintViolations);
      
      // Apply fixes if necessary
      if (this.options.autoFix) {
        await this.applyFixes(violations);
      }
      
      const endTime = Date.now();
      const timeTaken = endTime - startTime;
      
      const errorViolations = violations.filter(v => v.severity === RuleSeverity.ERROR);
      const warningViolations = violations.filter(v => v.severity === RuleSeverity.WARNING);
      
      return {
        passed: errorViolations.length === 0,
        violations,
        summary: `Found ${violations.length} violations (${errorViolations.length} errors, ${warningViolations.length} warnings) across ${this.project.getSourceFiles().length} files`,
        timeTaken,
      };
    } catch (error) {
      if (!this.options.ignoreErrors) {
        throw error;
      }
      
      console.error('Error during pattern validation:', error);
      
      const endTime = Date.now();
      const timeTaken = endTime - startTime;
      
      return {
        passed: false,
        violations,
        summary: `Validation failed with error: ${error}`,
        timeTaken,
      };
    }
  }

  /**
   * Run static analysis using ts-morph
   */
  private async runStaticAnalysis(): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = [];
    
    for (const pattern of this.options.patterns) {
      // Skip patterns without rules
      if (!pattern.rules || pattern.rules.length === 0) {
        continue;
      }
      
      for (const sourceFile of this.project.getSourceFiles()) {
        const filePath = sourceFile.getFilePath();
        
        // Skip excluded files
        if (this.shouldExcludeFile(filePath)) {
          continue;
        }
        
        // Apply different validators based on pattern type
        switch (pattern.id) {
          case 'layer-dependency':
            violations.push(...this.validateLayerDependencies(sourceFile, pattern));
            break;
          case 'interface-implementation':
            violations.push(...this.validateInterfaceImplementation(sourceFile, pattern));
            break;
          case 'naming-convention':
            violations.push(...this.validateNamingConventions(sourceFile, pattern));
            break;
          case 'service-pattern':
            violations.push(...this.validateServicePattern(sourceFile, pattern));
            break;
          case 'repository-pattern':
            violations.push(...this.validateRepositoryPattern(sourceFile, pattern));
            break;
          // Add more pattern validators as needed
          default:
            // For unknown patterns, just log and continue
            console.log(`No specific validator for pattern: ${pattern.id}`);
            break;
        }
      }
    }
    
    return violations;
  }

  /**
   * Run ESLint analysis
   */
  private async runESLintAnalysis(): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = [];
    
    try {
      // Get files to lint
      const files: string[] = [];
      for (const directory of this.options.directories) {
        for (const include of this.options.include!) {
          files.push(path.join(directory, include));
        }
      }
      
      // Run ESLint
      const results = await this.eslint.lintFiles(files);
      
      // Apply fixes if needed
      if (this.options.autoFix) {
        await ESLint.outputFixes(results);
      }
      
      // Convert ESLint results to violations
      for (const result of results) {
        for (const message of result.messages) {
          const patternForRule = this.findPatternForESLintRule(message.ruleId || '');
          
          if (patternForRule) {
            violations.push({
              patternId: patternForRule.id,
              patternName: patternForRule.name,
              ruleDescription: message.message,
              severity: message.severity === 2 ? RuleSeverity.ERROR : RuleSeverity.WARNING,
              file: result.filePath,
              line: message.line,
              column: message.column,
              fix: message.fix ? JSON.stringify(message.fix) : undefined,
            });
          }
        }
      }
    } catch (error) {
      console.error('ESLint error:', error);
    }
    
    return violations;
  }

  /**
   * Apply automatic fixes for violations
   */
  private async applyFixes(violations: RuleViolation[]): Promise<void> {
    // Group violations by file
    const violationsByFile = new Map<string, RuleViolation[]>();
    
    for (const violation of violations) {
      if (!violation.fix) {
        continue;
      }
      
      const violations = violationsByFile.get(violation.file) || [];
      violations.push(violation);
      violationsByFile.set(violation.file, violations);
    }
    
    // Apply fixes for each file
    for (const [file, fileViolations] of violationsByFile.entries()) {
      try {
        const sourceFile = this.project.getSourceFile(file);
        if (!sourceFile) {
          continue;
        }
        
        // Apply fixes in reverse line order to avoid position shifts
        fileViolations
          .sort((a, b) => b.line - a.line || b.column - a.column)
          .forEach(violation => {
            // Apply fix logic here
            // For simplicity, we're not implementing actual fix logic in this example
            console.log(`Would apply fix for ${violation.patternId} in ${file}:${violation.line}:${violation.column}`);
          });
        
        // Save changes
        sourceFile.saveSync();
      } catch (error) {
        console.error(`Error applying fixes to ${file}:`, error);
      }
    }
  }

  /**
   * Check if a file should be excluded
   */
  private shouldExcludeFile(filePath: string): boolean {
    for (const exclude of this.options.exclude!) {
      if (new RegExp(exclude.replace(/\*/g, '.*')).test(filePath)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Find a pattern that corresponds to an ESLint rule
   */
  private findPatternForESLintRule(ruleId: string): Pattern | undefined {
    if (!ruleId) {
      return undefined;
    }
    
    // Map ESLint rules to patterns
    // This is a simplistic implementation; in a real system, you would have a more
    // sophisticated mapping between ESLint rules and your architectural patterns
    const ruleToPatternMap: Record<string, string> = {
      'no-unused-vars': 'naming-convention',
      'no-console': 'logging-pattern',
      'import/no-cycle': 'layer-dependency',
    };
    
    const patternId = ruleToPatternMap[ruleId];
    if (!patternId) {
      return undefined;
    }
    
    return this.options.patterns.find(p => p.id === patternId);
  }

  /**
   * Validate layer dependencies
   */
  private validateLayerDependencies(sourceFile: any, pattern: Pattern): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const filePath = sourceFile.getFilePath();
    
    // Extract layer from file path
    const layerMatch = filePath.match(/src\/([^/]+)/);
    if (!layerMatch) {
      return violations;
    }
    
    const currentLayer = layerMatch[1];
    
    // Define layer hierarchy (higher layers can depend on lower layers but not vice versa)
    const layerHierarchy = ['persistence', 'domain', 'application', 'presentation'];
    const currentLayerIndex = layerHierarchy.indexOf(currentLayer);
    
    if (currentLayerIndex === -1) {
      return violations; // Not a recognized layer
    }
    
    // Check imports
    const importDeclarations = sourceFile.getImportDeclarations();
    
    for (const importDecl of importDeclarations) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      
      // Skip external modules
      if (!moduleSpecifier.startsWith('.') && !moduleSpecifier.startsWith('src/')) {
        continue;
      }
      
      // Extract imported layer
      const importedLayerMatch = moduleSpecifier.match(/src\/([^/]+)/);
      if (!importedLayerMatch && !moduleSpecifier.includes('../')) {
        continue;
      }
      
      let importedLayer;
      if (importedLayerMatch) {
        importedLayer = importedLayerMatch[1];
      } else {
        // Handle relative imports
        const pathParts = moduleSpecifier.split('/');
        const upLevels = pathParts.filter(part => part === '..').length;
        
        // Determine the target layer based on current layer and how many levels up
        const filePathParts = filePath.split('/');
        const targetIndex = filePathParts.indexOf('src') + 1 + upLevels;
        
        if (targetIndex < filePathParts.length) {
          importedLayer = filePathParts[targetIndex];
        } else {
          continue; // Cannot determine imported layer
        }
      }
      
      const importedLayerIndex = layerHierarchy.indexOf(importedLayer);
      
      if (importedLayerIndex === -1) {
        continue; // Not a recognized layer
      }
      
      // Check if the import violates layer dependency rules
      if (importedLayerIndex > currentLayerIndex) {
        const pos = importDecl.getStart();
        const { line, column } = sourceFile.getLineAndColumnAtPos(pos);
        
        violations.push({
          patternId: pattern.id,
          patternName: pattern.name,
          ruleDescription: `Layer '${currentLayer}' cannot depend on higher layer '${importedLayer}'`,
          severity: RuleSeverity.ERROR,
          file: filePath,
          line,
          column,
          fix: `Replace this import with a dependency on a lower-level layer or use an interface`,
        });
      }
    }
    
    return violations;
  }

  /**
   * Validate interface implementation
   */
  private validateInterfaceImplementation(sourceFile: any, pattern: Pattern): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const filePath = sourceFile.getFilePath();
    
    // Check class declarations
    const classDeclarations = sourceFile.getClasses();
    
    for (const classDecl of classDeclarations) {
      // Skip abstract classes
      if (classDecl.isAbstract()) {
        continue;
      }
      
      const className = classDecl.getName();
      
      // Check for service classes
      if (className && className.endsWith('Service')) {
        // Check if the class implements an interface
        const implementations = classDecl.getImplements();
        
        if (implementations.length === 0) {
          const pos = classDecl.getStart();
          const { line, column } = sourceFile.getLineAndColumnAtPos(pos);
          
          violations.push({
            patternId: pattern.id,
            patternName: pattern.name,
            ruleDescription: `Service class '${className}' should implement an interface`,
            severity: RuleSeverity.WARNING,
            file: filePath,
            line,
            column,
            fix: `Create an interface 'I${className}' and implement it in this class`,
          });
        }
      }
    }
    
    return violations;
  }

  /**
   * Validate naming conventions
   */
  private validateNamingConventions(sourceFile: any, pattern: Pattern): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const filePath = sourceFile.getFilePath();
    
    // Check class names
    const classDeclarations = sourceFile.getClasses();
    
    for (const classDecl of classDeclarations) {
      const className = classDecl.getName();
      
      if (!className) {
        continue; // Anonymous class
      }
      
      // Classes should be PascalCase
      if (className !== className.charAt(0).toUpperCase() + className.slice(1)) {
        const pos = classDecl.getStart();
        const { line, column } = sourceFile.getLineAndColumnAtPos(pos);
        
        violations.push({
          patternId: pattern.id,
          patternName: pattern.name,
          ruleDescription: `Class names should be PascalCase: '${className}'`,
          severity: RuleSeverity.WARNING,
          file: filePath,
          line,
          column,
          fix: `Rename to '${className.charAt(0).toUpperCase() + className.slice(1)}'`,
        });
      }
      
      // Check method names
      const methods = classDecl.getMethods();
      
      for (const method of methods) {
        const methodName = method.getName();
        
        // Methods should be camelCase
        if (methodName.charAt(0) !== methodName.charAt(0).toLowerCase()) {
          const pos = method.getStart();
          const { line, column } = sourceFile.getLineAndColumnAtPos(pos);
          
          violations.push({
            patternId: pattern.id,
            patternName: pattern.name,
            ruleDescription: `Method names should be camelCase: '${methodName}'`,
            severity: RuleSeverity.WARNING,
            file: filePath,
            line,
            column,
            fix: `Rename to '${methodName.charAt(0).toLowerCase() + methodName.slice(1)}'`,
          });
        }
      }
    }
    
    // Check interface names
    const interfaceDeclarations = sourceFile.getInterfaces();
    
    for (const interfaceDecl of interfaceDeclarations) {
      const interfaceName = interfaceDecl.getName();
      
      // Interfaces should be PascalCase and start with 'I'
      if (!interfaceName.startsWith('I') || 
          interfaceName !== 'I' + interfaceName.charAt(1).toUpperCase() + interfaceName.slice(2)) {
        const pos = interfaceDecl.getStart();
        const { line, column } = sourceFile.getLineAndColumnAtPos(pos);
        
        violations.push({
          patternId: pattern.id,
          patternName: pattern.name,
          ruleDescription: `Interface names should be PascalCase and start with 'I': '${interfaceName}'`,
          severity: RuleSeverity.INFO,
          file: filePath,
          line,
          column,
          fix: `Rename to 'I${interfaceName.charAt(0).toUpperCase() + interfaceName.slice(1)}'`,
        });
      }
    }
    
    return violations;
  }

  /**
   * Validate service pattern
   */
  private validateServicePattern(sourceFile: any, pattern: Pattern): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const filePath = sourceFile.getFilePath();
    
    // Check if this is a service file
    if (!filePath.includes('service') && !filePath.includes('Service')) {
      return violations;
    }
    
    const classDeclarations = sourceFile.getClasses();
    
    for (const classDecl of classDeclarations) {
      const className = classDecl.getName();
      
      if (!className || !className.endsWith('Service')) {
        continue;
      }
      
      // Check constructor parameters for dependency injection
      const constructor = classDecl.getConstructors()[0];
      
      if (!constructor) {
        const pos = classDecl.getStart();
        const { line, column } = sourceFile.getLineAndColumnAtPos(pos);
        
        violations.push({
          patternId: pattern.id,
          patternName: pattern.name,
          ruleDescription: `Service class '${className}' should have a constructor for dependency injection`,
          severity: RuleSeverity.WARNING,
          file: filePath,
          line,
          column,
          fix: `Add a constructor to inject dependencies`,
        });
        continue;
      }
      
      // Check for service responsibilities
      const methods = classDecl.getMethods();
      
      if (methods.length === 0) {
        const pos = classDecl.getStart();
        const { line, column } = sourceFile.getLineAndColumnAtPos(pos);
        
        violations.push({
          patternId: pattern.id,
          patternName: pattern.name,
          ruleDescription: `Service class '${className}' has no methods`,
          severity: RuleSeverity.INFO,
          file: filePath,
          line,
          column,
          fix: `Add methods to implement the service's responsibilities`,
        });
      }
    }
    
    return violations;
  }

  /**
   * Validate repository pattern
   */
  private validateRepositoryPattern(sourceFile: any, pattern: Pattern): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const filePath = sourceFile.getFilePath();
    
    // Check if this is a repository file
    if (!filePath.includes('repository') && !filePath.includes('Repository')) {
      return violations;
    }
    
    const classDeclarations = sourceFile.getClasses();
    
    for (const classDecl of classDeclarations) {
      const className = classDecl.getName();
      
      if (!className || !className.endsWith('Repository')) {
        continue;
      }
      
      // Check repository methods
      const methods = classDecl.getMethods();
      const foundMethods = {
        find: false,
        findById: false,
        save: false,
        delete: false,
      };
      
      for (const method of methods) {
        const methodName = method.getName();
        
        if (methodName.startsWith('find')) foundMethods.find = true;
        if (methodName === 'findById') foundMethods.findById = true;
        if (methodName === 'save') foundMethods.save = true;
        if (methodName === 'delete') foundMethods.delete = true;
      }
      
      const missingMethods = Object.entries(foundMethods)
        .filter(([_, found]) => !found)
        .map(([method]) => method);
      
      if (missingMethods.length > 0) {
        const pos = classDecl.getStart();
        const { line, column } = sourceFile.getLineAndColumnAtPos(pos);
        
        violations.push({
          patternId: pattern.id,
          patternName: pattern.name,
          ruleDescription: `Repository class '${className}' is missing standard methods: ${missingMethods.join(', ')}`,
          severity: RuleSeverity.INFO,
          file: filePath,
          line,
          column,
          fix: `Implement the missing methods: ${missingMethods.join(', ')}`,
        });
      }
    }
    
    return violations;
  }
}
