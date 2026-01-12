// ==================================================================
// Supabase Client Configuration
// ==================================================================

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.\n' +
    'Required: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

// Create Supabase client with TypeScript type safety
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Helper function to check connection
export async function testConnection() {
  try {
    const { data, error } = await supabase.from('tee_times').select('count').single();
    if (error) throw error;
    return { success: true, message: 'Supabase connection successful' };
  } catch (error) {
    return { success: false, message: `Connection failed: ${error}` };
  }
}
