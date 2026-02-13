#!/usr/bin/env node
/**
 * Reset Supabase Auth password for an existing user (admin bootstrap helper).
 *
 * Usage:
 *   node scripts/reset-admin-password.mjs --email superadmin@tugol.dev --password 'NewPass123!'
 *
 * Notes:
 * - Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (loaded from .env.local).
 * - Updates Auth user password and (optionally) ensures public.users has admin flags.
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
}

const emailRaw = getArgValue('--email');
const password = getArgValue('--password');

if (!emailRaw || !password) {
  console.error('Usage: node scripts/reset-admin-password.mjs --email <email> --password <password>');
  process.exit(1);
}

const email = emailRaw.trim().toLowerCase();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (check .env.local)');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findAuthUserByEmail(targetEmail) {
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((u) => (u.email || '').toLowerCase() === targetEmail);
    if (match) return match;
    if (data.users.length < perPage) return null;
    page += 1;
    if (page > 50) return null;
  }
}

async function main() {
  const authUser = await findAuthUserByEmail(email);
  if (!authUser) {
    console.error(`Auth user not found for email: ${email}`);
    process.exit(1);
  }

  const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
    password,
    email_confirm: true,
  });
  if (updateError) throw updateError;

  // Keep public.users in sync for admin access checks.
  const { error: upsertError } = await supabase
    .from('users')
    .upsert(
      {
        id: authUser.id,
        email,
        is_admin: true,
        is_super_admin: true,
      },
      { onConflict: 'id' }
    );
  if (upsertError) {
    // This should not fail, but don't hide the password reset result if it does.
    console.error('[WARN] public.users upsert failed:', upsertError.message);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        email,
        user_id: updated?.user?.id || authUser.id,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error('ERROR:', err?.message || err);
  process.exit(1);
});

