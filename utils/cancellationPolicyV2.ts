/**
 * SDD-04 V2: Cancellation Policy Logic
 *
 * This file contains server-side functions for handling:
 * - Cancellation requests
 * - No-show marking
 * - User suspension
 * - Policy enforcement
 */

import { Database } from '../types/database';
import { createClient } from '@supabase/supabase-js';

type Reservation = Database['public']['Tables']['reservations']['Row'];
type User = Database['public']['Tables']['users']['Row'];
type TeeTime = Database['public']['Tables']['tee_times']['Row'];
type CancellationPolicy = Database['public']['Tables']['cancellation_policies']['Row'];

// =====================================================
// Configuration
// =====================================================

export const CANCELLATION_CONFIG = {
  // Default policy name
  DEFAULT_POLICY: 'STANDARD_V2',

  // Cutoff hours (configurable)
  CANCEL_CUTOFF_HOURS: 24,

  // No-show grace period (minutes after tee-off)
  NO_SHOW_GRACE_PERIOD_MINUTES: 30,

  // Refund processing
  FULL_REFUND_RATE: 1.0,
  NO_REFUND_RATE: 0.0,

  // Messages
  IMMINENT_DEAL_MESSAGE: '임박딜 상품은 취소/환불이 불가합니다. 골프장으로 문의하세요.',
  CUTOFF_PASSED_MESSAGE: '취소 가능 시간이 지났습니다. 골프장으로 문의하세요.',
  WEATHER_REFUND_MESSAGE: '기상 사유 환불은 골프장 정책에 따릅니다.',
  NO_SHOW_SUSPENSION_MESSAGE: '노쇼로 인해 이용이 제한되었습니다.',

  // Cancel reasons
  CANCEL_REASON_USER: 'USER_REQUEST',
  CANCEL_REASON_WEATHER: 'WEATHER',
  CANCEL_REASON_NO_SHOW: 'NO_SHOW',
  CANCEL_REASON_ADMIN: 'ADMIN_CANCEL'
} as const;

// =====================================================
// Helper Types
// =====================================================

export interface CancellationCheckResult {
  canCancel: boolean;
  reason: string;
  hoursLeft?: number;
  policy?: CancellationPolicy;
}

export interface CancellationResult {
  success: boolean;
  message: string;
  refundAmount?: number;
  reservationId?: string;
}

export interface NoShowResult {
  success: boolean;
  message: string;
  userSuspended: boolean;
}

export interface BookingCheckResult {
  canBook: boolean;
  reason: string;
}

// =====================================================
// Core Functions
// =====================================================

/**
 * Check if user can cancel a reservation
 */
export async function canUserCancelReservation(
  reservationId: string,
  supabase: any
): Promise<CancellationCheckResult> {
  try {
    // Get reservation with tee time
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .select(`
        *,
        tee_times (
          tee_off,
          status
        )
      `)
      .eq('id', reservationId)
      .single();

    if (resError || !reservation) {
      return {
        canCancel: false,
        reason: '예약을 찾을 수 없습니다.'
      };
    }

    // Check if already cancelled
    if (reservation.cancelled_at) {
      return {
        canCancel: false,
        reason: '이미 취소된 예약입니다.'
      };
    }

    // Check if already completed/no-show
    if (reservation.status === 'COMPLETED' || reservation.status === 'NO_SHOW') {
      return {
        canCancel: false,
        reason: '완료되었거나 노쇼 처리된 예약입니다.'
      };
    }

    // Get policy
    const { data: policy } = await supabase
      .from('cancellation_policies')
      .select('*')
      .eq('name', CANCELLATION_CONFIG.DEFAULT_POLICY)
      .eq('active', true)
      .single();

    const cutoffHours = policy?.cancel_cutoff_hours || CANCELLATION_CONFIG.CANCEL_CUTOFF_HOURS;

    // Check if imminent deal
    if (reservation.is_imminent_deal && !policy?.imminent_deal_cancellable) {
      return {
        canCancel: false,
        reason: CANCELLATION_CONFIG.IMMINENT_DEAL_MESSAGE,
        policy
      };
    }

    // Calculate hours until tee-off
    const teeOff = new Date(reservation.tee_times.tee_off);
    const now = new Date();
    const hoursLeft = (teeOff.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Check cutoff time
    if (hoursLeft < cutoffHours) {
      return {
        canCancel: false,
        reason: `취소는 티오프 ${cutoffHours}시간 전까지 가능합니다. ${CANCELLATION_CONFIG.CUTOFF_PASSED_MESSAGE}`,
        hoursLeft,
        policy
      };
    }

    // All checks passed
    return {
      canCancel: true,
      reason: '취소 가능',
      hoursLeft,
      policy
    };
  } catch (error) {
    console.error('[canUserCancelReservation] Error:', error);
    return {
      canCancel: false,
      reason: '취소 가능 여부 확인 중 오류가 발생했습니다.'
    };
  }
}

/**
 * Process cancellation request
 * NOTE: This does NOT process payment refund - that should be done separately via PG API
 */
export async function requestCancellation(
  reservationId: string,
  userId: string,
  cancelReason: string = CANCELLATION_CONFIG.CANCEL_REASON_USER,
  supabase: any
): Promise<CancellationResult> {
  try {
    // Check if cancellation is allowed
    const checkResult = await canUserCancelReservation(reservationId, supabase);

    if (!checkResult.canCancel) {
      return {
        success: false,
        message: checkResult.reason
      };
    }

    // Get reservation
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .eq('user_id', userId)
      .single();

    if (resError || !reservation) {
      return {
        success: false,
        message: '예약을 찾을 수 없거나 권한이 없습니다.'
      };
    }

    // Calculate refund amount (full refund for V2 standard policy)
    const refundRate = checkResult.policy?.refund_rate || CANCELLATION_CONFIG.FULL_REFUND_RATE;
    const refundAmount = reservation.final_price * refundRate;

    // Update reservation status
    const { error: updateError } = await supabase
      .from('reservations')
      .update({
        status: 'CANCELLED',
        cancelled_at: new Date().toISOString(),
        cancel_reason: cancelReason,
        refund_amount: refundAmount
      })
      .eq('id', reservationId);

    if (updateError) {
      console.error('[requestCancellation] Update error:', updateError);
      return {
        success: false,
        message: '취소 처리 중 오류가 발생했습니다.'
      };
    }

    // Update tee time status back to OPEN
    const { error: teeTimeError } = await supabase
      .from('tee_times')
      .update({
        status: 'OPEN',
        reserved_by: null,
        reserved_at: null
      })
      .eq('id', reservation.tee_time_id);

    if (teeTimeError) {
      console.error('[requestCancellation] Tee time update error:', teeTimeError);
      // Continue anyway - reservation is cancelled
    }

    return {
      success: true,
      message: '취소가 완료되었습니다. 환불은 영업일 기준 3-5일 소요됩니다.',
      refundAmount,
      reservationId
    };
  } catch (error) {
    console.error('[requestCancellation] Error:', error);
    return {
      success: false,
      message: '취소 처리 중 오류가 발생했습니다.'
    };
  }
}

/**
 * Mark reservation as no-show (admin function)
 * Called after tee-off + grace period
 */
export async function markNoShow(
  reservationId: string,
  supabase: any
): Promise<NoShowResult> {
  try {
    // Get reservation with tee time
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .select(`
        *,
        tee_times (
          tee_off
        )
      `)
      .eq('id', reservationId)
      .single();

    if (resError || !reservation) {
      return {
        success: false,
        message: '예약을 찾을 수 없습니다.',
        userSuspended: false
      };
    }

    // Check if already marked
    if (reservation.status === 'NO_SHOW') {
      return {
        success: false,
        message: '이미 노쇼 처리된 예약입니다.',
        userSuspended: false
      };
    }

    // Check if reservation was paid
    if (reservation.status !== 'PAID') {
      return {
        success: false,
        message: '결제된 예약만 노쇼 처리 가능합니다.',
        userSuspended: false
      };
    }

    // Get policy
    const { data: policy } = await supabase
      .from('cancellation_policies')
      .select('*')
      .eq('name', CANCELLATION_CONFIG.DEFAULT_POLICY)
      .eq('active', true)
      .single();

    const gracePeriodMins = policy?.no_show_grace_period_minutes || CANCELLATION_CONFIG.NO_SHOW_GRACE_PERIOD_MINUTES;

    // Calculate grace period end
    const teeOff = new Date(reservation.tee_times.tee_off);
    const gracePeriodEnd = new Date(teeOff.getTime() + gracePeriodMins * 60 * 1000);
    const now = new Date();

    // Check if enough time has passed
    if (now < gracePeriodEnd) {
      return {
        success: false,
        message: `노쇼 처리는 티오프 ${gracePeriodMins}분 후에 가능합니다.`,
        userSuspended: false
      };
    }

    // Mark reservation as no-show
    const { error: updateError } = await supabase
      .from('reservations')
      .update({
        status: 'NO_SHOW',
        no_show_marked_at: now.toISOString(),
        refund_amount: 0,
        cancel_reason: CANCELLATION_CONFIG.CANCEL_REASON_NO_SHOW
      })
      .eq('id', reservationId);

    if (updateError) {
      console.error('[markNoShow] Update error:', updateError);
      return {
        success: false,
        message: '노쇼 처리 중 오류가 발생했습니다.',
        userSuspended: false
      };
    }

    // Suspend user if policy requires
    let userSuspended = false;
    if (policy?.no_show_suspension_enabled) {
      const suspensionDays = policy.no_show_suspension_duration_days;
      const suspensionExpiry = suspensionDays
        ? new Date(now.getTime() + suspensionDays * 24 * 60 * 60 * 1000)
        : null;

      const { error: suspendError } = await supabase
        .from('users')
        .update({
          is_suspended: true,
          suspended_reason: 'NO_SHOW',
          suspended_at: now.toISOString(),
          suspension_expires_at: suspensionExpiry?.toISOString() || null,
          no_show_count: supabase.sql`no_show_count + 1`,
          last_no_show_at: now.toISOString()
        })
        .eq('id', reservation.user_id);

      if (suspendError) {
        console.error('[markNoShow] Suspend error:', suspendError);
      } else {
        userSuspended = true;
      }
    } else {
      // Just increment no-show count
      await supabase
        .from('users')
        .update({
          no_show_count: supabase.sql`no_show_count + 1`,
          last_no_show_at: now.toISOString()
        })
        .eq('id', reservation.user_id);
    }

    return {
      success: true,
      message: userSuspended
        ? '노쇼 처리 완료. 사용자 계정이 정지되었습니다.'
        : '노쇼 처리 완료.',
      userSuspended
    };
  } catch (error) {
    console.error('[markNoShow] Error:', error);
    return {
      success: false,
      message: '노쇼 처리 중 오류가 발생했습니다.',
      userSuspended: false
    };
  }
}

/**
 * Check if user can make a booking (not suspended)
 */
export async function canUserBook(
  userId: string,
  supabase: any
): Promise<BookingCheckResult> {
  try {
    // Get user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return {
        canBook: false,
        reason: '사용자를 찾을 수 없습니다.'
      };
    }

    // Check if suspended
    if (!user.is_suspended) {
      return {
        canBook: true,
        reason: '예약 가능'
      };
    }

    // Check if suspension has expired
    if (user.suspension_expires_at) {
      const expiryDate = new Date(user.suspension_expires_at);
      const now = new Date();

      if (now >= expiryDate) {
        // Lift suspension
        await supabase
          .from('users')
          .update({
            is_suspended: false,
            suspended_reason: null,
            suspended_at: null,
            suspension_expires_at: null
          })
          .eq('id', userId);

        return {
          canBook: true,
          reason: '예약 가능 (정지 해제됨)'
        };
      }
    }

    // Still suspended
    const reason = user.suspended_reason || '계정 정지';
    const expiryMsg = user.suspension_expires_at
      ? `정지 해제일: ${new Date(user.suspension_expires_at).toLocaleDateString('ko-KR')}`
      : '영구 정지';

    return {
      canBook: false,
      reason: `${reason}로 인해 예약이 제한되었습니다. ${expiryMsg}`
    };
  } catch (error) {
    console.error('[canUserBook] Error:', error);
    return {
      canBook: false,
      reason: '예약 가능 여부 확인 중 오류가 발생했습니다.'
    };
  }
}

/**
 * Get cancellation info for display in UI
 */
export function getCancellationInfo(reservation: Reservation, teeTime: TeeTime): {
  canCancel: boolean;
  badge: string;
  description: string;
} {
  // Imminent deal check
  if (reservation.is_imminent_deal) {
    return {
      canCancel: false,
      badge: '취소/환불 불가',
      description: '임박딜 상품은 취소 및 환불이 불가합니다.'
    };
  }

  // Calculate hours left
  const teeOff = new Date(teeTime.tee_off);
  const now = new Date();
  const hoursLeft = (teeOff.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Check cutoff
  if (hoursLeft < CANCELLATION_CONFIG.CANCEL_CUTOFF_HOURS) {
    return {
      canCancel: false,
      badge: '취소 불가',
      description: `취소는 티오프 ${CANCELLATION_CONFIG.CANCEL_CUTOFF_HOURS}시간 전까지 가능합니다.`
    };
  }

  return {
    canCancel: true,
    badge: '취소 가능',
    description: `티오프 ${CANCELLATION_CONFIG.CANCEL_CUTOFF_HOURS}시간 전까지 전액 환불 가능`
  };
}

/**
 * Process payment refund (to be implemented with PG integration)
 * This is a placeholder - actual PG refund logic goes here
 */
export async function processPaymentRefund(
  reservationId: string,
  refundAmount: number,
  paymentKey: string
): Promise<{ success: boolean; message: string }> {
  try {
    // TODO: Implement actual PG refund logic
    // Example with Toss Payments:
    // const response = await fetch('https://api.tosspayments.com/v1/payments/{paymentKey}/cancel', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Basic ${Buffer.from(TOSS_SECRET_KEY + ':').toString('base64')}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     cancelReason: 'User requested cancellation',
    //     cancelAmount: refundAmount
    //   })
    // });

    console.log(`[processPaymentRefund] Refund requested: ${refundAmount}원 for reservation ${reservationId}`);

    return {
      success: true,
      message: '환불 처리가 시작되었습니다. 영업일 기준 3-5일 소요됩니다.'
    };
  } catch (error) {
    console.error('[processPaymentRefund] Error:', error);
    return {
      success: false,
      message: '환불 처리 중 오류가 발생했습니다. 고객센터로 문의하세요.'
    };
  }
}
