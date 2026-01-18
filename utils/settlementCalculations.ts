/**
 * SDD-07: Settlement Calculation Utilities
 *
 * Core logic for calculating settlements and financial breakdowns
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  SettlementConfig,
  SettlementSummary,
  SettlementReservationItem,
  SettlementPreviewResult,
  DEFAULT_SETTLEMENT_CONFIG
} from '@/types/settlement';

/**
 * Determine if a reservation should be included in settlement based on config
 */
function shouldIncludeReservation(
  status: string,
  config: SettlementConfig
): boolean {
  switch (status) {
    case 'PAID':
    case 'COMPLETED':
      return true; // Always include paid/completed

    case 'NO_SHOW':
      return config.include_no_show;

    case 'CANCELLED':
      return config.include_cancelled;

    case 'REFUNDED':
      return config.include_refunded;

    case 'PENDING':
    default:
      return false; // Never include pending or unknown statuses
  }
}

/**
 * Calculate settlement preview for a golf club and period
 *
 * @param supabase - Supabase client
 * @param golfClubId - Golf club ID
 * @param periodStart - Period start date (YYYY-MM-DD)
 * @param periodEnd - Period end date (YYYY-MM-DD)
 * @param partialConfig - Optional config overrides
 * @returns Settlement preview result
 */
export async function calculateSettlementPreview(
  supabase: SupabaseClient,
  golfClubId: number,
  periodStart: string,
  periodEnd: string,
  partialConfig?: Partial<SettlementConfig>
): Promise<SettlementPreviewResult> {
  const config: SettlementConfig = {
    ...DEFAULT_SETTLEMENT_CONFIG,
    ...partialConfig
  };

  const warnings: string[] = [];
  const validationErrors: string[] = [];

  try {
    // Validate inputs
    if (new Date(periodEnd) < new Date(periodStart)) {
      validationErrors.push('Period end must be >= period start');
    }

    if (config.commission_rate < 0 || config.commission_rate > 1) {
      validationErrors.push('Commission rate must be between 0 and 1');
    }

    // Get golf club info
    const { data: golfClub, error: clubError } = await supabase
      .from('golf_clubs')
      .select('id, name')
      .eq('id', golfClubId)
      .single();

    if (clubError || !golfClub) {
      validationErrors.push(`Golf club not found: ${golfClubId}`);
      return {
        summary: {} as SettlementSummary,
        reservations: [],
        warnings,
        can_create: false,
        validation_errors: validationErrors
      };
    }

    // Fetch reservations in period
    const { data: reservations, error: reservationsError } = await supabase
      .from('reservations')
      .select(`
        id,
        user_id,
        tee_time_id,
        status,
        paid_amount,
        refund_amount,
        is_imminent_deal,
        policy_version,
        created_at,
        cancelled_at,
        no_show_marked_at,
        settlement_id,
        users!inner(email, name),
        tee_times!inner(tee_off, golf_club_id)
      `)
      .eq('tee_times.golf_club_id', golfClubId)
      .gte('tee_times.tee_off', periodStart)
      .lte('tee_times.tee_off', periodEnd + 'T23:59:59');

    if (reservationsError) {
      validationErrors.push(`Failed to fetch reservations: ${reservationsError.message}`);
      return {
        summary: {} as SettlementSummary,
        reservations: [],
        warnings,
        can_create: false,
        validation_errors: validationErrors
      };
    }

    // Transform and filter reservations
    const reservationItems: SettlementReservationItem[] = [];
    const breakdownByStatus: Record<string, number> = {
      PAID: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      REFUNDED: 0,
      NO_SHOW: 0
    };

    let grossAmount = 0;
    let refundAmountTotal = 0;
    let alreadySettledCount = 0;
    let excludedCount = 0;

    for (const res of reservations || []) {
      const user = Array.isArray(res.users) ? res.users[0] : res.users;
      const teeTime = Array.isArray(res.tee_times) ? res.tee_times[0] : res.tee_times;

      const shouldInclude = shouldIncludeReservation(res.status, config);
      const alreadySettled = res.settlement_id !== null;

      const item: SettlementReservationItem = {
        id: res.id,
        user_id: res.user_id,
        user_email: user?.email || 'N/A',
        user_name: user?.name || null,
        tee_time_id: res.tee_time_id,
        tee_off: teeTime?.tee_off || '',
        status: res.status,
        paid_amount: res.paid_amount || 0,
        refund_amount: res.refund_amount || 0,
        net_contribution: (res.paid_amount || 0) - (res.refund_amount || 0),
        is_imminent_deal: res.is_imminent_deal || false,
        policy_version: res.policy_version || 'v1',
        created_at: res.created_at,
        cancelled_at: res.cancelled_at,
        no_show_marked_at: res.no_show_marked_at,
        already_settled: alreadySettled,
        settlement_id: res.settlement_id
      };

      reservationItems.push(item);

      // Count already settled
      if (alreadySettled) {
        alreadySettledCount++;
      }

      // Only include in calculations if eligible and not already settled
      if (shouldInclude && !alreadySettled) {
        grossAmount += item.paid_amount;
        refundAmountTotal += item.refund_amount;
        breakdownByStatus[res.status] = (breakdownByStatus[res.status] || 0) + 1;
      } else if (!shouldInclude) {
        excludedCount++;
      }
    }

    // Generate warnings
    if (alreadySettledCount > 0) {
      warnings.push(
        `${alreadySettledCount} reservation(s) already included in another settlement and will be excluded`
      );
    }

    if (excludedCount > 0) {
      warnings.push(
        `${excludedCount} reservation(s) excluded based on status and configuration`
      );
    }

    if (reservationItems.length === 0) {
      warnings.push('No reservations found in this period');
    }

    if (grossAmount === 0) {
      warnings.push('No revenue in this period (gross amount = 0)');
    }

    // Calculate financial summary
    const netAmount = grossAmount - refundAmountTotal;
    const platformFee = netAmount * config.commission_rate;
    const clubPayout = netAmount - platformFee;

    const includedCount = reservationItems.filter(
      r => !r.already_settled && shouldIncludeReservation(r.status, config)
    ).length;

    const summary: SettlementSummary = {
      golf_club_id: golfClubId,
      golf_club_name: golfClub.name,
      period_start: periodStart,
      period_end: periodEnd,
      total_reservations: reservationItems.length,
      included_reservations: includedCount,
      excluded_reservations: excludedCount,
      already_settled_count: alreadySettledCount,
      gross_amount: Math.round(grossAmount * 100) / 100,
      refund_amount: Math.round(refundAmountTotal * 100) / 100,
      net_amount: Math.round(netAmount * 100) / 100,
      platform_fee: Math.round(platformFee * 100) / 100,
      club_payout: Math.round(clubPayout * 100) / 100,
      breakdown_by_status: {
        PAID: breakdownByStatus.PAID || 0,
        COMPLETED: breakdownByStatus.COMPLETED || 0,
        CANCELLED: breakdownByStatus.CANCELLED || 0,
        REFUNDED: breakdownByStatus.REFUNDED || 0,
        NO_SHOW: breakdownByStatus.NO_SHOW || 0,
        ...breakdownByStatus
      },
      config
    };

    const canCreate =
      validationErrors.length === 0 &&
      includedCount > 0 &&
      netAmount > 0;

    return {
      summary,
      reservations: reservationItems,
      warnings,
      can_create: canCreate,
      validation_errors: validationErrors
    };
  } catch (error: any) {
    validationErrors.push(`Calculation error: ${error.message}`);
    return {
      summary: {} as SettlementSummary,
      reservations: [],
      warnings,
      can_create: false,
      validation_errors: validationErrors
    };
  }
}

/**
 * Format currency for display
 */
export function formatSettlementCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW'
  }).format(amount);
}

/**
 * Format date range for display
 */
export function formatSettlementPeriod(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const formatter = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  if (start === end) {
    return formatter.format(startDate);
  }

  return `${formatter.format(startDate)} ~ ${formatter.format(endDate)}`;
}

/**
 * Get month period for a given year and month
 */
export function getMonthPeriod(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0); // Last day of month

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
}

/**
 * Get current month period
 */
export function getCurrentMonthPeriod(): { start: string; end: string } {
  const now = new Date();
  return getMonthPeriod(now.getFullYear(), now.getMonth() + 1);
}

/**
 * Get previous month period
 */
export function getPreviousMonthPeriod(): { start: string; end: string } {
  const now = new Date();
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  return getMonthPeriod(year, prevMonth);
}
