import { redirect } from 'next/navigation';
import MyReservationsClient from '@/components/my/MyReservationsClient';
import PageCanvas from '@/components/layout/PageCanvas';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserWithRoles } from '@/lib/auth/getCurrentUserWithRoles';
import type { Database } from '@/types/database';

type ReservationRow = Database['public']['Tables']['reservations']['Row'];
type TeeTimeRow = Pick<
  Database['public']['Tables']['tee_times']['Row'],
  'id' | 'tee_off' | 'base_price' | 'status' | 'golf_club_id'
>;
type GolfClubRow = Pick<Database['public']['Tables']['golf_clubs']['Row'], 'id' | 'name' | 'location_name'>;
type JoinedReservation = ReservationRow & {
  tee_times: (TeeTimeRow & { golf_clubs: GolfClubRow | GolfClubRow[] | null }) | (TeeTimeRow & { golf_clubs: GolfClubRow | GolfClubRow[] | null })[] | null;
};

export const dynamic = 'force-dynamic';

export default async function MyReservationsPage() {
  const currentUser = await getCurrentUserWithRoles();

  if (!currentUser) {
    redirect('/login?redirect=/my/reservations');
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('reservations')
    .select(
      `
        *,
        tee_times!inner (
          id,
          tee_off,
          base_price,
          status,
          golf_club_id,
          golf_clubs (
            id,
            name,
            location_name
          )
        )
      `
    )
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[MyReservationsPage] Failed to fetch reservations:', error);
  }

  const reservations = ((data || []) as unknown as JoinedReservation[]).map((reservation) => {
    const teeTime = Array.isArray(reservation.tee_times)
      ? reservation.tee_times[0]
      : reservation.tee_times;

    const golfClub = teeTime?.golf_clubs
      ? Array.isArray(teeTime.golf_clubs)
        ? teeTime.golf_clubs[0]
        : teeTime.golf_clubs
      : null;

    return {
      ...reservation,
      tee_times: teeTime
        ? {
            ...teeTime,
            golf_clubs: golfClub
              ? {
                  id: golfClub.id,
                  name: golfClub.name,
                  location_name: golfClub.location_name,
                }
              : null,
          }
        : null,
    };
  });

  return (
    <PageCanvas>
      <MyReservationsClient
        user={currentUser}
        reservations={reservations}
      />
    </PageCanvas>
  );
}
