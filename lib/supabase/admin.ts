import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

function getAdminClientConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return { url, serviceRoleKey };
}

export function createSupabaseAdminClientOptional() {
  const { url, serviceRoleKey } = getAdminClientConfig();
  if (!url || !serviceRoleKey) return null;

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createSupabaseAdminClient() {
  const { url, serviceRoleKey } = getAdminClientConfig();

  if (!url) {
    throw new Error('ADMIN_CLIENT_CONFIG_MISSING:NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!serviceRoleKey) {
    throw new Error('ADMIN_CLIENT_CONFIG_MISSING:SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

