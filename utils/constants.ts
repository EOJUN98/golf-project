/**
 * Shared constants used across the application
 */

/** Score thresholds for color coding */
export const SCORE_THRESHOLDS = {
  EXCELLENT: 72,
  GOOD: 85,
  AVERAGE: 100,
} as const;

/** Risk score thresholds */
export const RISK_THRESHOLDS = {
  LOW: 30,
  MEDIUM: 60,
} as const;

/** Star rating options */
export const STAR_RATINGS = [1, 2, 3, 4, 5] as const;

/** Number of holes in a round */
export const HOLES_PER_ROUND = 18;

/** Cancellation policy hours */
export const CANCELLATION_HOURS = {
  FULL_REFUND: 24,
  PARTIAL_REFUND: 6,
} as const;

/** Reservation status types */
export const RESERVATION_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PAID: 'PAID',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
} as const;

export type ReservationStatus =
  (typeof RESERVATION_STATUS)[keyof typeof RESERVATION_STATUS];
