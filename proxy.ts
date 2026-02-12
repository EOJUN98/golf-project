/**
 * SDD-08: Next.js Proxy (formerly Middleware) - Auth & Route Protection
 *
 * Protects /admin routes and manages Supabase session refresh
 *
 * **DEMO MODE**:
 * When NEXT_PUBLIC_DEMO_MODE=true, ALL route protection is bypassed.
 * This allows unrestricted access to /admin, /my, and all other routes.
 * ⚠️ WARNING: NEVER enable DEMO_MODE in production!
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
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

    // Check if user has admin access
    // Fetch user details from public.users
    const { data: userData } = await supabase
      .from('users')
      .select('id, is_super_admin, is_suspended')
      .eq('id', user.id)
      .single();

    // Check for club admin status
    const { data: clubAdmins } = await supabase
      .from('club_admins')
      .select('golf_club_id')
      .eq('user_id', user.id);

    const isSuperAdmin = userData?.is_super_admin || false;
    const isClubAdmin = (clubAdmins && clubAdmins.length > 0) || false;
    const hasAdminAccess = isSuperAdmin || isClubAdmin;

    // Not an admin - redirect to forbidden page
    if (!hasAdminAccess) {
      return NextResponse.redirect(new URL('/forbidden', request.url));
    }

    // User is suspended - block access
    if (userData?.is_suspended) {
      return NextResponse.redirect(new URL('/suspended', request.url));
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
