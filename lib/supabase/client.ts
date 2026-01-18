/**
 * SDD-08: Supabase Client Component Client
 *
 * Client-side Supabase client for use in React client components
 */

import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database';

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Get or create Supabase client for client components
 * Singleton pattern to ensure single instance
 */
export function createClientSupabaseClient() {
  if (client) {
    return client;
  }

  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return client;
}

/**
 * Convenience export for direct usage
 */
export const supabaseClient = createClientSupabaseClient();
