/**
 * Extract architectural patterns from the InstaBids documentation
 * 
 * This script scans the InstaBids architectural documentation to identify
 * and formalize the key patterns that need to be enforced by the LLM Sandwich
 * Architecture, with special attention to the critical ID relationship pattern.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ArchitecturalPattern, PatternRule, IDRelationshipPattern } from '../../src/knowledge-base/types.js';

// Path to the InstaBids documentation
const INSTABIDS_DOCS_PATH = '../../docs'; // Relative to current directory
const ADR_DIR = path.join(INSTABIDS_DOCS_PATH, 'adr');
const ARCHITECTURE_DIR = path.join(INSTABIDS_DOCS_PATH, 'architecture');
const ERD_DIR = path.join(INSTABIDS_DOCS_PATH, 'erd');
const OUTPUT_DIR = path.join('../../src/knowledge-base/data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'patterns.json');

// Pattern detection regexes and keywords
const ID_RELATIONSHIP_KEYWORDS = [
  'auth.id',
  'profile.id',
  'user id relationship',
  'auth-profile relationship'
];

const PATTERN_MARKERS = [
  'PATTERN:',
  'Pattern:',
  'pattern:',
  'Key Pattern:',
  'Architectural Pattern:'
];

/**
 * Process an Architecture Decision Record (ADR) file to extract patterns
 */
async function processAdrFile(filePath: string): Promise<ArchitecturalPattern[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const patterns: ArchitecturalPattern[] = [];
  
  // Extract basic file metadata
  const filename = path.basename(filePath);
  const filenameParts = filename.split('_');
  const adrNumber = filenameParts[0]?.replace('adr', '').replace('.md', '');
  const title = content.split('\n')[0]?.replace('#', '').trim() || filenameParts.slice(1).join(' ').replace('.md', '');
  
  // Look for pattern sections
  for (const marker of PATTERN_MARKERS) {
    const patternSections = content.split(marker);
    
    // Skip the first section (before the marker)
    for (let i = 1; i < patternSections.length; i++) {
      const section = patternSections[i];
      const endOfPattern = section.indexOf('\n#');
      const patternText = endOfPattern > 0 ? section.substring(0, endOfPattern) : section;
      
      // Extract pattern name (first line)
      const lines = patternText.split('\n');
      const patternName = lines[0].trim();
      const patternDescription = lines.slice(1, 3).join('\n').trim();
      
      // Check if it's a pattern
      if (patternName && patternDescription) {
        // Determine pattern importance
        let importance: ArchitecturalPattern['importance'] = 'MEDIUM';
        if (patternText.toLowerCase().includes('critical')) importance = 'CRITICAL';
        else if (patternText.toLowerCase().includes('high')) importance = 'HIGH';
        else if (patternText.toLowerCase().includes('low')) importance = 'LOW';
        
        // Extract pattern rules
        const rules: PatternRule[] = [];
        let currentRule = '';
        let ruleType: PatternRule['type'] = 'OTHER';
        
        // Look for rule sections
        for (let j = 3; j < lines.length; j++) {
          const line = lines[j].trim();
          
          // Detect rule type
          if (line.match(/validat(e|ion)/i)) ruleType = 'VALIDATION';
          else if (line.match(/relation(ship)?/i)) ruleType = 'RELATIONSHIP';
          else if (line.match(/secur(e|ity)/i)) ruleType = 'SECURITY';
          else if (line.match(/workflow/i)) ruleType = 'WORKFLOW';
          
          if (line && line.match(/^[-*•]/) && currentRule) {
            // New bullet point means new rule
            rules.push({
              type: ruleType,
              description: currentRule
            });
            currentRule = line.replace(/^[-*•]/, '').trim();
          } else if (line) {
            // Continue current rule
            currentRule += currentRule ? ' ' + line : line;
          }
        }
        
        // Add the last rule if exists
        if (currentRule) {
          rules.push({
            type: ruleType,
            description: currentRule
          });
        }
        
        // Check if this is an ID relationship pattern
        const isIdRelationship = ID_RELATIONSHIP_KEYWORDS.some(keyword => 
          patternText.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (isIdRelationship) {
          // Extract profile table
          const profileTableMatch = patternText.match(/table\s+['"]?(\w+)['"]?/i);
          const entityMatch = patternText.match(/(?:for|entity)\s+['"]?(\w+)['"]?/i);
          
          const idPattern: IDRelationshipPattern = {
            name: patternName,
            description: patternDescription,
            pattern: rules,
            examples: [],
            importance: 'CRITICAL', // ID relationship is always critical
            domains: ['user_management', 'auth'],
            entityType: entityMatch?.[1] || '',
            profileTable: profileTableMatch?.[1] || 'profiles',
            primaryIdSource: 'AUTH'
          };
          
          // Extract examples
          idPattern.examples = extractExamples(patternText);
          
          patterns.push(idPattern);
        } else {
          // Regular pattern
          const pattern: ArchitecturalPattern = {
            name: patternName,
            description: patternDescription,
            pattern: rules,
            examples: extractExamples(patternText),
            importance,
            domains: extractDomains(patternText)
          };
          
          patterns.push(pattern);
        }
      }
    }
  }
  
  // Check for ID relationship pattern mentioned in context without marker
  if (patterns.length === 0 && ID_RELATIONSHIP_KEYWORDS.some(keyword => content.includes(keyword))) {
    // Construct a basic ID relationship pattern if none found but keywords present
    const idPattern: IDRelationshipPattern = {
      name: 'ID Relationship Pattern',
      description: 'The critical pattern ensuring that user authentication IDs align with profile IDs',
      pattern: [{
        type: 'RELATIONSHIP',
        description: 'Every profile.id must correspond to an auth.id'
      }],
      examples: [],
      importance: 'CRITICAL',
      domains: ['user_management', 'auth'],
      entityType: 'user',
      profileTable: 'profiles',
      primaryIdSource: 'AUTH'
    };
    
    patterns.push(idPattern);
  }
  
  return patterns;
}

/**
 * Extract code examples from pattern text
 */
function extractExamples(text: string): string[] {
  const examples: string[] = [];
  const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)\n```/g;
  
  let match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    examples.push(match[1].trim());
  }
  
  return examples;
}

/**
 * Extract domains associated with the pattern
 */
function extractDomains(text: string): string[] {
  const domains = new Set<string>();
  
  // Common domain keywords to look for
  const domainKeywords = [
    'user management', 'auth', 'project management', 'bidding',
    'payment', 'messaging', 'notification', 'social', 'ai'
  ];
  
  for (const domain of domainKeywords) {
    if (text.toLowerCase().includes(domain.toLowerCase())) {
      domains.add(domain.replace(' ', '_'));
    }
  }
  
  return Array.from(domains);
}

/**
 * Process the Entity Relationship Diagrams (ERD) to identify patterns
 */
async function processErdFiles(): Promise<ArchitecturalPattern[]> {
  const patterns: ArchitecturalPattern[] = [];
  
  // Get list of ERD files
  const files = await fs.readdir(ERD_DIR);
  const erdFiles = files.filter(file => file.endsWith('.md'));
  
  for (const file of erdFiles) {
    const filePath = path.join(ERD_DIR, file);
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Skip if no ID relationship keywords are found
    if (!ID_RELATIONSHIP_KEYWORDS.some(keyword => content.includes(keyword))) {
      continue;
    }
    
    // Extract entity type from filename
    const entityMatch = file.match(/erd_(.+)\.md/);
    const entityType = entityMatch ? entityMatch[1] : '';
    
    // Check for profile table references
    const tableMatches = content.match(/(?:table|relation)\s+['"]?(\w+)['"]?/gi);
    const profileTable = tableMatches?.find(t => t.includes('profile'))?.replace(/(?:table|relation)\s+['"]?/, '').replace(/['"]?$/, '') || 'profiles';
    
    // Create ID relationship pattern
    const idPattern: IDRelationshipPattern = {
      name: `${entityType.replace('_', ' ')} ID Relationship Pattern`,
      description: `The critical pattern ensuring that ${entityType} authentication IDs align with profile IDs`,
      pattern: [{
        type: 'RELATIONSHIP',
        description: `Every ${profileTable}.id must correspond to an auth.id`
      }],
      examples: extractExamples(content),
      importance: 'CRITICAL',
      domains: [entityType, 'auth'],
      entityType,
      profileTable,
      primaryIdSource: 'AUTH'
    };
    
    patterns.push(idPattern);
  }
  
  return patterns;
}

/**
 * Process database access pattern from ADR
 */
async function processDbAccessPatternAdr(): Promise<ArchitecturalPattern[]> {
  const patterns: ArchitecturalPattern[] = [];
  
  try {
    const filePath = path.join(ADR_DIR, 'adr_03_database_access_pattern.md');
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Check if contains ID relationship pattern
    if (!ID_RELATIONSHIP_KEYWORDS.some(keyword => content.includes(keyword))) {
      return [];
    }
    
    // Extract profile table
    const profileTableMatch = content.match(/(?:table|relation)\s+['"]?(\w+)['"]?/i);
    
    // Create ID relationship pattern
    const idPattern: IDRelationshipPattern = {
      name: 'ID Relationship Database Access Pattern',
      description: 'The critical pattern ensuring that all database access respects the auth ID to profile ID relationship',
      pattern: [
        {
          type: 'RELATIONSHIP',
          description: 'Database access must validate that the requesting user has permission based on auth.id'
        },
        {
          type: 'VALIDATION',
          description: 'Profile ID must be verified before accessing related records'
        },
        {
          type: 'SECURITY',
          description: 'Never trust client-provided IDs and always verify against auth context'
        }
      ],
      examples: extractExamples(content),
      importance: 'CRITICAL',
      domains: ['user_management', 'auth', 'database'],
      entityType: 'user',
      profileTable: profileTableMatch?.[1] || 'profiles',
      primaryIdSource: 'AUTH'
    };
    
    patterns.push(idPattern);
  } catch (error) {
    // ADR file might not exist, we'll just return empty array
    return [];
  }
  
  return patterns;
}

/**
 * Main function to process all architectural documentation
 */
async function extractPatterns() {
  try {
    // Ensure output directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    // Get list of ADR files
    const adrFiles = await fs.readdir(ADR_DIR);
    const markdownFiles = adrFiles.filter(file => file.endsWith('.md'));
    
    console.log(`Found ${markdownFiles.length} ADR files in ${ADR_DIR}`);
    
    // Process each ADR file
    const allPatterns: ArchitecturalPattern[] = [];
    for (const file of markdownFiles) {
      console.log(`Processing ${file}...`);
      const filePath = path.join(ADR_DIR, file);
      const patterns = await processAdrFile(filePath);
      allPatterns.push(...patterns);
    }
    
    // Process ERD files for additional ID relationship patterns
    console.log(`Processing ERD files for patterns...`);
    const erdPatterns = await processErdFiles();
    allPatterns.push(...erdPatterns);
    
    // Process database access pattern ADR specifically for ID relationship pattern
    console.log(`Processing database access pattern ADR...`);
    const dbAccessPatterns = await processDbAccessPatternAdr();
    allPatterns.push(...dbAccessPatterns);
    
    // Deduplicate patterns by name
    const uniquePatterns: Record<string, ArchitecturalPattern> = {};
    const idRelationships: Record<string, IDRelationshipPattern> = {};
    
    for (const pattern of allPatterns) {
      // Check if it's an ID relationship pattern
      if ('profileTable' in pattern) {
        const idPattern = pattern as IDRelationshipPattern;
        const key = idPattern.entityType || 'user';
        if (!idRelationships[key] || idPattern.examples.length > idRelationships[key].examples.length) {
          idRelationships[key] = idPattern;
        }
      } else {
        // Regular pattern
        const key = pattern.name.toLowerCase().replace(/\s+/g, '_');
        if (!uniquePatterns[key] || pattern.examples.length > uniquePatterns[key].examples.length) {
          uniquePatterns[key] = pattern;
        }
      }
    }
    
    // Write output
    await fs.writeFile(
      OUTPUT_FILE, 
      JSON.stringify({
        patterns: uniquePatterns,
        idRelationships
      }, null, 2)
    );
    
    console.log(`Pattern extraction complete! Output written to ${OUTPUT_FILE}`);
    console.log(`Extracted ${Object.keys(uniquePatterns).length} patterns`);
    console.log(`Extracted ${Object.keys(idRelationships).length} ID relationship patterns`);
    
  } catch (error) {
    console.error('Error extracting patterns:', error);
  }
}

// Run the extraction
extractPatterns();
