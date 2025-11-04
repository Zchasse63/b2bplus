#!/usr/bin/env ts-node

/**
 * Analyze Horizon UI usage across the codebase
 * 
 * This script scans all TypeScript/TSX files and reports:
 * - Files importing Horizon components
 * - Which Horizon components are used
 * - Total count of Horizon imports
 */

import * as fs from 'fs';
import * as path from 'path';

interface HorizonUsage {
  file: string;
  imports: string[];
  lineNumber: number;
}

const HORIZON_IMPORT_PATTERN = /from\s+['"]@\/components\/horizon\/(.*?)['"]/g;
const HORIZON_COMPONENT_PATTERN = /import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]@\/components\/horizon\/(.*?)['"]/g;

function findTsxFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and .next
      if (file !== 'node_modules' && file !== '.next' && file !== 'dist') {
        findTsxFiles(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function analyzeFile(filePath: string): HorizonUsage[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const usages: HorizonUsage[] = [];
  
  lines.forEach((line, index) => {
    const matches = [...line.matchAll(HORIZON_COMPONENT_PATTERN)];
    
    matches.forEach(match => {
      const namedImports = match[1];
      const defaultImport = match[2];
      const modulePath = match[3];
      
      const imports: string[] = [];
      
      if (namedImports) {
        imports.push(...namedImports.split(',').map(i => i.trim()));
      }
      
      if (defaultImport) {
        imports.push(defaultImport);
      }
      
      if (imports.length > 0) {
        usages.push({
          file: filePath,
          imports,
          lineNumber: index + 1,
        });
      }
    });
  });
  
  return usages;
}

function main() {
  console.log('🔍 Analyzing Horizon UI usage...\n');
  
  const appDir = path.join(process.cwd(), 'app');
  const componentsDir = path.join(process.cwd(), 'components');
  
  const files = [
    ...findTsxFiles(appDir),
    ...findTsxFiles(componentsDir),
  ];
  
  console.log(`📁 Found ${files.length} TypeScript files\n`);
  
  const allUsages: HorizonUsage[] = [];
  const componentCounts: Record<string, number> = {};
  const fileSet = new Set<string>();
  
  files.forEach(file => {
    const usages = analyzeFile(file);
    if (usages.length > 0) {
      allUsages.push(...usages);
      fileSet.add(file);
      
      usages.forEach(usage => {
        usage.imports.forEach(imp => {
          componentCounts[imp] = (componentCounts[imp] || 0) + 1;
        });
      });
    }
  });
  
  console.log('📊 HORIZON UI USAGE REPORT\n');
  console.log('═'.repeat(60));
  console.log(`\n📦 Total files with Horizon imports: ${fileSet.size}`);
  console.log(`📝 Total Horizon import statements: ${allUsages.length}\n`);
  
  console.log('🎨 Most Used Horizon Components:\n');
  const sortedComponents = Object.entries(componentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  
  sortedComponents.forEach(([component, count]) => {
    console.log(`  ${component.padEnd(30)} ${count} usage(s)`);
  });
  
  console.log('\n📁 Files Using Horizon UI:\n');
  const uniqueFiles = Array.from(fileSet).sort();
  uniqueFiles.forEach(file => {
    const relativePath = path.relative(process.cwd(), file);
    const fileUsages = allUsages.filter(u => u.file === file);
    const uniqueImports = new Set(fileUsages.flatMap(u => u.imports));
    console.log(`  ${relativePath}`);
    console.log(`    Components: ${Array.from(uniqueImports).join(', ')}`);
  });
  
  console.log('\n═'.repeat(60));
  console.log('\n✅ Analysis complete!\n');
  
  // Write detailed report to file
  const reportPath = path.join(process.cwd(), 'horizon-usage-report.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        summary: {
          totalFiles: fileSet.size,
          totalImports: allUsages.length,
          uniqueComponents: Object.keys(componentCounts).length,
        },
        componentCounts,
        files: uniqueFiles.map(file => ({
          path: path.relative(process.cwd(), file),
          usages: allUsages.filter(u => u.file === file),
        })),
      },
      null,
      2
    )
  );
  
  console.log(`📄 Detailed report saved to: ${reportPath}\n`);
}

main();

