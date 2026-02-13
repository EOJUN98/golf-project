import { redirect } from 'next/navigation';
import MyPageTabs from '@/components/my/MyPageTabs';
import PageCanvas from '@/components/layout/PageCanvas';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserWithRoles } from '@/lib/auth/getCurrentUserWithRoles';
import type { Database } from '@/types/database';

type ReservationWithTeeTime = {
  id: string;
  created_at: string;
  status: Database['public']['Tables']['reservations']['Row']['status'];
  tee_times:
    | Pick<Database['public']['Tables']['tee_times']['Row'], 'id' | 'tee_off'>
    | Pick<Database['public']['Tables']['tee_times']['Row'], 'id' | 'tee_off'>[]
    | null;
};

export const dynamic = 'force-dynamic';

export default async function MyPage() {
  const currentUser = await getCurrentUserWithRoles();

  if (!currentUser) {
    redirect('/login?redirect=/my');
  }

  const supabase = await createSupabaseServerClient();

  const [{ data: userData }, { data: reservationRows }] = await Promise.all([
    supabase
      .from('users')
      .select(
        'id, email, name, segment, segment_type, segment_score, total_bookings, total_spent, no_show_count, no_show_risk_score'
      )
      .eq('id', currentUser.id)
      .single(),
    supabase
      .from('reservations')
      .select(
        `
          id,
          created_at,
          status,
          tee_times (
            id,
            tee_off
          )
        `
      )
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false }),
  ]);

  const reservations = (reservationRows || []) as unknown as ReservationWithTeeTime[];

  const completedReservations = reservations.filter(
    (reservation) => reservation.status === 'COMPLETED'
  );

  const leadTimes = reservations
    .map((reservation) => {
      const teeTime = Array.isArray(reservation.tee_times)
        ? reservation.tee_times[0]
        : reservation.tee_times;
      if (!teeTime) return null;

      const createdAt = new Date(reservation.created_at);
      const teeOff = new Date(teeTime.tee_off);
      const diffDays = (teeOff.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 ? diffDays : null;
    })
    .filter((value): value is number => value !== null);

  const averageLeadTime =
    leadTimes.length > 0
      ? Math.round(leadTimes.reduce((sum, value) => sum + value, 0) / leadTimes.length)
      : null;

  const enrichedUser = {
    ...currentUser,
    segment_type: userData?.segment_type ?? userData?.segment ?? 'FUTURE',
    segment_score: userData?.segment_score ?? 0,
    total_bookings: userData?.total_bookings ?? reservations.length,
    total_spent: userData?.total_spent ?? 0,
    no_show_count: userData?.no_show_count ?? 0,
    no_show_risk_score: userData?.no_show_risk_score ?? 0,
  };

  // Membership/payment/gift/round detail tables are not yet in schema, so keep safe empty states.
  const membership = null;
  const paymentMethods: Array<Record<string, unknown>> = [];
  const gifts: Array<Record<string, unknown>> = [];
  const rounds: Array<Record<string, unknown>> = [];

  const userStats = {
    handicap: null,
    handicap_trend: null,
    avg_score: null,
    driving_distance: null,
    fairway_accuracy: null,
    gir_rate: null,
    total_rounds: completedReservations.length,
    completed_rounds: completedReservations.length,
    best_score: null,
    avg_booking_lead_time: averageLeadTime,
  };

  return (
    <PageCanvas>
      <MyPageTabs
        user={enrichedUser}
        userStats={userStats}
        membership={membership}
        paymentMethods={paymentMethods}
        gifts={gifts}
        rounds={rounds}
      />
    </PageCanvas>
  );
}
