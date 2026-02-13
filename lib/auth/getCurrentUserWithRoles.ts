/**
 * SDD-08: Auth Helper - Get Current User with Roles
 *
 * Retrieves authenticated user from session and enriches with TUGOL role information
 * from public.users and club_admins tables.
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

function isNonProductionDemoMode(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

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
    is_admin: boolean;
    is_super_admin: boolean;
    is_suspended: boolean;
    name: string | null;
  } | null;
}

type RoleUserRow = Pick<
  Database['public']['Tables']['users']['Row'],
  'id' | 'email' | 'name' | 'is_admin' | 'is_super_admin'
> & {
  is_suspended?: boolean | null;
};

function createRoleLookupClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

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

/**
 * Get current authenticated user with full role information
 *
 * Role hierarchy:
 * - SUPER_ADMIN: users.is_super_admin = true
 * - ADMIN: users.is_admin = true
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
    const isDemoMode = isNonProductionDemoMode();
    const demoUserEmail = process.env.NEXT_PUBLIC_DEMO_USER_EMAIL;

    if (isDemoMode && demoUserEmail) {
      console.log('[DEMO MODE] Force-logging in user:', demoUserEmail);

      // Fetch user directly from public.users table by email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, name, is_admin, is_super_admin, segment_type')
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
        is_admin: boolean;
        is_super_admin: boolean;
        is_suspended?: boolean;
        segment_type?: string;
      };

      // Build role flags
      const isSuperAdmin = user.is_super_admin || false;
      const isClubAdmin = clubIds.length > 0;
      const isSuspended = user.is_suspended || false;
      const isAdmin = user.is_admin || isSuperAdmin;

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
        rawUser: {
          email: user.email,
          is_admin: user.is_admin || false,
          is_super_admin: user.is_super_admin || false,
          is_suspended: isSuspended,
          name: user.name,
        }
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

    const roleLookupClient = createRoleLookupClient() || supabase;

    // Fetch user details. Use service-role client when available to survive
    // legacy id mismatches between auth.users and public.users.
    const { data: userDataById, error: userError } = await roleLookupClient
      .from('users')
      .select('id, email, name, is_admin, is_super_admin')
      .eq('id', authUser.id)
      .maybeSingle();

    if (userError) {
      console.error('[getCurrentUserWithRoles] User fetch error:', {
        code: userError.code,
        message: userError.message,
        details: userError.details,
        hint: userError.hint,
      });
    }

    let userData = userDataById;

    // Legacy fallback: some seeded accounts may have users.id mismatch.
    // Try resolving role/profile by email before returning guest-like fallback.
    if (!userData && authUser.email) {
      const { data: userDataByEmail, error: userByEmailError } = await roleLookupClient
        .from('users')
        .select('id, email, name, is_admin, is_super_admin')
        .eq('email', authUser.email)
        .maybeSingle();

      if (userByEmailError) {
        console.error('[getCurrentUserWithRoles] User email fallback fetch error:', {
          code: userByEmailError.code,
          message: userByEmailError.message,
          details: userByEmailError.details,
          hint: userByEmailError.hint,
        });
      }

      if (userDataByEmail) {
        userData = userDataByEmail;
      }
    }

    if (!userData) {
      const bootstrapRole = resolveBootstrapRoleByEmail(authUser.email);

      // User exists in Auth but not in public.users - create minimal response
      return {
        id: authUser.id,
        email: authUser.email || '',
        name: null,
        isSuperAdmin: bootstrapRole.isSuperAdmin,
        isAdmin: bootstrapRole.isAdmin,
        isClubAdmin: false,
        isSuspended: false,
        clubIds: [],
        rawUser: null
      };
    }

    // Fetch club admin associations
    const { data: clubAdmins, error: clubAdminError } = await roleLookupClient
      .from('club_admins')
      .select('golf_club_id')
      .eq('user_id', userData.id);

    if (clubAdminError) {
      console.error('[getCurrentUserWithRoles] Club admin fetch error:', clubAdminError);
    }

    const clubIds = (clubAdmins || []).map((ca: any) => ca.golf_club_id);

    // Type assertion for userData
    const user = userData as RoleUserRow;
    const bootstrapRole = resolveBootstrapRoleByEmail(authUser.email);

    // Build role flags
    const isSuperAdmin = Boolean(user.is_super_admin || bootstrapRole.isSuperAdmin);
    const isClubAdmin = clubIds.length > 0;
    const isSuspended = user.is_suspended || false;
    const isAdmin = Boolean(user.is_admin || isSuperAdmin || bootstrapRole.isAdmin);

    return {
      id: authUser.id,
      email: user.email,
      name: user.name,
      isSuperAdmin,
      isAdmin,
      isClubAdmin,
      isSuspended,
      clubIds,
      rawUser: {
        email: user.email,
        is_admin: user.is_admin || false,
        is_super_admin: user.is_super_admin || false,
        is_suspended: isSuspended,
        name: user.name,
      }
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
  const DEMO_MODE = isNonProductionDemoMode();

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
  const DEMO_MODE = isNonProductionDemoMode();

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
  const DEMO_MODE = isNonProductionDemoMode();

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
