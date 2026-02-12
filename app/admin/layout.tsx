/**
 * SDD-08: Admin Layout - Server Component
 *
 * Server-side authentication and authorization check for all /admin routes
 *
 * **DEMO MODE**:
 * When NEXT_PUBLIC_DEMO_MODE=true, all auth checks are bypassed.
 * ⚠️ WARNING: NEVER enable DEMO_MODE in production!
 */

import { notFound, redirect } from 'next/navigation';
import { getCurrentUserWithRoles } from '@/lib/auth/getCurrentUserWithRoles';
import AdminLayoutClient from '@/components/admin/AdminLayoutClient';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ============================================================================
  // DEMO MODE: Bypass all authentication and authorization checks
  // ============================================================================
  const DEMO_MODE =
    process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  if (DEMO_MODE) {
    console.log('[DEMO MODE] Admin layout - bypassing all auth checks');

    // Try to get demo user from getCurrentUserWithRoles (uses DEMO_USER_EMAIL)
    const user = await getCurrentUserWithRoles();

    // If demo user exists, use it. Otherwise create a fallback mock user
    const demoUser = user || {
      id: 'demo-user-fallback',
      email: 'demo@tugol.dev',
      name: 'Demo User',
      isSuperAdmin: true,
      isAdmin: true,
      isClubAdmin: true,
      isSuspended: false,
      clubIds: [1],
      rawUser: null
    };

    return (
      <AdminLayoutClient user={demoUser}>
        {children}
      </AdminLayoutClient>
    );
  }

  // ============================================================================
  // PRODUCTION MODE: Normal auth checks
  // ============================================================================

  // Server-side auth check
  const user = await getCurrentUserWithRoles();

  // Not authenticated
  if (!user) {
    redirect('/login?redirect=/admin');
  }

  // Not an admin
  if (!user.isSuperAdmin && !user.isAdmin && !user.isClubAdmin) {
    redirect('/forbidden');
  }

  // User is suspended
  if (user.isSuspended) {
    redirect('/suspended');
  }

  return (
    <AdminLayoutClient user={user}>
      {children}
    </AdminLayoutClient>
  );
}
