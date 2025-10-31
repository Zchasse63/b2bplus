#!/usr/bin/env node

/**
 * Database Seeding Script
 * 
 * This script populates the B2B+ database with comprehensive test data
 * by executing SQL files directly through Supabase.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Get Supabase credentials
const SUPABASE_URL = 'https://ksprdklquoskvjqsicvv.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY environment variable is required');
  console.error('Usage: SUPABASE_KEY=your_key node scripts/seed-database.js');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSQLStatements(sql) {
  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const statement of statements) {
    if (!statement || statement.length < 10) continue;
    
    try {
      const { error } = await supabase.rpc('exec', { query: statement + ';' });
      
      if (error) {
        // Try alternative method - direct query
        const { error: queryError } = await supabase.from('_exec').select(statement);
        if (queryError) {
          console.error('Statement error:', queryError.message.substring(0, 100));
          errorCount++;
        } else {
          successCount++;
        }
      } else {
        successCount++;
      }
    } catch (err) {
      console.error('Execution error:', err.message.substring(0, 100));
      errorCount++;
    }
  }
  
  return { successCount, errorCount };
}

async function seedFromFile(filePath) {
  console.log(`\nProcessing: ${path.basename(filePath)}`);
  
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠ File not found: ${filePath}`);
    return { success: false };
  }
  
  try {
    const sql = fs.readFileSync(filePath, 'utf-8');
    const result = await executeSQLStatements(sql);
    
    console.log(`✓ Executed ${result.successCount} statements, ${result.errorCount} errors`);
    return { success: result.errorCount === 0, ...result };
  } catch (error) {
    console.error(`✗ Failed: ${error.message}`);
    return { success: false, error };
  }
}

async function verifySeeding() {
  console.log('\n' + '='.repeat(60));
  console.log('VERIFICATION');
  console.log('='.repeat(60));
  
  const tables = [
    'organizations',
    'profiles',
    'products',
    'orders',
    'order_items',
    'cart_items',
    'pricing_tiers',
    'promotional_codes',
    'campaigns',
    'order_templates'
  ];
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`${table.padEnd(25)}: Error - ${error.message}`);
      } else {
        console.log(`${table.padEnd(25)}: ${count} rows`);
      }
    } catch (error) {
      console.log(`${table.padEnd(25)}: Error`);
    }
  }
  
  console.log('='.repeat(60));
}

async function main() {
  console.log('='.repeat(60));
  console.log('B2B+ DATABASE SEEDING');
  console.log('='.repeat(60));
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Using service key: ${SUPABASE_SERVICE_KEY.substring(0, 20)}...`);
  
  const scriptsDir = __dirname;
  
  const seedFiles = [
    path.join(scriptsDir, '..', 'seed_organizations.sql'),
    path.join(scriptsDir, '..', 'seed_members_addresses.sql'),
    path.join(scriptsDir, '..', 'seed_products.sql'),
    path.join(scriptsDir, '..', 'seed_pricing.sql'),
    path.join(scriptsDir, '..', 'seed_promotional_codes.sql'),
    path.join(scriptsDir, '..', 'seed_orders.sql'),
    path.join(scriptsDir, '..', 'seed_carts_templates.sql'),
    path.join(scriptsDir, '..', 'seed_containers_campaigns.sql'),
    path.join(scriptsDir, '..', 'seed_notifications.sql'),
    path.join(scriptsDir, '..', 'seed_final.sql')
  ];
  
  let totalSuccess = 0;
  let totalFailed = 0;
  
  for (const file of seedFiles) {
    const result = await seedFromFile(file);
    if (result.success) {
      totalSuccess++;
    } else {
      totalFailed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('SEEDING SUMMARY');
  console.log('='.repeat(60));
  console.log(`✓ Successful files: ${totalSuccess}`);
  console.log(`✗ Failed files: ${totalFailed}`);
  console.log('='.repeat(60));
  
  // Verify the results
  await verifySeeding();
  
  console.log('\n✓ Seeding process completed');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n✗ Seeding failed:', error);
    process.exit(1);
  });
