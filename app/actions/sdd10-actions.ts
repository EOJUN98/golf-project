/**
 * SDD-10: Server Actions
 *
 * Actions for:
 * - Risk score calculation
 * - Virtual payment reservation creation
 * - Segment calculation and updates
 * - Tee time stats aggregation
 */

'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  CreateVirtualReservationInput,
  CreateVirtualReservationResult,
  CalculateRiskScoreInput,
  CalculateRiskScoreResult,
  RiskFactors,
  ReservationRiskAssessment,
  SegmentType,
} from '@/types/sdd10-database';

// ============================================================================
// RISK ASSESSMENT
// ============================================================================

/**
 * Calculate no-show risk score for a user and specific booking
 */
export async function calculateRiskScore(
  input: CalculateRiskScoreInput
): Promise<CalculateRiskScoreResult> {
  try {
    const supabase = await createSupabaseServerClient();

    // Fetch user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', input.user_id)
      .single();

    if (userError || !user) {
      throw new Error('User not found');
    }

    // Fetch tee time data
    const { data: teeTime, error: teeTimeError } = await supabase
      .from('tee_times')
      .select('*')
      .eq('id', input.tee_time_id)
      .single();

    if (teeTimeError || !teeTime) {
      throw new Error('Tee time not found');
    }

    // Calculate time until tee-off
    const teeOff = new Date(teeTime.tee_off);
    const now = new Date();
    const hoursUntilTeeOff = (teeOff.getTime() - now.getTime()) / (1000 * 60 * 60);

    // ===== CALCULATE USER RISK SCORE =====
    let userRiskScore = 0;

    // Base score from no-show count
    userRiskScore += Math.min((user.no_show_count || 0) * 15, 50);

    // Consecutive no-shows penalty
    if ((user.consecutive_no_shows || 0) >= 2) {
      userRiskScore += 20;
    }

    // Cancellation rate impact
    const cancelRate = user.cancellation_rate || 0;
    if (cancelRate > 30) {
      userRiskScore += 15;
    } else if (cancelRate > 15) {
      userRiskScore += 10;
    }

    // Segment modifier
    const segment = user.segment_type || user.segment || 'FUTURE';
    const segmentModifier = {
      PRESTIGE: 0.5, // Trusted users
      SMART: 0.8,
      CHERRY: 1.3, // Higher risk
      FUTURE: 1.1, // New users slightly higher
    }[segment as SegmentType] || 1.0;

    userRiskScore *= segmentModifier;

    // Cap user risk score at 100
    userRiskScore = Math.min(userRiskScore, 100);

    // ===== CALCULATE RESERVATION RISK SCORE =====
    let reservationRiskScore = userRiskScore;

    // Imminent booking penalty (higher risk)
    if (input.is_imminent_deal) {
      reservationRiskScore += 15;
    }

    // Time slot risk (last-minute bookings)
    if (hoursUntilTeeOff < 2) {
      reservationRiskScore += 20;
    } else if (hoursUntilTeeOff < 6) {
      reservationRiskScore += 10;
    }

    // Cap reservation risk score
    reservationRiskScore = Math.min(reservationRiskScore, 100);

    // ===== BUILD RISK FACTORS =====
    const riskFactors: RiskFactors = {
      segment_modifier: segmentModifier,
      no_show_history: Math.min((user.no_show_count || 0) * 15, 50),
      consecutive_penalty: (user.consecutive_no_shows || 0) >= 2 ? 20 : 0,
      cancellation_rate: cancelRate > 30 ? 15 : cancelRate > 15 ? 10 : 0,
      imminent_booking_penalty: input.is_imminent_deal ? 15 : 0,
      time_slot_risk: hoursUntilTeeOff < 2 ? 20 : hoursUntilTeeOff < 6 ? 10 : 0,
      total_risk_score: reservationRiskScore,
    };

    // ===== DETERMINE RESTRICTIONS =====
    const restrictions = {
      can_book: true,
      requires_precheck: false,
      requires_penalty_agreement: false,
      max_concurrent_bookings: 5,
    };

    // High risk (50+): Require penalty agreement
    if (reservationRiskScore >= 50) {
      restrictions.requires_penalty_agreement = true;
    }

    // Very high risk (70+): Additional restrictions
    if (reservationRiskScore >= 70) {
      restrictions.requires_precheck = true;
      restrictions.max_concurrent_bookings = 1;
    }

    // Critical risk (90+): Block booking
    if (reservationRiskScore >= 90) {
      restrictions.can_book = false;
    }

    // Suspended users cannot book
    if (user.is_suspended) {
      restrictions.can_book = false;
    }

    return {
      user_risk_score: Math.round(userRiskScore * 100) / 100,
      reservation_risk_score: Math.round(reservationRiskScore * 100) / 100,
      risk_factors: riskFactors,
      restrictions,
    };
  } catch (error) {
    console.error('[calculateRiskScore] Error:', error);
    throw error;
  }
}

// ============================================================================
// VIRTUAL PAYMENT RESERVATION
// ============================================================================

/**
 * Create reservation with virtual payment (no real PG involved)
 * Used for development/testing or alternative payment methods
 */
export async function createVirtualReservation(
  input: CreateVirtualReservationInput
): Promise<CreateVirtualReservationResult> {
  try {
    const supabase = await createSupabaseServerClient();

    // ===== STEP 1: Validate Tee Time Availability =====
    const { data: teeTime, error: teeTimeError } = await supabase
      .from('tee_times')
      .select('*')
      .eq('id', input.tee_time_id)
      .single();

    if (teeTimeError || !teeTime) {
      return {
        success: false,
        error: 'Tee time not found',
      };
    }

    if (teeTime.status !== 'OPEN') {
      return {
        success: false,
        error: 'Tee time is not available',
      };
    }

    // ===== STEP 2: Calculate Risk Assessment =====
    const riskResult = await calculateRiskScore({
      user_id: input.user_id,
      tee_time_id: input.tee_time_id,
      is_imminent_deal: input.is_imminent_deal,
    });

    if (!riskResult.restrictions.can_book) {
      return {
        success: false,
        error: 'Booking not allowed due to high risk score or suspension',
        risk_assessment: {
          risk_score: riskResult.reservation_risk_score,
          risk_factors: riskResult.risk_factors,
          precheck_required: riskResult.restrictions.requires_precheck,
          penalty_agreement_required: riskResult.restrictions.requires_penalty_agreement,
          restrictions: riskResult.restrictions,
        },
      };
    }

    // Check if penalty agreement is required but not signed
    if (
      riskResult.restrictions.requires_penalty_agreement &&
      !input.penalty_agreement_signed
    ) {
      return {
        success: false,
        error: 'Penalty agreement required but not signed',
        risk_assessment: {
          risk_score: riskResult.reservation_risk_score,
          risk_factors: riskResult.risk_factors,
          precheck_required: riskResult.restrictions.requires_precheck,
          penalty_agreement_required: true,
          restrictions: riskResult.restrictions,
        },
      };
    }

    // ===== STEP 3: Generate Virtual Payment Reference =====
    const virtualReference = `VIRTUAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const paymentMetadata = {
      payment_mode: 'VIRTUAL',
      virtual_reference: {
        transaction_id: virtualReference,
        timestamp: new Date().toISOString(),
        method: 'VIRTUAL_CARD' as const,
        status: 'AUTHORIZED' as const,
      },
    };

    // ===== STEP 4: Create Reservation =====
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .insert({
        user_id: input.user_id,
        tee_time_id: input.tee_time_id,
        base_price: teeTime.base_price,
        final_price: input.final_price,
        discount_breakdown: input.discount_breakdown,
        payment_mode: 'VIRTUAL',
        payment_reference: virtualReference,
        payment_status: 'PAID', // Virtual payment auto-approved
        payment_metadata: paymentMetadata,
        paid_amount: input.final_price,
        status: 'PAID',
        is_imminent_deal: input.is_imminent_deal,
        risk_score: riskResult.reservation_risk_score,
        risk_factors: riskResult.risk_factors,
        precheck_required: riskResult.restrictions.requires_precheck,
        penalty_agreement_signed: input.penalty_agreement_signed || false,
        penalty_agreement_signed_at: input.penalty_agreement_signed
          ? new Date().toISOString()
          : null,
        policy_version: 'v1.0',
      })
      .select()
      .single();

    if (reservationError) {
      console.error('[createVirtualReservation] Reservation error:', reservationError);
      return {
        success: false,
        error: 'Failed to create reservation',
      };
    }

    // ===== STEP 5: Update Tee Time Status =====
    const { error: updateError } = await supabase
      .from('tee_times')
      .update({
        status: 'BOOKED',
        reserved_by: input.user_id,
        reserved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.tee_time_id);

    if (updateError) {
      console.error('[createVirtualReservation] Tee time update error:', updateError);

      // Rollback: Delete the reservation
      await supabase
        .from('reservations')
        .delete()
        .eq('id', reservation.id);

      return {
        success: false,
        error: 'Failed to reserve tee time',
      };
    }

    // ===== STEP 6: Update User Stats =====
    // Update booking count and spending
    await supabase.rpc('increment_user_stats', {
      p_user_id: input.user_id,
      p_booking_amount: input.final_price,
    }).catch(err => {
      // Non-critical, just log
      console.warn('[createVirtualReservation] Stats update failed:', err);
    });

    return {
      success: true,
      reservation_id: reservation.id,
      risk_assessment: {
        risk_score: riskResult.reservation_risk_score,
        risk_factors: riskResult.risk_factors,
        precheck_required: riskResult.restrictions.requires_precheck,
        penalty_agreement_required: riskResult.restrictions.requires_penalty_agreement,
        restrictions: riskResult.restrictions,
      },
    };
  } catch (error) {
    console.error('[createVirtualReservation] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// SEGMENT CALCULATION
// ============================================================================

/**
 * Recalculate user segment based on current stats
 * Called manually or triggered by admin
 */
export async function recalculateUserSegment(userId: string): Promise<{
  success: boolean;
  old_segment?: SegmentType;
  new_segment?: SegmentType;
  segment_score?: number;
  error?: string;
}> {
  try {
    const supabase = await createSupabaseServerClient();

    // Call database function
    const { data, error } = await supabase
      .rpc('calculate_segment_score', { p_user_id: userId })
      .single();

    if (error) {
      console.error('[recalculateUserSegment] Error:', error);
      return {
        success: false,
        error: 'Failed to calculate segment',
      };
    }

    return {
      success: true,
      old_segment: data.old_segment,
      new_segment: data.new_segment || data.segment_type,
      segment_score: data.segment_score,
    };
  } catch (error) {
    console.error('[recalculateUserSegment] Exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// TEE TIME STATS AGGREGATION
// ============================================================================

/**
 * Aggregate statistics for a specific tee time slot
 * Used to populate tee_time_stats table for data-driven pricing
 */
export async function aggregateTeeTimeStats(teeTimeId: number): Promise<{
  success: boolean;
  stats?: any;
  error?: string;
}> {
  try {
    const supabase = await createSupabaseServerClient();

    // Get tee time details
    const { data: teeTime, error: teeTimeError } = await supabase
      .from('tee_times')
      .select('*, golf_clubs(*)')
      .eq('id', teeTimeId)
      .single();

    if (teeTimeError || !teeTime) {
      return {
        success: false,
        error: 'Tee time not found',
      };
    }

    const teeOff = new Date(teeTime.tee_off);

    // Find similar time slots in the past 30 days
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 30);

    const { data: similarSlots, error: slotsError } = await supabase
      .from('tee_times')
      .select(`
        id,
        tee_off,
        base_price,
        status,
        golf_club_id,
        reservations(
          id,
          final_price,
          discount_breakdown,
          status,
          cancelled_at,
          no_show_marked_at
        )
      `)
      .eq('golf_club_id', teeTime.golf_club_id)
      .gte('tee_off', pastDate.toISOString())
      .lt('tee_off', new Date().toISOString());

    if (slotsError) {
      return {
        success: false,
        error: 'Failed to fetch historical data',
      };
    }

    // Calculate statistics
    const totalSlots = similarSlots?.length || 0;
    const bookedSlots = similarSlots?.filter(s => s.status === 'BOOKED').length || 0;
    const cancelledCount = similarSlots?.reduce((sum, slot) => {
      return sum + ((slot.reservations as any[])?.filter(r => r.cancelled_at).length || 0);
    }, 0) || 0;
    const noShowCount = similarSlots?.reduce((sum, slot) => {
      return sum + ((slot.reservations as any[])?.filter(r => r.no_show_marked_at).length || 0);
    }, 0) || 0;

    const avgFinalPrice = similarSlots?.reduce((sum, slot) => {
      const prices = (slot.reservations as any[])?.map(r => r.final_price) || [];
      const avg = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
      return sum + avg;
    }, 0) || 0;

    const stats = {
      tee_time_id: teeTimeId,
      golf_club_id: teeTime.golf_club_id,
      day_of_week: teeOff.getDay(),
      hour_of_day: teeOff.getHours(),
      is_weekend: teeOff.getDay() === 0 || teeOff.getDay() === 6,
      is_holiday: false, // TODO: Implement holiday detection
      total_views: totalSlots * 10, // Mock: assume 10 views per slot
      total_bookings: bookedSlots,
      total_cancellations: cancelledCount,
      total_no_shows: noShowCount,
      avg_final_price: avgFinalPrice / (totalSlots || 1),
      avg_discount_rate: 0.15, // Mock
      base_price: teeTime.base_price,
      booking_rate: totalSlots > 0 ? bookedSlots / totalSlots : 0,
      vacancy_rate: totalSlots > 0 ? (totalSlots - bookedSlots) / totalSlots : 0,
      no_show_rate: bookedSlots > 0 ? noShowCount / bookedSlots : 0,
      calculated_at: new Date().toISOString(),
      stats_period_start: pastDate.toISOString(),
      stats_period_end: new Date().toISOString(),
    };

    // Insert or update stats
    const { error: insertError } = await supabase
      .from('tee_time_stats')
      .upsert(stats, {
        onConflict: 'tee_time_id,calculated_at',
      });

    if (insertError) {
      console.error('[aggregateTeeTimeStats] Insert error:', insertError);
      return {
        success: false,
        error: 'Failed to save statistics',
      };
    }

    return {
      success: true,
      stats,
    };
  } catch (error) {
    console.error('[aggregateTeeTimeStats] Exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// HELPER: Increment User Stats (RPC Function - Define in Migration)
// ============================================================================

/**
 * Database function to atomically increment user stats
 * Should be created in migration as:
 *
 * CREATE OR REPLACE FUNCTION increment_user_stats(
 *   p_user_id UUID,
 *   p_booking_amount NUMERIC
 * ) RETURNS VOID AS $$
 * BEGIN
 *   UPDATE public.users
 *   SET
 *     total_bookings = total_bookings + 1,
 *     total_spent = total_spent + p_booking_amount,
 *     avg_booking_value = (total_spent + p_booking_amount) / (total_bookings + 1)
 *   WHERE id = p_user_id;
 * END;
 * $$ LANGUAGE plpgsql;
 */
