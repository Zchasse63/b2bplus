#!/usr/bin/env ts-node

/**
 * Database Seeding Script
 * 
 * This script populates the B2B+ database with comprehensive test data
 * using the Supabase client for reliable execution.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Get Supabase credentials from environment or command line
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ksprdklquoskvjqsicvv.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSQLFile(filePath: string): Promise<void> {
  console.log(`\nExecuting SQL file: ${path.basename(filePath)}`);
  
  try {
    const sql = fs.readFileSync(filePath, 'utf-8');
    
    // Execute the SQL using Supabase RPC
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error(`Error executing ${path.basename(filePath)}:`, error.message);
      throw error;
    }
    
    console.log(`✓ Successfully executed ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`Failed to execute ${path.basename(filePath)}:`, error);
    throw error;
  }
}

async function seedDatabase() {
  console.log('='.repeat(60));
  console.log('B2B+ DATABASE SEEDING');
  console.log('='.repeat(60));
  
  const scriptsDir = path.join(__dirname, '..');
  
  const seedFiles = [
    'seed_organizations.sql',
    'seed_members_addresses.sql',
    'seed_products.sql',
    'seed_pricing.sql',
    'seed_promotional_codes.sql',
    'seed_orders.sql',
    'seed_carts_templates.sql',
    'seed_containers_campaigns.sql',
    'seed_notifications.sql',
    'seed_final.sql'
  ];
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const file of seedFiles) {
    const filePath = path.join(scriptsDir, file);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠ Skipping ${file} - file not found`);
      continue;
    }
    
    try {
      await executeSQLFile(filePath);
      successCount++;
    } catch (error) {
      errorCount++;
      console.error(`✗ Failed to execute ${file}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('SEEDING SUMMARY');
  console.log('='.repeat(60));
  console.log(`✓ Successful: ${successCount}`);
  console.log(`✗ Failed: ${errorCount}`);
  console.log('='.repeat(60));
  
  // Verify data counts
  await verifySeeding();
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
    'order_templates',
    'container_sessions',
    'approval_workflows',
    'audit_logs'
  ];
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`${table}: Error - ${error.message}`);
      } else {
        console.log(`${table}: ${count} rows`);
      }
    } catch (error) {
      console.log(`${table}: Error checking count`);
    }
  }
  
  console.log('='.repeat(60));
}

// Run the seeding
seedDatabase()
  .then(() => {
    console.log('\n✓ Database seeding completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Database seeding failed:', error);
    process.exit(1);
  });
