import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = 'https://ksprdklquoskvjqsicvv.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function updatePassword() {
  try {
    // Update the user's password
    const { data, error } = await supabase.auth.admin.updateUserById(
      '4ffd00c8-5dfd-4bea-a585-09b556f39eca',
      { password: 'customer123' }
    );
    
    if (error) {
      console.error('Error updating password:', error);
      process.exit(1);
    }
    
    console.log('✅ Successfully updated customer password to customer123');
    console.log('User:', data.user.email);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

updatePassword();

