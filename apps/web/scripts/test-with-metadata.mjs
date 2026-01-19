import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testWithMetadata() {
  console.log('Testing user creation with full_name in metadata...\n');

  const email = `test-${Date.now()}@example.com`;

  // Test 1: With user_metadata (like the working users have)
  console.log('Test 1: Creating user WITH user_metadata.full_name...');
  const { data: data1, error: error1 } = await supabase.auth.admin.createUser({
    email,
    password: 'TestPassword123!',
    email_confirm: true,
    user_metadata: {
      full_name: 'Test User',
    },
  });

  if (error1) {
    console.log('FAILED:', error1.message);
    console.log('Status:', error1.status);
  } else {
    console.log('SUCCESS! User created:', data1.user?.id);

    // Check if profile was created
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data1.user.id)
      .single();
    console.log('Profile created:', profile ? 'YES' : 'NO');

    // Cleanup
    await supabase.auth.admin.deleteUser(data1.user.id);
    console.log('Cleaned up user');
  }

  // Test 2: Without user_metadata
  console.log('\n\nTest 2: Creating user WITHOUT user_metadata...');
  const email2 = `test2-${Date.now()}@example.com`;
  const { data: data2, error: error2 } = await supabase.auth.admin.createUser({
    email: email2,
    password: 'TestPassword123!',
    email_confirm: true,
  });

  if (error2) {
    console.log('FAILED:', error2.message);
    console.log('Status:', error2.status);
    console.log('\n⚠️  The trigger fails when user_metadata is not provided!');
  } else {
    console.log('SUCCESS! User created:', data2.user?.id);
    await supabase.auth.admin.deleteUser(data2.user.id);
    console.log('Cleaned up user');
  }
}

testWithMetadata().catch(console.error);
