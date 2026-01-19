import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  console.log('Checking database schema...\n');

  // Get organizations columns by looking at existing data
  console.log('1. Organizations table columns:');
  const { data: orgs } = await supabase.from('organizations').select('*').limit(1);
  if (orgs && orgs.length > 0) {
    console.log('   Columns:', Object.keys(orgs[0]).join(', '));
  }

  // Get profiles columns
  console.log('\n2. Profiles table columns:');
  const { data: profiles } = await supabase.from('profiles').select('*').limit(1);
  if (profiles && profiles.length > 0) {
    console.log('   Columns:', Object.keys(profiles[0]).join(', '));
  }

  // Get organization_members columns
  console.log('\n3. Organization_members table columns:');
  const { data: members } = await supabase.from('organization_members').select('*').limit(1);
  if (members && members.length > 0) {
    console.log('   Columns:', Object.keys(members[0]).join(', '));
  }

  // Test what the trigger tries to insert
  console.log('\n--- Testing what trigger needs ---');
  console.log('\nTrigger inserts into organizations:');
  console.log('  (name, slug, type) VALUES (org_name, generated_slug, "restaurant")');

  console.log('\nTrigger inserts into organization_members:');
  console.log('  (organization_id, user_id, role) VALUES (new_org_id, NEW.id, "owner")');

  console.log('\nTrigger inserts into profiles:');
  console.log('  (id, email, full_name, current_organization_id)');
  console.log('  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>full_name, new_org_id)');

  // Check if organizations needs any additional required fields
  console.log('\n4. Testing organizations INSERT with trigger-like data...');
  const testSlug = 'test-trigger-check-' + Date.now();
  const { error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: 'Test Org',
      slug: testSlug,
      type: 'restaurant',
    })
    .select()
    .single();

  if (orgError) {
    console.log('   FAILED:', orgError.message);
    console.log('   Code:', orgError.code);
  } else {
    console.log('   SUCCESS - organizations insert works');
    // Clean up
    await supabase.from('organizations').delete().eq('slug', testSlug);
  }

  // Check if there are extra columns in organizations not covered by trigger
  if (orgs && orgs.length > 0) {
    const triggerOrg = ['id', 'name', 'slug', 'type', 'created_at', 'updated_at'];
    const actualCols = Object.keys(orgs[0]);
    const extra = actualCols.filter(c => !triggerOrg.includes(c));
    if (extra.length > 0) {
      console.log('\n5. Extra organization columns not in trigger:', extra.join(', '));
    }
  }

  // Check profiles for extra columns
  if (profiles && profiles.length > 0) {
    const triggerProfile = ['id', 'email', 'full_name', 'current_organization_id', 'created_at', 'updated_at'];
    const actualCols = Object.keys(profiles[0]);
    const extra = actualCols.filter(c => !triggerProfile.includes(c));
    if (extra.length > 0) {
      console.log('\n6. Extra profile columns not in trigger:', extra.join(', '));
      // Check if any are NOT NULL
      console.log('   (Any NOT NULL without DEFAULT would break the trigger)');
    }
  }
}

checkSchema().catch(console.error);
