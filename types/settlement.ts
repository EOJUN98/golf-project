/**
 * SDD-07: Settlement & Billing Module Types
 *
 * TypeScript type definitions for the settlement and billing system
 */

import { Database } from './database';

// ============================================================================
// Database Types
// ============================================================================

export type Settlement = Database['public']['Tables']['settlements']['Row'];
export type SettlementInsert = Database['public']['Tables']['settlements']['Insert'];
export type SettlementUpdate = Database['public']['Tables']['settlements']['Update'];

// Settlement status enum
export type SettlementStatus = 'DRAFT' | 'CONFIRMED' | 'LOCKED';

// ============================================================================
// Configuration Types
// ============================================================================

export interface SettlementConfig {
  /**
   * Platform commission rate (0.0 to 1.0)
   * Example: 0.10 = 10%
   */
  commission_rate: number;

  /**
   * Include NO_SHOW reservations in settlement
   * Default: true (no refund given for no-shows)
   */
  include_no_show: boolean;

  /**
   * Include CANCELLED reservations in settlement
   * Default: true (but refund_amount will be deducted)
   */
  include_cancelled: boolean;

  /**
   * Include REFUNDED reservations in settlement
   * Default: true (but refund_amount will be deducted)
   */
  include_refunded: boolean;

  /**
   * Policy version used for this settlement
   */
  policy_version?: string;
}

export const DEFAULT_SETTLEMENT_CONFIG: SettlementConfig = {
  commission_rate: 0.10, // 10%
  include_no_show: true,
  include_cancelled: true,
  include_refunded: true,
  policy_version: 'v1'
};

// ============================================================================
// Settlement Calculation Types
// ============================================================================

/**
 * Individual reservation item included in settlement
 */
export interface SettlementReservationItem {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  tee_time_id: number;
  tee_off: string;
  status: string;
  paid_amount: number;
  refund_amount: number;
  net_contribution: number; // paid_amount - refund_amount
  is_imminent_deal: boolean;
  policy_version: string;
  created_at: string;
  cancelled_at: string | null;
  no_show_marked_at: string | null;
  already_settled: boolean; // Already part of another settlement
  settlement_id: string | null;
}

/**
 * Settlement calculation summary
 */
export interface SettlementSummary {
  golf_club_id: number;
  golf_club_name: string;
  period_start: string;
  period_end: string;

  // Counts
  total_reservations: number;
  included_reservations: number;
  excluded_reservations: number;
  already_settled_count: number;

  // Financial breakdown
  gross_amount: number; // Sum of paid_amount
  refund_amount: number; // Sum of refund_amount
  net_amount: number; // gross_amount - refund_amount
  platform_fee: number; // net_amount * commission_rate
  club_payout: number; // net_amount - platform_fee

  // Reservation breakdown by status
  breakdown_by_status: {
    PAID: number;
    COMPLETED: number;
    CANCELLED: number;
    REFUNDED: number;
    NO_SHOW: number;
    [key: string]: number;
  };

  // Configuration used
  config: SettlementConfig;
}

/**
 * Result of settlement preview calculation
 */
export interface SettlementPreviewResult {
  summary: SettlementSummary;
  reservations: SettlementReservationItem[];
  warnings: string[];
  can_create: boolean;
  validation_errors: string[];
}

/**
 * Result of settlement creation
 */
export interface CreateSettlementResult {
  success: boolean;
  settlement_id?: string;
  message: string;
  error?: string;
  included_reservation_count?: number;
  excluded_reservation_count?: number;
  warnings?: string[];
}

// ============================================================================
// Admin UI Types
// ============================================================================

/**
 * Settlement row for list view (with joined data)
 */
export interface SettlementListRow {
  id: string;
  golf_club_id: number;
  golf_club_name: string;
  golf_club_location: string | null;
  period_start: string;
  period_end: string;
  gross_amount: number;
  refund_amount: number;
  net_amount: number;
  platform_fee: number;
  club_payout: number;
  reservation_count: number;
  status: SettlementStatus;
  commission_rate: number;
  created_at: string;
  created_by_email: string | null;
  confirmed_at: string | null;
  confirmed_by_email: string | null;
  locked_at: string | null;
  locked_by_email: string | null;
  notes: string | null;
}

/**
 * Detailed settlement for detail view
 */
export interface SettlementDetail {
  settlement: Settlement;
  golf_club: {
    id: number;
    name: string;
    location_name: string | null;
  };
  reservations: SettlementReservationItem[];
  created_by: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  confirmed_by: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  locked_by: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  can_confirm: boolean;
  can_lock: boolean;
  can_edit: boolean;
}

/**
 * Filters for settlement list
 */
export interface SettlementFilters {
  golf_club_id?: number;
  status?: SettlementStatus | 'ALL';
  year?: number;
  month?: number;
  period_start?: string;
  period_end?: string;
}

// ============================================================================
// Server Action Request/Response Types
// ============================================================================

/**
 * Request to preview settlement calculation
 * SDD-08: admin_user_id removed - uses session
 */
export interface PreviewSettlementRequest {
  golf_club_id: number;
  period_start: string; // YYYY-MM-DD
  period_end: string; // YYYY-MM-DD
  config?: Partial<SettlementConfig>;
}

/**
 * Response from preview settlement
 */
export interface PreviewSettlementResponse {
  success: boolean;
  data?: SettlementPreviewResult;
  error?: string;
  message?: string;
}

/**
 * Request to create settlement
 * SDD-08: admin_user_id removed - uses session
 */
export interface CreateSettlementRequest {
  golf_club_id: number;
  period_start: string;
  period_end: string;
  config?: Partial<SettlementConfig>;
  notes?: string;
}

/**
 * Response from create settlement
 */
export interface CreateSettlementResponse {
  success: boolean;
  settlement_id?: string;
  message: string;
  error?: string;
  data?: {
    included_count: number;
    excluded_count: number;
    warnings: string[];
  };
}

/**
 * Request to update settlement status
 * SDD-08: admin_user_id removed - uses session
 */
export interface UpdateSettlementStatusRequest {
  settlement_id: string;
  new_status: SettlementStatus;
  notes?: string;
}

/**
 * Response from update settlement status
 */
export interface UpdateSettlementStatusResponse {
  success: boolean;
  message: string;
  error?: string;
  settlement?: Settlement;
}

/**
 * Request to update settlement notes
 * SDD-08: admin_user_id removed - uses session
 */
export interface UpdateSettlementNotesRequest {
  settlement_id: string;
  notes: string;
}

/**
 * Response from update settlement notes
 */
export interface UpdateSettlementNotesResponse {
  success: boolean;
  message: string;
  error?: string;
}

// ============================================================================
// Permission Types
// ============================================================================

export interface SettlementPermissions {
  can_view_all_settlements: boolean;
  can_create_settlements: boolean;
  can_confirm_settlements: boolean;
  can_lock_settlements: boolean;
  accessible_club_ids: number[]; // Empty array = all clubs (SUPER_ADMIN)
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Period helper for common date ranges
 */
export interface SettlementPeriod {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  label: string; // e.g., "January 2026"
}

/**
 * Statistics for dashboard
 */
export interface SettlementStats {
  total_settlements: number;
  draft_count: number;
  confirmed_count: number;
  locked_count: number;
  total_gross_amount: number;
  total_platform_fee: number;
  total_club_payout: number;
  current_month_settlements: number;
}
