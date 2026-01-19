import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyTriggerFix() {
  console.log('Applying trigger fix migration...\n');

  // Read the migration SQL
  const migrationPath = resolve(process.cwd(), '../../supabase/migrations/20260118000001_debug_handle_new_user.sql');
  console.log('Migration path:', migrationPath);

  try {
    const sql = readFileSync(migrationPath, 'utf8');
    console.log('SQL loaded, length:', sql.length);

    // The Supabase JS client doesn't have a direct SQL execution method
    // We need to use the REST API directly with the service role key

    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.log('REST API failed:', response.status, text);

      // Alternative: Try using Supabase SQL endpoint
      console.log('\nTrying alternative approach...');

      // Supabase doesn't expose raw SQL execution via REST API
      // You need to either:
      // 1. Use Supabase CLI: supabase db push
      // 2. Use Supabase Dashboard SQL Editor
      // 3. Connect directly to the database via psql

      console.log('\n--- Manual Steps Required ---');
      console.log('The trigger fix cannot be applied programmatically.');
      console.log('Please apply this SQL in the Supabase Dashboard:');
      console.log('\n1. Go to: https://supabase.com/dashboard/project/ksprdklquoskvjqsicvv');
      console.log('2. Navigate to: SQL Editor');
      console.log('3. Paste and run the following SQL:\n');
      console.log('---BEGIN SQL---');
      console.log(sql);
      console.log('---END SQL---');
    } else {
      console.log('Migration applied successfully!');
    }

  } catch (err) {
    console.error('Error:', err.message);
  }
}

applyTriggerFix().catch(console.error);
