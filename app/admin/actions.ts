/**
 * SDD-06/SDD-08: Admin Server Actions
 *
 * Server actions for admin management:
 * - Mark no-show
 * - Unsuspend user
 * - Admin permission checks
 * Updated for SDD-08: Session-based authentication
 */

'use server';

import { createClient } from '@supabase/supabase-js';
import { markNoShow } from '@/utils/cancellationPolicyV2';
import {
  MarkNoShowRequest,
  MarkNoShowResponse,
  UnsuspendUserRequest,
  UnsuspendUserResponse,
  AdminPermissions,
  AdminActionResult
} from '@/types/adminManagement';
import { getCurrentUserWithRoles, requireAdminAccess } from '@/lib/auth/getCurrentUserWithRoles';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * SDD-08: Check admin permissions for current session user
 */
export async function checkAdminPermissions(): Promise<AdminPermissions> {
  try {
    const user = await getCurrentUserWithRoles();

    if (!user) {
      return {
        canViewAllReservations: false,
        canMarkNoShow: false,
        canUnsuspendUsers: false,
        canViewAllUsers: false
      };
    }

    // SUPER_ADMIN has all permissions
    if (user.isSuperAdmin) {
      return {
        canViewAllReservations: true,
        canMarkNoShow: true,
        canUnsuspendUsers: true,
        canViewAllUsers: true
      };
    }

    // Regular ADMIN has most permissions
    if (user.isAdmin) {
      return {
        canViewAllReservations: true,
        canMarkNoShow: true,
        canUnsuspendUsers: true,
        canViewAllUsers: true
      };
    }

    // CLUB_ADMIN has limited permissions
    if (user.isClubAdmin) {
      return {
        canViewAllReservations: false, // Only their club's reservations
        canMarkNoShow: true,
        canUnsuspendUsers: false, // Cannot unsuspend
        canViewAllUsers: false // Only their club's users
      };
    }

    // Non-admin has no permissions
    return {
      canViewAllReservations: false,
      canMarkNoShow: false,
      canUnsuspendUsers: false,
      canViewAllUsers: false
    };
  } catch (error) {
    console.error('[checkAdminPermissions] Error:', error);
    return {
      canViewAllReservations: false,
      canMarkNoShow: false,
      canUnsuspendUsers: false,
      canViewAllUsers: false
    };
  }
}

/**
 * SDD-08: Mark reservation as no-show (Admin action)
 * Uses session-based authentication
 */
export async function markReservationAsNoShow(
  request: MarkNoShowRequest
): Promise<MarkNoShowResponse> {
  try {
    const { reservationId } = request;

    // Check admin permissions for current session user
    try {
      await requireAdminAccess();
    } catch (error: any) {
      return {
        success: false,
        message: error.message === 'UNAUTHORIZED'
          ? 'You must be logged in to mark no-shows'
          : 'Unauthorized: Admin permissions required',
        userSuspended: false,
        error: 'UNAUTHORIZED'
      };
    }

    // Call the mark_no_show function from cancellationPolicyV2
    const result = await markNoShow(reservationId, supabase);

    return {
      success: result.success,
      message: result.message,
      userSuspended: result.userSuspended || false
    };
  } catch (error: any) {
    console.error('[markReservationAsNoShow] Error:', error);
    return {
      success: false,
      message: 'Failed to mark no-show',
      userSuspended: false,
      error: error.message
    };
  }
}

/**
 * SDD-08: Unsuspend user (Admin action)
 * Uses session-based authentication
 */
export async function unsuspendUser(
  request: UnsuspendUserRequest
): Promise<UnsuspendUserResponse> {
  try {
    const { userId, reason } = request;

    // Get current admin user
    let currentUser;
    try {
      currentUser = await requireAdminAccess();
    } catch (error: any) {
      return {
        success: false,
        message: error.message === 'UNAUTHORIZED'
          ? 'You must be logged in to unsuspend users'
          : 'Unauthorized: Admin permissions required',
        error: 'UNAUTHORIZED'
      };
    }

    // CLUB_ADMIN cannot unsuspend users
    if (currentUser.isClubAdmin && !currentUser.isSuperAdmin && !currentUser.isAdmin) {
      return {
        success: false,
        message: 'CLUB_ADMIN cannot unsuspend users',
        error: 'FORBIDDEN'
      };
    }

    // Get current user state
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, email, is_suspended, suspended_reason')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      return {
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      };
    }

    if (!user.is_suspended) {
      return {
        success: false,
        message: 'User is not suspended',
        error: 'NOT_SUSPENDED'
      };
    }

    // Unsuspend user
    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_suspended: false,
        suspended_reason: null,
        suspended_at: null,
        suspension_expires_at: null
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[unsuspendUser] Update error:', updateError);
      return {
        success: false,
        message: 'Failed to unsuspend user',
        error: updateError.message
      };
    }

    // Log the action (optional - for audit trail)
    console.log(
      `[unsuspendUser] Admin ${currentUser.id} (${currentUser.email}) unsuspended user ${userId}. Reason: ${reason || 'Not provided'}`
    );

    return {
      success: true,
      message: `User ${user.email} has been unsuspended`
    };
  } catch (error: any) {
    console.error('[unsuspendUser] Error:', error);
    return {
      success: false,
      message: 'Internal server error',
      error: error.message
    };
  }
}

/**
 * SDD-08: Bulk unsuspend users (for expired suspensions)
 * Uses session-based authentication
 */
export async function bulkUnsuspendExpiredUsers(): Promise<AdminActionResult> {
  try {
    // Get current admin user
    let currentUser;
    try {
      currentUser = await requireAdminAccess();
    } catch (error: any) {
      return {
        success: false,
        message: error.message === 'UNAUTHORIZED'
          ? 'You must be logged in to unsuspend users'
          : 'Unauthorized: Admin permissions required',
        error: 'UNAUTHORIZED'
      };
    }

    // CLUB_ADMIN cannot bulk unsuspend
    if (currentUser.isClubAdmin && !currentUser.isSuperAdmin && !currentUser.isAdmin) {
      return {
        success: false,
        message: 'CLUB_ADMIN cannot bulk unsuspend users',
        error: 'FORBIDDEN'
      };
    }

    // Find all users with expired suspensions
    const now = new Date().toISOString();
    const { data: expiredUsers, error: fetchError } = await supabase
      .from('users')
      .select('id, email')
      .eq('is_suspended', true)
      .not('suspension_expires_at', 'is', null)
      .lt('suspension_expires_at', now);

    if (fetchError) {
      console.error('[bulkUnsuspendExpiredUsers] Fetch error:', fetchError);
      return {
        success: false,
        message: 'Failed to fetch expired suspensions',
        error: fetchError.message
      };
    }

    if (!expiredUsers || expiredUsers.length === 0) {
      return {
        success: true,
        message: 'No expired suspensions found',
        data: { count: 0 }
      };
    }

    // Unsuspend all expired users
    const userIds = expiredUsers.map(u => u.id);
    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_suspended: false,
        suspended_reason: null,
        suspended_at: null,
        suspension_expires_at: null
      })
      .in('id', userIds);

    if (updateError) {
      console.error('[bulkUnsuspendExpiredUsers] Update error:', updateError);
      return {
        success: false,
        message: 'Failed to unsuspend users',
        error: updateError.message
      };
    }

    console.log(
      `[bulkUnsuspendExpiredUsers] Admin ${currentUser.id} (${currentUser.email}) unsuspended ${userIds.length} users with expired suspensions`
    );

    return {
      success: true,
      message: `Successfully unsuspended ${userIds.length} users`,
      data: { count: userIds.length, users: expiredUsers }
    };
  } catch (error: any) {
    console.error('[bulkUnsuspendExpiredUsers] Error:', error);
    return {
      success: false,
      message: 'Internal server error',
      error: error.message
    };
  }
}

/**
 * SDD-08: Get admin dashboard statistics
 * Uses session-based authentication
 */
export async function getAdminDashboardStats() {
  try {
    // Check admin access for current session user
    try {
      await requireAdminAccess();
    } catch (error: any) {
      throw new Error(error.message === 'UNAUTHORIZED'
        ? 'You must be logged in to view dashboard'
        : 'Unauthorized');
    }

    // Get reservation counts by status
    const { data: reservations, error: resError } = await supabase
      .from('reservations')
      .select('status');

    if (resError) throw resError;

    const stats = {
      totalReservations: reservations?.length || 0,
      paidReservations: reservations?.filter(r => r.status === 'PAID').length || 0,
      cancelledReservations: reservations?.filter(r => r.status === 'CANCELLED').length || 0,
      noShowReservations: reservations?.filter(r => r.status === 'NO_SHOW').length || 0
    };

    // Get suspended users count
    const { count: suspendedCount, error: userError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_suspended', true);

    if (userError) throw userError;

    // Get pending no-show candidates (PAID reservations past grace period)
    const gracePeriodEnd = new Date();
    gracePeriodEnd.setMinutes(gracePeriodEnd.getMinutes() - 30); // 30 min grace period

    const { data: candidates, error: candidatesError } = await supabase
      .from('reservations')
      .select('id, tee_times!inner(tee_off)')
      .eq('status', 'PAID')
      .lt('tee_times.tee_off', gracePeriodEnd.toISOString());

    if (candidatesError) throw candidatesError;

    return {
      success: true,
      data: {
        ...stats,
        suspendedUsers: suspendedCount || 0,
        pendingNoShowCandidates: candidates?.length || 0
      }
    };
  } catch (error: any) {
    console.error('[getAdminDashboardStats] Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
