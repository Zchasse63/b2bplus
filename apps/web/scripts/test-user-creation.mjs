import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testUserCreation() {
  console.log('Testing user creation...');
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 40) + '...');

  try {
    const email = `test-${Date.now()}@example.com`;
    console.log('Creating user:', email);

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    if (error) {
      console.error('Error:', error.message);
      console.error('Status:', error.status);
      console.error('Full error:', JSON.stringify(error, null, 2));
    } else {
      console.log('Success! User created:', data.user?.id);
      // Clean up
      await supabase.auth.admin.deleteUser(data.user.id);
      console.log('User cleaned up');
    }
  } catch (e) {
    console.error('Exception:', e.message);
    console.error('Stack:', e.stack);
  }
}

testUserCreation();
