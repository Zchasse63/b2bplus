#!/usr/bin/env tsx
/**
 * Apply database migration using Supabase client
 * This script reads a migration file and applies it to the database
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load credentials from environment variables for security
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  if (!SUPABASE_URL) console.error('   - SUPABASE_URL');
  if (!SUPABASE_SERVICE_ROLE_KEY) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease set these environment variables before running this script.');
  process.exit(1);
}

async function applyMigration(migrationPath: string) {
  console.log(`📦 Applying migration: ${migrationPath}`);
  
  // Create Supabase client with service role key (bypasses RLS)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Read migration file
  const migrationSQL = readFileSync(migrationPath, 'utf-8');
  
  console.log(`📄 Migration file size: ${migrationSQL.length} characters`);
  
  // Split migration into individual statements
  // We need to execute them one by one because Supabase client doesn't support multi-statement queries
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`🔧 Found ${statements.length} SQL statements to execute`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    
    // Skip comments and empty statements
    if (statement.trim().startsWith('--') || statement.trim() === ';') {
      continue;
    }

    try {
      console.log(`\n[${i + 1}/${statements.length}] Executing statement...`);
      console.log(`Statement preview: ${statement.substring(0, 100)}...`);
      
      const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Exception executing statement ${i + 1}:`, err);
      errorCount++;
    }
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log(`   📝 Total: ${statements.length}`);

  if (errorCount === 0) {
    console.log(`\n🎉 Migration applied successfully!`);
    return true;
  } else {
    console.log(`\n⚠️  Migration completed with errors`);
    return false;
  }
}

// Get migration file path from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ Please provide a migration file path');
  console.error('Usage: tsx scripts/apply-migration.ts <migration-file-path>');
  process.exit(1);
}

const migrationPath = join(process.cwd(), migrationFile);

applyMigration(migrationPath)
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });

