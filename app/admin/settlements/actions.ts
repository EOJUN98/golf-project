/**
 * SDD-07/SDD-08: Settlement Management Server Actions
 *
 * Server-side actions for creating and managing settlements
 * Updated for SDD-08: Session-based authentication
 */

'use server';

import { calculateSettlementPreview } from '@/utils/settlementCalculations';
import {
  PreviewSettlementRequest,
  PreviewSettlementResponse,
  CreateSettlementRequest,
  CreateSettlementResponse,
  UpdateSettlementStatusRequest,
  UpdateSettlementStatusResponse,
  UpdateSettlementNotesRequest,
  UpdateSettlementNotesResponse,
  SettlementPermissions,
  DEFAULT_SETTLEMENT_CONFIG
} from '@/types/settlement';
import { getCurrentUserWithRoles, requireClubAccess, type UserWithRoles } from '@/lib/auth/getCurrentUserWithRoles';
import { createSupabaseAdminClientOptional } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

async function getSettlementSupabase() {
  const adminClient = createSupabaseAdminClientOptional();
  return adminClient ?? await createSupabaseServerClient();
}

type SettlementActor = UserWithRoles;

function canUseSettlementConsole(user: Awaited<ReturnType<typeof getCurrentUserWithRoles>>): user is SettlementActor {
  return Boolean(user && (user.isSuperAdmin || user.isAdmin || user.isClubAdmin));
}

function hasGlobalSettlementAccess(user: SettlementActor) {
  return user.isSuperAdmin || user.isAdmin;
}

async function requireSettlementActor(): Promise<SettlementActor> {
  const user = await getCurrentUserWithRoles();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  if (!canUseSettlementConsole(user)) {
    throw new Error('FORBIDDEN');
  }
  return user;
}

async function getMutableSettlementForActor(
  supabase: Awaited<ReturnType<typeof getSettlementSupabase>>,
  settlementId: string,
  actor: SettlementActor
) {
  let query = supabase
    .from('settlements')
    .select('*')
    .eq('id', settlementId);

  if (!hasGlobalSettlementAccess(actor)) {
    const clubIds = actor.clubIds.length > 0 ? actor.clubIds : [-1];
    query = query.in('golf_club_id', clubIds);
  }

  const { data, error } = await query.single();
  return { data, error };
}

// ============================================================================
// Permission Checks
// ============================================================================

/**
 * SDD-08: Check settlement permissions for current session user
 */
export async function checkSettlementPermissions(): Promise<SettlementPermissions> {
  try {
    const user = await getCurrentUserWithRoles();

    if (!user) {
      return {
        can_view_all_settlements: false,
        can_create_settlements: false,
        can_confirm_settlements: false,
        can_lock_settlements: false,
        accessible_club_ids: []
      };
    }

    // SUPER_ADMIN has all permissions
    if (user.isSuperAdmin) {
      return {
        can_view_all_settlements: true,
        can_create_settlements: true,
        can_confirm_settlements: true,
        can_lock_settlements: true,
        accessible_club_ids: [] // Empty = all clubs
      };
    }

    // ADMIN has most permissions but not LOCK
    if (user.isAdmin) {
      return {
        can_view_all_settlements: true,
        can_create_settlements: true,
        can_confirm_settlements: true,
        can_lock_settlements: false, // Only SUPER_ADMIN can lock
        accessible_club_ids: []
      };
    }

    // CLUB_ADMIN can only manage their clubs
    if (user.isClubAdmin) {
      return {
        can_view_all_settlements: false,
        can_create_settlements: true,
        can_confirm_settlements: true,
        can_lock_settlements: false,
        accessible_club_ids: user.clubIds
      };
    }

    // Regular users have no settlement access
    return {
      can_view_all_settlements: false,
      can_create_settlements: false,
      can_confirm_settlements: false,
      can_lock_settlements: false,
      accessible_club_ids: []
    };
  } catch (error: any) {
    console.error('[checkSettlementPermissions] Error:', error);
    return {
      can_view_all_settlements: false,
      can_create_settlements: false,
      can_confirm_settlements: false,
      can_lock_settlements: false,
      accessible_club_ids: []
    };
  }
}

// ============================================================================
// Preview Settlement
// ============================================================================

/**
 * SDD-08: Calculate and preview settlement before creation
 * Uses session-based authentication
 */
export async function previewSettlement(
  request: PreviewSettlementRequest
): Promise<PreviewSettlementResponse> {
  try {
    const { golf_club_id, period_start, period_end, config } = request;
    const supabase = await getSettlementSupabase();

    // Check club access for current session user
    try {
      await requireClubAccess(golf_club_id);
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: error.message === 'UNAUTHORIZED'
          ? 'You must be logged in to preview settlements'
          : 'You do not have permission to access this golf club'
      };
    }

    // Calculate preview
    const previewResult = await calculateSettlementPreview(
      supabase,
      golf_club_id,
      period_start,
      period_end,
      config
    );

    if (previewResult.validation_errors.length > 0) {
      return {
        success: false,
        error: previewResult.validation_errors.join('; '),
        message: 'Validation failed',
        data: previewResult
      };
    }

    return {
      success: true,
      data: previewResult,
      message: 'Settlement preview calculated successfully'
    };
  } catch (error: any) {
    console.error('[previewSettlement] Error:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to preview settlement'
    };
  }
}

// ============================================================================
// Create Settlement
// ============================================================================

/**
 * SDD-08: Create a new settlement in DRAFT status
 * Uses session-based authentication
 */
export async function createSettlement(
  request: CreateSettlementRequest
): Promise<CreateSettlementResponse> {
  try {
    const { golf_club_id, period_start, period_end, config, notes } = request;
    const supabase = await getSettlementSupabase();

    // Get current session user
    let currentUser: SettlementActor;
    try {
      currentUser = await requireClubAccess(golf_club_id);
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: error.message === 'UNAUTHORIZED'
          ? 'You must be logged in to create settlements'
          : 'You do not have permission to access this golf club'
      };
    }

    // Calculate preview first
    const previewResult = await calculateSettlementPreview(
      supabase,
      golf_club_id,
      period_start,
      period_end,
      config
    );

    if (!previewResult.can_create) {
      return {
        success: false,
        error: previewResult.validation_errors.join('; '),
        message: 'Cannot create settlement: validation failed',
        data: {
          included_count: 0,
          excluded_count: 0,
          warnings: previewResult.warnings
        }
      };
    }

    const { summary, reservations } = previewResult;
    const finalConfig = { ...DEFAULT_SETTLEMENT_CONFIG, ...config };

    // Check for duplicate settlement
    const { data: existingSettlement } = await supabase
      .from('settlements')
      .select('id')
      .eq('golf_club_id', golf_club_id)
      .eq('period_start', period_start)
      .eq('period_end', period_end)
      .single();

    if (existingSettlement) {
      return {
        success: false,
        error: 'Duplicate settlement',
        message: 'A settlement for this club and period already exists'
      };
    }

    // Create settlement record
    const { data: settlement, error: settlementError } = await supabase
      .from('settlements')
      .insert({
        golf_club_id,
        period_start,
        period_end,
        gross_amount: summary.gross_amount,
        refund_amount: summary.refund_amount,
        net_amount: summary.net_amount,
        platform_fee: summary.platform_fee,
        club_payout: summary.club_payout,
        reservation_count: summary.included_reservations,
        status: 'DRAFT',
        policy_version: finalConfig.policy_version || 'v1',
        commission_rate: finalConfig.commission_rate,
        include_no_show: finalConfig.include_no_show,
        include_cancelled: finalConfig.include_cancelled,
        include_refunded: finalConfig.include_refunded,
        created_by_user_id: currentUser.id,
        notes: notes || null
      })
      .select()
      .single();

    if (settlementError || !settlement) {
      console.error('[createSettlement] Error creating settlement:', settlementError);
      return {
        success: false,
        error: settlementError?.message || 'Failed to create settlement',
        message: 'Failed to create settlement record'
      };
    }

    // Update reservations with settlement_id
    const reservationsToInclude = reservations
      .filter(r => !r.already_settled && r.net_contribution >= 0)
      .map(r => r.id);

    if (reservationsToInclude.length > 0) {
      const { error: updateError } = await supabase
        .from('reservations')
        .update({ settlement_id: settlement.id })
        .in('id', reservationsToInclude);

      if (updateError) {
        console.error('[createSettlement] Error updating reservations:', updateError);
        // Rollback settlement creation
        await supabase.from('settlements').delete().eq('id', settlement.id);
        return {
          success: false,
          error: updateError.message,
          message: 'Failed to link reservations to settlement'
        };
      }
    }

    return {
      success: true,
      settlement_id: settlement.id,
      message: `Settlement created successfully with ${reservationsToInclude.length} reservations`,
      data: {
        included_count: reservationsToInclude.length,
        excluded_count: summary.excluded_reservations + summary.already_settled_count,
        warnings: previewResult.warnings
      }
    };
  } catch (error: any) {
    console.error('[createSettlement] Error:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to create settlement'
    };
  }
}

// ============================================================================
// Update Settlement Status
// ============================================================================

/**
 * SDD-08: Update settlement status (DRAFT → CONFIRMED → LOCKED)
 * Uses session-based authentication
 */
export async function updateSettlementStatus(
  request: UpdateSettlementStatusRequest
): Promise<UpdateSettlementStatusResponse> {
  try {
    const { settlement_id, new_status, notes } = request;

    if (!isValidUUID(settlement_id)) {
      return {
        success: false,
        error: 'Invalid settlement_id',
        message: '유효하지 않은 정산 ID입니다'
      };
    }

    const supabase = await getSettlementSupabase();

    // Get current session user
    let currentUser: SettlementActor;
    try {
      currentUser = await requireSettlementActor();
      if (new_status === 'LOCKED' && !currentUser.isSuperAdmin) {
        throw new Error('SUPER_ADMIN_REQUIRED');
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: error.message === 'UNAUTHORIZED'
          ? 'You must be logged in to update settlements'
          : error.message === 'SUPER_ADMIN_REQUIRED'
          ? 'Only SUPER_ADMIN can lock settlements'
          : 'You do not have permission to update settlements'
      };
    }

    // Get current settlement
    const { data: currentSettlement, error: fetchError } = await getMutableSettlementForActor(
      supabase,
      settlement_id,
      currentUser
    );

    if (fetchError || !currentSettlement) {
      return {
        success: false,
        error: 'Settlement not found or not accessible',
        message: 'Settlement does not exist or you do not have access to it'
      };
    }

    // Validate status transition
    const currentStatus = currentSettlement.status;
    if (currentStatus === 'LOCKED') {
      return {
        success: false,
        error: 'Cannot modify locked settlement',
        message: 'Settlement is locked and cannot be changed'
      };
    }

    if (currentStatus === 'CONFIRMED' && new_status === 'DRAFT') {
      return {
        success: false,
        error: 'Invalid status transition',
        message: 'Cannot revert CONFIRMED settlement to DRAFT'
      };
    }

    if (currentStatus === 'DRAFT' && new_status === 'LOCKED') {
      return {
        success: false,
        error: 'Invalid status transition',
        message: 'Settlement must be CONFIRMED before LOCKED'
      };
    }

    // Prepare update
    const updateData: any = {
      status: new_status
    };

    if (new_status === 'CONFIRMED') {
      updateData.confirmed_at = new Date().toISOString();
      updateData.confirmed_by_user_id = currentUser.id;
    }

    if (new_status === 'LOCKED') {
      updateData.locked_at = new Date().toISOString();
      updateData.locked_by_user_id = currentUser.id;
    }

    if (notes) {
      updateData.notes = currentSettlement.notes
        ? `${currentSettlement.notes}\n\n[${new Date().toISOString()}] ${notes}`
        : notes;
    }

    // Update settlement
    const { data: updatedSettlement, error: updateError } = await supabase
      .from('settlements')
      .update(updateData)
      .eq('id', settlement_id)
      .eq('golf_club_id', currentSettlement.golf_club_id)
      .select()
      .single();

    if (updateError) {
      console.error('[updateSettlementStatus] Error:', updateError);
      return {
        success: false,
        error: updateError.message,
        message: 'Failed to update settlement status'
      };
    }

    return {
      success: true,
      message: `Settlement status updated to ${new_status}`,
      settlement: updatedSettlement
    };
  } catch (error: any) {
    console.error('[updateSettlementStatus] Error:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to update settlement status'
    };
  }
}

// ============================================================================
// Update Settlement Notes
// ============================================================================

/**
 * SDD-08: Update settlement notes
 * Uses session-based authentication
 */
export async function updateSettlementNotes(
  request: UpdateSettlementNotesRequest
): Promise<UpdateSettlementNotesResponse> {
  try {
    const { settlement_id, notes } = request;

    if (!isValidUUID(settlement_id)) {
      return {
        success: false,
        error: 'Invalid settlement_id',
        message: '유효하지 않은 정산 ID입니다'
      };
    }

    const supabase = await getSettlementSupabase();

    // Check settlement access
    let currentUser: SettlementActor;
    try {
      currentUser = await requireSettlementActor();
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: error.message === 'UNAUTHORIZED'
          ? 'You must be logged in to update settlements'
          : 'You do not have permission to update settlements'
      };
    }

    // Get current settlement
    const { data: currentSettlement } = await getMutableSettlementForActor(
      supabase,
      settlement_id,
      currentUser
    );

    if (!currentSettlement) {
      return {
        success: false,
        error: 'Settlement not found or not accessible',
        message: 'Settlement does not exist or you do not have access to it'
      };
    }

    if (currentSettlement.status === 'LOCKED') {
      return {
        success: false,
        error: 'Cannot modify locked settlement',
        message: 'Settlement is locked and cannot be modified'
      };
    }

    // Update notes
    const { error: updateError } = await supabase
      .from('settlements')
      .update({ notes })
      .eq('id', settlement_id)
      .eq('golf_club_id', currentSettlement.golf_club_id);

    if (updateError) {
      return {
        success: false,
        error: updateError.message,
        message: 'Failed to update notes'
      };
    }

    return {
      success: true,
      message: 'Notes updated successfully'
    };
  } catch (error: any) {
    console.error('[updateSettlementNotes] Error:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to update notes'
    };
  }
}
