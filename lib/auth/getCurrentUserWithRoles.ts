/**
 * SDD-08: Auth Helper - Get Current User with Roles
 *
 * Retrieves authenticated user from session and enriches with TUGOL role information
 * from public.users and club_admins tables.
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface UserWithRoles {
  id: string;
  email: string;
  name: string | null;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isClubAdmin: boolean;
  isSuspended: boolean;
  clubIds: number[];
  rawUser: {
    email: string;
    is_super_admin: boolean;
    is_suspended: boolean;
    name: string | null;
  } | null;
}

/**
 * Get current authenticated user with full role information
 *
 * Role hierarchy:
 * - SUPER_ADMIN: users.is_super_admin = true
 * - ADMIN: (future extension point, currently same as SUPER_ADMIN)
 * - CLUB_ADMIN: has entries in club_admins table
 * - USER: authenticated but no admin privileges
 *
 * **DEMO MODE**:
 * When NEXT_PUBLIC_DEMO_MODE=true, bypasses Supabase Auth and returns
 * the user specified by NEXT_PUBLIC_DEMO_USER_EMAIL.
 * ⚠️ WARNING: NEVER enable DEMO_MODE in production!
 *
 * @returns UserWithRoles object or null if not authenticated
 */
export async function getCurrentUserWithRoles(): Promise<UserWithRoles | null> {
  try {
    const supabase = await createSupabaseServerClient();

    // ========================================
    // DEMO MODE: Force login for development
    // ========================================
    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
    const demoUserEmail = process.env.NEXT_PUBLIC_DEMO_USER_EMAIL;

    if (isDemoMode && demoUserEmail) {
      console.log('[DEMO MODE] Force-logging in user:', demoUserEmail);

      // Fetch user directly from public.users table by email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, name, is_super_admin, is_suspended, segment_type')
        .eq('email', demoUserEmail)
        .single();

      if (userError || !userData) {
        console.error('[DEMO MODE] User not found:', demoUserEmail, userError);
        return null;
      }

      // Fetch club admin associations
      const { data: clubAdmins, error: clubAdminError } = await supabase
        .from('club_admins')
        .select('golf_club_id')
        .eq('user_id', userData.id);

      if (clubAdminError) {
        console.error('[DEMO MODE] Club admin fetch error:', clubAdminError);
      }

      const clubIds = (clubAdmins || []).map((ca: any) => ca.golf_club_id);

      // Type assertion for userData
      const user = userData as {
        id: string;
        email: string;
        name: string | null;
        is_super_admin: boolean;
        is_suspended: boolean;
        segment_type?: string;
      };

      // Build role flags
      const isSuperAdmin = user.is_super_admin || false;
      const isClubAdmin = clubIds.length > 0;
      const isSuspended = user.is_suspended || false;
      const isAdmin = isSuperAdmin;

      console.log('[DEMO MODE] Logged in as:', {
        email: user.email,
        isSuperAdmin,
        isAdmin,
        isClubAdmin,
        segment: user.segment_type
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        isSuperAdmin,
        isAdmin,
        isClubAdmin,
        isSuspended,
        clubIds,
        rawUser: user
      };
    }

    // ========================================
    // PRODUCTION MODE: Normal Supabase Auth
    // ========================================

    // Get authenticated user from session
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return null;
    }

    // Fetch user details from public.users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, name, is_super_admin, is_suspended')
      .eq('id', authUser.id)
      .single();

    if (userError || !userData) {
      console.error('[getCurrentUserWithRoles] User fetch error:', userError);
      // User exists in Auth but not in public.users - create minimal response
      return {
        id: authUser.id,
        email: authUser.email || '',
        name: null,
        isSuperAdmin: false,
        isAdmin: false,
        isClubAdmin: false,
        isSuspended: false,
        clubIds: [],
        rawUser: null
      };
    }

    // Fetch club admin associations
    const { data: clubAdmins, error: clubAdminError } = await supabase
      .from('club_admins')
      .select('golf_club_id')
      .eq('user_id', authUser.id);

    if (clubAdminError) {
      console.error('[getCurrentUserWithRoles] Club admin fetch error:', clubAdminError);
    }

    const clubIds = (clubAdmins || []).map((ca: any) => ca.golf_club_id);

    // Type assertion for userData
    const user = userData as {
      id: string;
      email: string;
      name: string | null;
      is_super_admin: boolean;
      is_suspended: boolean;
    };

    // Build role flags
    const isSuperAdmin = user.is_super_admin || false;
    const isClubAdmin = clubIds.length > 0;
    const isSuspended = user.is_suspended || false;

    // ADMIN flag: for now, same as SUPER_ADMIN
    // Future: add is_admin column to users table for regular admins
    const isAdmin = isSuperAdmin;

    return {
      id: authUser.id,
      email: user.email,
      name: user.name,
      isSuperAdmin,
      isAdmin,
      isClubAdmin,
      isSuspended,
      clubIds,
      rawUser: user
    };
  } catch (error) {
    console.error('[getCurrentUserWithRoles] Exception:', error);
    return null;
  }
}

/**
 * Check if current user has admin access (SUPER_ADMIN or ADMIN)
 *
 * **DEMO MODE**: Bypasses all checks and returns demo user
 */
export async function requireAdminAccess(): Promise<UserWithRoles> {
  const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  if (DEMO_MODE) {
    console.log('[DEMO MODE] requireAdminAccess - bypassing auth check');
    const user = await getCurrentUserWithRoles();
    if (user) return user;
    // If no demo user, throw error
  }

  const user = await getCurrentUserWithRoles();

  if (!user) {
    throw new Error('UNAUTHORIZED');
  }

  if (!user.isSuperAdmin && !user.isAdmin) {
    throw new Error('FORBIDDEN');
  }

  return user;
}

/**
 * Check if current user has super admin access
 *
 * **DEMO MODE**: Bypasses all checks and returns demo user
 */
export async function requireSuperAdminAccess(): Promise<UserWithRoles> {
  const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  if (DEMO_MODE) {
    console.log('[DEMO MODE] requireSuperAdminAccess - bypassing auth check');
    const user = await getCurrentUserWithRoles();
    if (user) return user;
    // If no demo user, throw error
  }

  const user = await getCurrentUserWithRoles();

  if (!user) {
    throw new Error('UNAUTHORIZED');
  }

  if (!user.isSuperAdmin) {
    throw new Error('FORBIDDEN');
  }

  return user;
}

/**
 * Check if current user can access specific golf club
 * - SUPER_ADMIN/ADMIN: can access all clubs
 * - CLUB_ADMIN: can only access clubs they manage
 *
 * **DEMO MODE**: Bypasses all checks and returns demo user
 */
export async function requireClubAccess(golfClubId: number): Promise<UserWithRoles> {
  const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  if (DEMO_MODE) {
    console.log('[DEMO MODE] requireClubAccess - bypassing auth check for club:', golfClubId);
    const user = await getCurrentUserWithRoles();
    if (user) return user;
    // If no demo user, throw error
  }

  const user = await getCurrentUserWithRoles();

  if (!user) {
    throw new Error('UNAUTHORIZED');
  }

  // Super admin and admin can access all clubs
  if (user.isSuperAdmin || user.isAdmin) {
    return user;
  }

  // Club admin can only access their clubs
  if (user.isClubAdmin && user.clubIds.includes(golfClubId)) {
    return user;
  }

  throw new Error('FORBIDDEN');
}

/**
 * Convenience function to get user ID from session
 */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUserWithRoles();
  return user?.id || null;
}
