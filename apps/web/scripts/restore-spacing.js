#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const files = [
  'app/invoices/[id]/page.tsx',
  'app/invoices/page.tsx',
  'app/admin/customers/[id]/page.tsx',
  'app/admin/customers/analytics/page.tsx',
  'app/admin/products/page.tsx',
  'app/admin/products/analytics/page.tsx',
  'app/admin/recommendations/page.tsx',
  'app/admin/inventory/page.tsx',
  'app/admin/campaigns/page.tsx',
  'app/admin/pricing/tiers/page.tsx',
  'app/admin/analytics/page.tsx',
  'app/orders/bulk-upload/page.tsx',
  'app/orders/[id]/page.tsx',
];

function restoreSpacing(content) {
  let fixed = content;

  // Fix imports - add spaces after commas in import lists
  fixed = fixed.replace(/,([a-zA-Z])/g, ', $1');

  // Fix interface/type properties - add space after colon
  fixed = fixed.replace(/:([a-z'"\[{])/g, ': $1');
  fixed = fixed.replace(/:([A-Z])/g, ': $1');
  fixed = fixed.replace(/:(number|string|boolean|null)/g, ': $1');

  // Fix object properties - add space after colon
  fixed = fixed.replace(/([a-z_]+):([a-z_A-Z0-9'"\[])/g, '$1: $2');

  // Fix function parameters - add space after colon in type annotations
  fixed = fixed.replace(/\(([a-z_]+):([A-Z])/g, '($1: $2');

  // Fix useState/useEffect - add space before angle bracket
  fixed = fixed.replace(/useState</g, 'useState<');
  fixed = fixed.replace(/useEffect</g, 'useEffect<');

  // Fix const declarations - add space after const keyword
  fixed = fixed.replace(/const([a-z_A-Z])/g, 'const $1');

  // Fix loading states
  fixed = fixed.replace(/loading:([a-z])/g, 'loading: $1');

  // Fix semicolons - add space after semicolon in interface/type
  fixed = fixed.replace(/;([a-z_])/g, '; $1');

  return fixed;
}

console.log('🔧 Restoring spacing to broken files...\n');

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }
  
  console.log(`Processing: ${file}`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fixed = restoreSpacing(content);
    fs.writeFileSync(filePath, fixed, 'utf8');
    console.log(`✅ Fixed: ${file}`);
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
});

console.log('\n✅ Spacing restoration complete!');

