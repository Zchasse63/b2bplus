#!/usr/bin/env ts-node

/**
 * Migrate Horizon UI imports to B2B components
 * 
 * This script helps migrate files from Horizon UI to the new B2B design system.
 * It provides a dry-run mode to preview changes before applying them.
 * 
 * Usage:
 *   pnpm tsx scripts/migrate-to-b2b.ts --dry-run  # Preview changes
 *   pnpm tsx scripts/migrate-to-b2b.ts            # Apply changes
 */

import * as fs from 'fs';
import * as path from 'path';

// Component mapping: Horizon -> B2B
const COMPONENT_MAPPING: Record<string, string> = {
  // Direct mappings
  'Button': 'Button',
  'Card': 'Card',
  'Input': 'Input',
  'Badge': 'Badge',
  'Avatar': 'Avatar',
  
  // Components that need manual migration
  'DataTable': '// TODO: Migrate to custom DataTable',
  'Modal': '// TODO: Migrate to custom Modal',
  'SidebarHorizon': '// TODO: Keep sidebar structure, update styling',
  'StatCard': '// TODO: Migrate to custom StatCard',
  'StatusBadge': 'Badge',
  'GradientHeader': '// TODO: Remove gradient, use Card',
};

interface MigrationResult {
  file: string;
  originalContent: string;
  newContent: string;
  changed: boolean;
}

function migrateImports(content: string): string {
  let newContent = content;
  
  // Pattern 1: Named imports from horizon
  // import { Button, Card } from '@/components/horizon/...'
  const namedImportPattern = /import\s+{([^}]+)}\s+from\s+['"]@\/components\/horizon\/[^'"]+['"]/g;
  
  newContent = newContent.replace(namedImportPattern, (match, imports) => {
    const importList = imports.split(',').map((i: string) => i.trim());
    const b2bImports: string[] = [];
    const todoComments: string[] = [];
    
    importList.forEach((imp: string) => {
      const componentName = imp.split(' as ')[0].trim();
      const mapping = COMPONENT_MAPPING[componentName];
      
      if (mapping && !mapping.startsWith('//')) {
        b2bImports.push(imp);
      } else if (mapping) {
        todoComments.push(mapping);
      }
    });
    
    let result = '';
    if (b2bImports.length > 0) {
      result += `import { ${b2bImports.join(', ')} } from '@/components/b2b'`;
    }
    if (todoComments.length > 0) {
      result += '\n' + todoComments.join('\n');
    }
    
    return result || match;
  });
  
  // Pattern 2: Default imports from horizon
  // import Button from '@/components/horizon/button/Button'
  const defaultImportPattern = /import\s+(\w+)\s+from\s+['"]@\/components\/horizon\/[^'"]+['"]/g;
  
  newContent = newContent.replace(defaultImportPattern, (match, componentName) => {
    const mapping = COMPONENT_MAPPING[componentName];
    
    if (mapping && !mapping.startsWith('//')) {
      return `import { ${componentName} } from '@/components/b2b'`;
    } else if (mapping) {
      return `${mapping}\n${match}`;
    }
    
    return match;
  });
  
  return newContent;
}

function migrateFile(filePath: string, dryRun: boolean): MigrationResult {
  const originalContent = fs.readFileSync(filePath, 'utf-8');
  const newContent = migrateImports(originalContent);
  const changed = originalContent !== newContent;
  
  if (changed && !dryRun) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
  }
  
  return {
    file: filePath,
    originalContent,
    newContent,
    changed,
  };
}

function findTsxFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== 'dist') {
        findTsxFiles(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  console.log('🚀 Horizon UI → B2B Migration Tool\n');
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (preview only)' : '✏️  APPLY CHANGES'}\n`);
  console.log('═'.repeat(60));
  
  const appDir = path.join(process.cwd(), 'app');
  const componentsDir = path.join(process.cwd(), 'components');
  
  const files = [
    ...findTsxFiles(appDir),
    ...findTsxFiles(componentsDir),
  ].filter(file => {
    const content = fs.readFileSync(file, 'utf-8');
    return content.includes('@/components/horizon');
  });
  
  console.log(`\n📁 Found ${files.length} files with Horizon imports\n`);
  
  const results: MigrationResult[] = [];
  let changedCount = 0;
  
  files.forEach(file => {
    const result = migrateFile(file, dryRun);
    results.push(result);
    
    if (result.changed) {
      changedCount++;
      const relativePath = path.relative(process.cwd(), file);
      console.log(`${dryRun ? '📝' : '✅'} ${relativePath}`);
    }
  });
  
  console.log('\n═'.repeat(60));
  console.log(`\n📊 Summary:`);
  console.log(`   Total files scanned: ${files.length}`);
  console.log(`   Files ${dryRun ? 'to be changed' : 'changed'}: ${changedCount}`);
  console.log(`   Files unchanged: ${files.length - changedCount}`);
  
  if (dryRun) {
    console.log('\n💡 Run without --dry-run to apply changes\n');
  } else {
    console.log('\n✅ Migration complete!\n');
    console.log('⚠️  Next steps:');
    console.log('   1. Review files with TODO comments');
    console.log('   2. Manually migrate complex components (DataTable, Modal, etc.)');
    console.log('   3. Test the application');
    console.log('   4. Remove /components/horizon folder\n');
  }
}

main();

