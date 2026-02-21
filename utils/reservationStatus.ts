export const CANONICAL_RESERVATION_STATUSES = [
  'PENDING',
  'PAID',
  'CANCELLED',
  'REFUNDED',
  'NO_SHOW',
  'COMPLETED',
] as const;

export type CanonicalReservationStatus = (typeof CANONICAL_RESERVATION_STATUSES)[number];

export type ReservationStatusLike = {
  status?: unknown;
  payment_status?: unknown;
};

function isCanonicalReservationStatus(value: unknown): value is CanonicalReservationStatus {
  return typeof value === 'string'
    && (CANONICAL_RESERVATION_STATUSES as readonly string[]).includes(value);
}

export function resolveReservationStatusValue(value: ReservationStatusLike): CanonicalReservationStatus | null {
  if (isCanonicalReservationStatus(value.status)) {
    return value.status;
  }
  if (isCanonicalReservationStatus(value.payment_status)) {
    return value.payment_status;
  }
  return null;
}

export function withCanonicalReservationStatus<T extends ReservationStatusLike>(value: T): T & { status: CanonicalReservationStatus } {
  return {
    ...value,
    status: resolveReservationStatusValue(value) || 'PENDING',
  };
}
