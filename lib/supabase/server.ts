/**
 * SDD-08: Supabase Server Client
 *
 * Server-side Supabase client with cookie-based session management
 * for Next.js 16 App Router.
 */

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function setCookieSafe(cookieStore: CookieStore, cookie: { name: string; value: string; options?: any }) {
  const storeAny = cookieStore as any;
  const { name, value, options } = cookie;

  // Next.js cookies().set has changed signatures across versions/runtime contexts.
  // Prefer the object form, but fall back to (name, value, options).
  try {
    storeAny.set({ name, value, ...(options || {}) });
  } catch {
    storeAny.set(name, value, options);
  }
}

function createSupabaseClientWithCookieStore(cookieStore: CookieStore, suppressSetErrors: boolean) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          if (suppressSetErrors) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                setCookieSafe(cookieStore, { name, value, options });
              });
            } catch {
              // no-op
            }
            return;
          }

          cookiesToSet.forEach(({ name, value, options }) => {
            setCookieSafe(cookieStore, { name, value, options });
          });
        },
      },
    }
  );
}

/**
 * Create Supabase client for server components and server actions
 * Uses Next.js cookies() for session management
 *
 * Note: In Next.js 16+, cookies() returns a Promise
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createSupabaseClientWithCookieStore(cookieStore, true);
}

/**
 * Create Supabase client for server actions where cookies must be persisted.
 */
export async function createSupabaseServerActionClient() {
  const cookieStore = await cookies();
  return createSupabaseClientWithCookieStore(cookieStore, false);
}
