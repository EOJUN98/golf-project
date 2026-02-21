import 'server-only';

export type ReservationStatusColumn = 'status' | 'payment_status';

export async function detectReservationStatusColumn(
  supabase: any
): Promise<ReservationStatusColumn> {
  const statusProbe = await supabase
    .from('reservations')
    .select('status')
    .limit(1);

  if (!statusProbe.error) {
    return 'status';
  }

  const paymentStatusProbe = await supabase
    .from('reservations')
    .select('payment_status')
    .limit(1);

  if (!paymentStatusProbe.error) {
    return 'payment_status';
  }

  throw statusProbe.error || paymentStatusProbe.error || new Error('reservation status column detection failed');
}
