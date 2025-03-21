/**
 * Extract database schemas from SQL files in the InstaBids documentation
 * 
 * This script scans the SQL files in the InstaBids docs/schema directory,
 * extracts table definitions, columns, relationships, and constraints,
 * and outputs a structured JSON file that can be used by the LLM Sandwich
 * Architecture for schema awareness.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { DatabaseTable, DatabaseColumn, ForeignKeyConstraint, UniqueConstraint } from '../../src/knowledge-base/types.js';

// Path to the InstaBids documentation
const INSTABIDS_DOCS_PATH = '../../docs'; // Relative to current directory
const SCHEMA_DIR = path.join(INSTABIDS_DOCS_PATH, 'schema');
const OUTPUT_DIR = path.join('../../src/knowledge-base/data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'schema.json');

// Regular expressions for parsing SQL schema files
const TABLE_REGEX = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([^\s(]+)\s*\(\s*([\s\S]*?)\);/gi;
const COLUMN_REGEX = /\s*([^\s,]+)\s+([^,(]+(?:\([^)]*\))?)\s*(?:CONSTRAINT\s+[^\s]+\s+)?([^,]*)/gi;
const PRIMARY_KEY_REGEX = /PRIMARY\s+KEY\s*\(([^)]+)\)/i;
const FOREIGN_KEY_REGEX = /FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+([^\s(]+)\s*\(([^)]+)\)(?:\s+ON\s+DELETE\s+([^\s,]+))?(?:\s+ON\s+UPDATE\s+([^\s,]+))?/gi;
const UNIQUE_REGEX = /UNIQUE\s*(?:\(([^)]+)\))?/gi;
const NOT_NULL_REGEX = /NOT\s+NULL/i;
const DEFAULT_REGEX = /DEFAULT\s+([^,\s]+)/i;
const COMMENT_REGEX = /--\s*(.*)/g;
const CONSTRAINT_REGEX = /CONSTRAINT\s+([^\s]+)\s+/i;

/**
 * Parse SQL CREATE TABLE statement to extract table definition
 */
function parseCreateTable(tableMatch: RegExpExecArray): DatabaseTable {
  const tableName = tableMatch[1].replace(/["'`]/g, '').trim();
  const tableBody = tableMatch[2];
  
  const table: DatabaseTable = {
    name: tableName,
    columns: [],
    primaryKey: '',
    foreignKeys: [],
    uniqueConstraints: [],
    otherConstraints: []
  };
  
  // Extract column definitions
  let columnMatch;
  const columnRegex = new RegExp(COLUMN_REGEX);
  while ((columnMatch = columnRegex.exec(tableBody)) !== null) {
    const columnName = columnMatch[1].replace(/["'`]/g, '').trim();
    const columnType = columnMatch[2].trim();
    const columnConstraints = columnMatch[3]?.trim() || '';
    
    const column: DatabaseColumn = {
      name: columnName,
      type: columnType,
      nullable: !NOT_NULL_REGEX.test(columnConstraints)
    };
    
    // Extract default value
    const defaultMatch = DEFAULT_REGEX.exec(columnConstraints);
    if (defaultMatch) {
      column.defaultValue = defaultMatch[1].trim();
    }
    
    table.columns.push(column);
  }
  
  // Extract primary key
  const primaryKeyMatch = PRIMARY_KEY_REGEX.exec(tableBody);
  if (primaryKeyMatch) {
    const primaryKeyColumns = primaryKeyMatch[1].split(',').map(col => col.trim().replace(/["'`]/g, ''));
    table.primaryKey = primaryKeyColumns.length === 1 ? primaryKeyColumns[0] : primaryKeyColumns;
  }
  
  // Extract foreign keys
  let foreignKeyMatch;
  const foreignKeyRegex = new RegExp(FOREIGN_KEY_REGEX);
  while ((foreignKeyMatch = foreignKeyRegex.exec(tableBody)) !== null) {
    const columns = foreignKeyMatch[1].split(',').map(col => col.trim().replace(/["'`]/g, ''));
    const referencedTable = foreignKeyMatch[2].replace(/["'`]/g, '').trim();
    const referencedColumns = foreignKeyMatch[3].split(',').map(col => col.trim().replace(/["'`]/g, ''));
    const onDelete = foreignKeyMatch[4]?.trim().toUpperCase() as ForeignKeyConstraint['onDelete'];
    const onUpdate = foreignKeyMatch[5]?.trim().toUpperCase() as ForeignKeyConstraint['onUpdate'];
    
    const foreignKey: ForeignKeyConstraint = {
      columns,
      referencedTable,
      referencedColumns
    };
    
    if (onDelete) foreignKey.onDelete = onDelete;
    if (onUpdate) foreignKey.onUpdate = onUpdate;
    
    table.foreignKeys.push(foreignKey);
  }
  
  // Extract unique constraints
  let uniqueMatch;
  const uniqueRegex = new RegExp(UNIQUE_REGEX);
  let uniqueCounter = 0;
  while ((uniqueMatch = uniqueRegex.exec(tableBody)) !== null) {
    if (!uniqueMatch[1]) continue; // Skip if no columns defined
    
    const columns = uniqueMatch[1].split(',').map(col => col.trim().replace(/["'`]/g, ''));
    
    // Try to find constraint name
    const prevText = tableBody.substring(0, uniqueMatch.index).trim();
    const lastNewline = prevText.lastIndexOf('\n');
    const lineText = prevText.substring(lastNewline + 1);
    const constraintMatch = CONSTRAINT_REGEX.exec(lineText);
    
    const uniqueConstraint: UniqueConstraint = {
      name: constraintMatch ? constraintMatch[1] : `unique_${tableName}_${uniqueCounter++}`,
      columns
    };
    
    table.uniqueConstraints.push(uniqueConstraint);
  }
  
  // Extract table comments (if any)
  const tableText = tableMatch[0];
  const commentMatches = [...tableText.matchAll(COMMENT_REGEX)];
  if (commentMatches.length > 0) {
    // Use the first comment as table description
    table.description = commentMatches[0][1].trim();
  }
  
  return table;
}

/**
 * Process a single SQL file
 */
async function processSqlFile(filePath: string): Promise<DatabaseTable[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const tables: DatabaseTable[] = [];
    
    // Extract CREATE TABLE statements
    let tableMatch;
    const tableRegex = new RegExp(TABLE_REGEX);
    while ((tableMatch = tableRegex.exec(content)) !== null) {
      const table = parseCreateTable(tableMatch);
      tables.push(table);
    }
    
    return tables;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return [];
  }
}

/**
 * Main function to process all SQL files
 */
async function extractSchemas() {
  try {
    // Ensure output directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    // Get list of SQL files
    const files = await fs.readdir(SCHEMA_DIR);
    const sqlFiles = files.filter(file => file.endsWith('.sql'));
    
    console.log(`Found ${sqlFiles.length} SQL files in ${SCHEMA_DIR}`);
    
    // Process each SQL file
    const allTables: Record<string, DatabaseTable> = {};
    for (const file of sqlFiles) {
      console.log(`Processing ${file}...`);
      const filePath = path.join(SCHEMA_DIR, file);
      const tables = await processSqlFile(filePath);
      
      // Add tables to collection
      for (const table of tables) {
        allTables[table.name] = table;
      }
    }
    
    // Write output
    await fs.writeFile(
      OUTPUT_FILE, 
      JSON.stringify({ tables: allTables }, null, 2)
    );
    
    console.log(`Schema extraction complete! Output written to ${OUTPUT_FILE}`);
    console.log(`Extracted ${Object.keys(allTables).length} tables`);
    
  } catch (error) {
    console.error('Error extracting schemas:', error);
  }
}

// Run the extraction
extractSchemas();
