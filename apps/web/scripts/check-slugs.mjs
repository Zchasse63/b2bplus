import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSlugs() {
  console.log('Checking organization slugs...\n');

  // Get all organizations
  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching organizations:', error.message);
    return;
  }

  console.log('Recent organizations:');
  for (const org of orgs) {
    console.log(`  - ${org.slug} (${org.name})`);
  }

  // Check what slug would be generated for a test user
  const testEmail = 'test-1234567890@example.com';
  const expectedSlug = testEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-s-organization';
  console.log(`\nExpected slug for '${testEmail}': ${expectedSlug}`);

  // Check if that slug pattern exists
  const { data: existing } = await supabase
    .from('organizations')
    .select('slug')
    .ilike('slug', 'test-%');

  console.log('\nExisting test-* slugs:', existing?.length || 0);
  if (existing?.length > 0) {
    existing.forEach(o => console.log(`  - ${o.slug}`));
  }
}

checkSlugs().catch(console.error);
