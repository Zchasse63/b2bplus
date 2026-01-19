import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugTrigger() {
  console.log('Checking trigger setup...\n');

  // Get the function definition using direct SQL (if available)
  // Use the select method with head=true to check if org with same slug exists

  // First, let's see what existing orgs look like
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, slug, type, approval_status')
    .limit(5);

  if (orgError) {
    console.log('Error fetching orgs:', orgError.message);
  } else {
    console.log('Sample organizations:', JSON.stringify(orgs, null, 2));
  }

  // Check if there are any duplicate slugs
  console.log('\nChecking for potential slug conflicts...');

  // The trigger generates slug like:
  // lower(regexp_replace("Test's Organization", '[^a-zA-Z0-9]+', '-', 'g'))
  // = "test-s-organization"

  // If many test users are created, they'll all have email prefixes like "test-123456789"
  // which becomes "test-123456789-s-organization"
  // These should be unique...

  // Let's just try to create an org directly with the same logic the trigger uses
  const testEmail = 'test-' + Date.now() + '@example.com';
  const emailPrefix = testEmail.split('@')[0];
  const orgName = emailPrefix + "'s Organization";
  const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  console.log('\nSimulating trigger logic:');
  console.log('Email:', testEmail);
  console.log('Org name would be:', orgName);
  console.log('Slug would be:', slug);

  // Try inserting
  const { data: newOrg, error: newOrgError } = await supabase
    .from('organizations')
    .insert({
      name: orgName,
      slug: slug,
      type: 'restaurant',
    })
    .select()
    .single();

  if (newOrgError) {
    console.log('\nOrg insert FAILED:', newOrgError.message);
    console.log('Code:', newOrgError.code);
  } else {
    console.log('\nOrg insert SUCCESS!');

    // Now try to create a profile (will fail because no user)
    console.log('\nTrying profile insert (expected to fail - no user)...');
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: '00000000-0000-0000-0000-000000000001', // Fake UUID
        email: testEmail,
        current_organization_id: newOrg.id,
      });

    if (profileError) {
      console.log('Profile insert failed:', profileError.message);
      console.log('Code:', profileError.code);

      // This is the FK constraint - the trigger runs AFTER user is created
      // so the user should exist when the trigger runs
    }

    // Cleanup
    await supabase.from('organizations').delete().eq('id', newOrg.id);
    console.log('\nCleanup done');
  }
}

debugTrigger().catch(console.error);
