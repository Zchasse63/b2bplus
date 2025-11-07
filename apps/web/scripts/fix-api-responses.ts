#!/usr/bin/env tsx

/**
 * Script to standardize API responses across all route handlers
 *
 * This script:
 * 1. Adds api-response utility imports to API routes
 * 2. Replaces NextResponse.json error responses with apiError()
 * 3. Replaces NextResponse.json success responses with apiSuccess()
 * 4. Adds proper error context to all error handlers
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface FileChange {
  file: string;
  changes: string[];
}

const changes: FileChange[] = [];

async function processApiRoute(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  let modified = content;
  const fileChanges: string[] = [];

  // Skip if already using api-response utilities
  if (content.includes("from '@/lib/api-response'")) {
    return;
  }

  // Add imports if not present
  if (!modified.includes('apiSuccess') && !modified.includes('apiError')) {
    // Find the last import statement
    const importRegex = /import\s+.*?from\s+['"].*?['"];?\n/g;
    const imports = modified.match(importRegex);
    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = modified.lastIndexOf(lastImport);
      const insertPosition = lastImportIndex + lastImport.length;

      modified =
        modified.slice(0, insertPosition) +
        "import { apiSuccess, apiError, apiUnauthorized, apiValidationError } from '@/lib/api-response';\n" +
        "import { logger } from '@/lib/logger';\n" +
        modified.slice(insertPosition);

      fileChanges.push('Added api-response and logger imports');
    }
  }

  // Replace common error response patterns
  const errorPatterns = [
    {
      pattern: /return\s+NextResponse\.json\(\s*{\s*error:\s*(['"]Unauthorized['"])\s*},\s*{\s*status:\s*401\s*}\s*\);?/g,
      replacement: 'return apiUnauthorized();',
      description: 'Replaced 401 unauthorized response'
    },
    {
      pattern: /return\s+NextResponse\.json\(\s*{\s*error:\s*(['"][^'"]*['"])\s*},\s*{\s*status:\s*400\s*}\s*\);?/g,
      replacement: 'return apiValidationError($1, [$1]);',
      description: 'Replaced 400 validation error'
    },
    {
      pattern: /return\s+NextResponse\.json\(\s*{\s*error:\s*(['"][^'"]*['"])\s*},\s*{\s*status:\s*500\s*}\s*\);?/g,
      replacement: 'return apiError($1, 500);',
      description: 'Replaced 500 error response'
    },
    {
      pattern: /return\s+NextResponse\.json\(\s*{\s*success:\s*true,\s*([^}]+)\s*}\s*\);?/g,
      replacement: 'return apiSuccess({ $1 });',
      description: 'Replaced success response'
    }
  ];

  for (const { pattern, replacement, description } of errorPatterns) {
    if (pattern.test(modified)) {
      modified = modified.replace(pattern, replacement);
      fileChanges.push(description);
    }
  }

  // Replace console.error with logger.error in catch blocks
  const consoleErrorRegex = /console\.error\((['"][^'"]*['"])(?:,\s*error)?\);?/g;
  if (consoleErrorRegex.test(modified)) {
    modified = modified.replace(
      consoleErrorRegex,
      "logger.error($1, { error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined });"
    );
    fileChanges.push('Enhanced error logging with context');
  }

  // Only write if changes were made
  if (modified !== content) {
    fs.writeFileSync(filePath, modified, 'utf-8');
    changes.push({ file: filePath, changes: fileChanges });
  }
}

async function main() {
  console.log('Finding API route files...');

  const apiRoutes = await glob('/home/user/b2bplus/apps/web/app/api/**/route.{ts,tsx}', {
    ignore: ['**/node_modules/**', '**/.next/**']
  });

  console.log(`Found ${apiRoutes.length} API route files\n`);

  for (const route of apiRoutes) {
    try {
      await processApiRoute(route);
    } catch (error) {
      console.error(`Error processing ${route}:`, error);
    }
  }

  // Print summary
  console.log('\n=== Summary ===');
  console.log(`Processed ${changes.length} files\n`);

  for (const { file, changes: fileChanges } of changes) {
    console.log(`\n${path.relative('/home/user/b2bplus/apps/web', file)}:`);
    for (const change of fileChanges) {
      console.log(`  - ${change}`);
    }
  }

  if (changes.length === 0) {
    console.log('No changes needed - all files already use standard API responses!');
  }
}

main().catch(console.error);
