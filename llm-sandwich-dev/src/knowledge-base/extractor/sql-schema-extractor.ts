/**
 * @file SQL Schema Extractor
 * 
 * This file contains functionality to extract schema information from SQL files,
 * which is then used to inform code generation in the Development-Time LLM Sandwich Architecture.
 */

import { Schema, SchemaType, SchemaField, SchemaConstraint, ConstraintType, SchemaRelationship, RelationshipType, Cardinality } from '../types.js';
import { parseSQL } from 'pg-query-parser';
import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

/**
 * Options for SQL schema extraction
 */
export interface SQLExtractorOptions {
  /** Directories to search for SQL files */
  directories: string[];
  /** File pattern to match */
  pattern?: string;
  /** Whether to recursively search directories */
  recursive?: boolean;
  /** Whether to ignore errors */
  ignoreErrors?: boolean;
}

/**
 * Default options for SQL extraction
 */
const DEFAULT_OPTIONS: SQLExtractorOptions = {
  directories: ['.'],
  pattern: '*.sql',
  recursive: true,
  ignoreErrors: false,
};

/**
 * Extract schema information from SQL files
 */
export async function extractSQLSchemas(options: Partial<SQLExtractorOptions> = {}): Promise<Schema[]> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const schemas: Schema[] = [];
  
  // Find all SQL files matching the pattern
  const files: string[] = [];
  for (const directory of config.directories) {
    const matches = await glob(`${directory}/**/${config.pattern}`, {
      ignore: ['**/node_modules/**'],
    });
    files.push(...matches);
  }
  
  // Process each SQL file
  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      const extractedSchemas = extractSchemaFromSQL(content, path.basename(file, '.sql'));
      schemas.push(...extractedSchemas);
    } catch (error) {
      if (!config.ignoreErrors) {
        throw new Error(`Error processing SQL file ${file}: ${error}`);
      }
      console.error(`Error processing SQL file ${file}: ${error}`);
    }
  }
  
  // Process relationships
  processRelationships(schemas);
  
  return schemas;
}

/**
 * Extract schema from SQL content
 */
function extractSchemaFromSQL(sqlContent: string, defaultName: string): Schema[] {
  const parsedSQL = parseSQL(sqlContent);
  if (parsedSQL.error) {
    throw new Error(`SQL parsing error: ${parsedSQL.error}`);
  }
  
  const schemas: Schema[] = [];
  
  for (const statement of parsedSQL.parse) {
    if (statement.Statement.CreateTable) {
      const createTable = statement.Statement.CreateTable;
      const tableName = createTable.relation.relname;
      
      const schema: Schema = {
        id: `table_${tableName}`,
        name: tableName,
        type: SchemaType.TABLE,
        fields: [],
        relationships: [],
        constraints: [],
        metadata: {
          source: defaultName,
        },
      };
      
      // Process columns
      for (const column of createTable.tableElts) {
        if (column.ColumnDef) {
          const field: SchemaField = processColumn(column.ColumnDef);
          schema.fields.push(field);
        } else if (column.Constraint) {
          const constraint = processConstraint(column.Constraint);
          if (constraint) {
            schema.constraints.push(constraint);
          }
        }
      }
      
      schemas.push(schema);
    }
  }
  
  return schemas;
}

/**
 * Process a column definition
 */
function processColumn(columnDef: any): SchemaField {
  const name = columnDef.colname;
  const type = getTypeFromPgType(columnDef.typeName.names[columnDef.typeName.names.length - 1].String.str);
  let required = false;
  let isPrimaryKey = false;
  let isForeignKey = false;
  let defaultValue = undefined;
  
  // Check for NOT NULL constraint
  if (columnDef.constraints) {
    for (const constraint of columnDef.constraints) {
      if (constraint.Constraint) {
        if (constraint.Constraint.contype === 'NOT_NULL') {
          required = true;
        } else if (constraint.Constraint.contype === 'PRIMARY_KEY') {
          isPrimaryKey = true;
          required = true;
        } else if (constraint.Constraint.contype === 'FOREIGN_KEY') {
          isForeignKey = true;
        }
      }
    }
  }
  
  // Check for default value
  if (columnDef.default_value) {
    defaultValue = columnDef.default_value.toString();
  }
  
  return {
    name,
    type,
    required,
    isPrimaryKey,
    isForeignKey,
    defaultValue,
    description: '',
  };
}

/**
 * Process a constraint definition
 */
function processConstraint(constraintDef: any): SchemaConstraint | null {
  if (!constraintDef.contype) {
    return null;
  }
  
  const type = mapConstraintType(constraintDef.contype);
  const name = constraintDef.conname || `${type}_constraint`;
  const fields = constraintDef.keys ? constraintDef.keys.map((k: any) => k.String.str) : [];
  
  return {
    type,
    fields,
    name,
    expression: constraintDef.raw_expr ? constraintDef.raw_expr.toString() : undefined,
  };
}

/**
 * Map PostgreSQL constraint type to our constraint type
 */
function mapConstraintType(pgConstraintType: string): ConstraintType {
  switch (pgConstraintType) {
    case 'PRIMARY_KEY':
      return ConstraintType.PRIMARY_KEY;
    case 'UNIQUE':
      return ConstraintType.UNIQUE;
    case 'CHECK':
      return ConstraintType.CHECK;
    case 'FOREIGN_KEY':
      return ConstraintType.FOREIGN_KEY;
    case 'NOT_NULL':
      return ConstraintType.NOT_NULL;
    default:
      throw new Error(`Unknown constraint type: ${pgConstraintType}`);
  }
}

/**
 * Map PostgreSQL type to TypeScript type
 */
function getTypeFromPgType(pgType: string): string {
  const pgTypeMap: Record<string, string> = {
    'int': 'number',
    'integer': 'number',
    'smallint': 'number',
    'bigint': 'number',
    'decimal': 'number',
    'numeric': 'number',
    'real': 'number',
    'double': 'number',
    'money': 'number',
    'char': 'string',
    'varchar': 'string',
    'text': 'string',
    'uuid': 'string',
    'date': 'Date',
    'time': 'string',
    'timestamp': 'Date',
    'timestamptz': 'Date',
    'boolean': 'boolean',
    'bool': 'boolean',
    'json': 'object',
    'jsonb': 'object',
    'array': 'Array<any>',
  };
  
  return pgTypeMap[pgType.toLowerCase()] || 'any';
}

/**
 * Process relationships between schemas based on foreign key constraints
 */
function processRelationships(schemas: Schema[]): void {
  const schemaMap = new Map<string, Schema>();
  schemas.forEach(schema => schemaMap.set(schema.name, schema));
  
  // Find foreign key constraints
  for (const schema of schemas) {
    for (const constraint of schema.constraints) {
      if (constraint.type === ConstraintType.FOREIGN_KEY) {
        // Note: In a real implementation, we would extract the referenced table and column
        // but for this example, we'll just use a placeholder as the parser doesn't give us
        // the full information we need without more complex code
        
        // In a real implementation, this would be extracted from the foreign key definition
        const targetSchema = 'some_other_table';
        const targetField = 'id';
        const sourceField = constraint.fields[0] || 'unknown';
        
        const relationship: SchemaRelationship = {
          type: RelationshipType.MANY_TO_ONE,
          targetSchema,
          targetField,
          sourceField,
          required: true,
          cardinality: Cardinality.ONE,
          cascadeDelete: false,
        };
        
        schema.relationships.push(relationship);
      }
    }
  }
}
