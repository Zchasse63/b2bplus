import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Supabase configuration
export const SUPABASE_URL = 'https://ksprdklquoskvjqsicvv.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzcHJka2xxdW9za3ZqcXNpY3Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxOTQ3MjIsImV4cCI6MjA3NTc3MDcyMn0.aKcoqcudBUuHe4zdbxjlldwTLrSH4HQeKEtSEVV8P6w';

// Create Supabase client
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

