/**
 * SDD-08: Next.js 16 Proxy - Auth & Route Protection
 *
 * Next.js 16 uses proxy.ts (replaces middleware.ts from Next.js 15).
 * Protects /admin routes and manages Supabase session refresh.
 *
 * **DEMO MODE**:
 * When NEXT_PUBLIC_DEMO_MODE=true, ALL route protection is bypassed.
 * ⚠️ WARNING: NEVER enable DEMO_MODE in production!
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function parseEmailList(value: string | undefined): Set<string> {
  if (!value) return new Set();
  return new Set(
    value
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

function resolveBootstrapRoleByEmail(email: string | undefined) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    return { isSuperAdmin: false, isAdmin: false };
  }

  const bootstrapSuperAdmins = new Set([
    'superadmin@tugol.dev',
    'backup.superadmin.20260212181546@tugol.dev',
    ...parseEmailList(process.env.SUPER_ADMIN_BOOTSTRAP_EMAILS),
  ]);
  const bootstrapAdmins = parseEmailList(process.env.ADMIN_BOOTSTRAP_EMAILS);

  const isSuperAdmin = bootstrapSuperAdmins.has(normalizedEmail);
  const isAdmin = isSuperAdmin || bootstrapAdmins.has(normalizedEmail);

  return { isSuperAdmin, isAdmin };
}

export async function proxy(request: NextRequest) {
  // ============================================================================
  // DEMO MODE: Bypass ALL authentication and authorization checks
  // ============================================================================
  const DEMO_MODE =
    process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  if (DEMO_MODE) {
    console.log('[DEMO MODE] Proxy - bypassing all auth checks for:', request.nextUrl.pathname);
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }

  // ============================================================================
  // PRODUCTION MODE: Normal auth checks
  // ============================================================================

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // In the proxy runtime, mutating request cookies is not required and can
          // throw depending on Next.js internals. Persist changes on the response.
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session if needed
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect /admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Not authenticated - redirect to login
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check if user has admin access.
    // Use tolerant lookup to handle legacy users.id mismatch.
    const { data: userDataById } = await supabase
      .from('users')
      .select('id, email, is_admin, is_super_admin')
      .eq('id', user.id)
      .maybeSingle();

    let userData = userDataById;
    if (!userData && user.email) {
      const { data: userDataByEmail } = await supabase
        .from('users')
        .select('id, email, is_admin, is_super_admin')
        .eq('email', user.email)
        .maybeSingle();
      userData = userDataByEmail;
    }

    // Check for club admin status
    const { data: clubAdmins } = await supabase
      .from('club_admins')
      .select('golf_club_id')
      .eq('user_id', userData?.id || user.id);

    const bootstrapRole = resolveBootstrapRoleByEmail(user.email);
    const isSuperAdmin = Boolean(userData?.is_super_admin || bootstrapRole.isSuperAdmin);
    const isAdmin = Boolean(userData?.is_admin || isSuperAdmin || bootstrapRole.isAdmin);
    const isClubAdmin = (clubAdmins && clubAdmins.length > 0) || false;
    const hasAdminAccess = isSuperAdmin || isAdmin || isClubAdmin;

    // Not an admin - redirect to forbidden page.
    if (!hasAdminAccess) {
      return NextResponse.redirect(new URL('/forbidden', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
