import { notFound, redirect } from 'next/navigation';
import PageCanvas from '@/components/layout/PageCanvas';
import ReservationReviewClient from '@/components/my/ReservationReviewClient';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserWithRoles } from '@/lib/auth/getCurrentUserWithRoles';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface ReviewReservationRow {
  id: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED' | 'NO_SHOW' | 'COMPLETED';
  tee_times:
    | {
        tee_off: string;
        golf_clubs:
          | {
              name: string;
              location_name: string;
            }
          | {
              name: string;
              location_name: string;
            }[]
          | null;
      }
    | {
        tee_off: string;
        golf_clubs:
          | {
              name: string;
              location_name: string;
            }
          | {
              name: string;
              location_name: string;
            }[]
          | null;
      }[]
    | null;
}

export default async function ReservationReviewPage({ params }: PageProps) {
  const currentUser = await getCurrentUserWithRoles();

  if (!currentUser) {
    redirect('/login?redirect=/my/reservations');
  }

  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('reservations')
    .select(
      `
        id,
        status,
        tee_times!inner (
          tee_off,
          golf_clubs (
            name,
            location_name
          )
        )
      `
    )
    .eq('id', id)
    .eq('user_id', currentUser.id)
    .single();

  if (error || !data) {
    notFound();
  }

  const reservationData = data as unknown as ReviewReservationRow;

  if (reservationData.status !== 'COMPLETED') {
    redirect(`/my/reservations/${id}`);
  }

  const teeTime = Array.isArray(reservationData.tee_times)
    ? reservationData.tee_times[0]
    : reservationData.tee_times;
  const golfClub = teeTime?.golf_clubs
    ? Array.isArray(teeTime.golf_clubs)
      ? teeTime.golf_clubs[0]
      : teeTime.golf_clubs
    : null;

  if (!teeTime || !golfClub) {
    notFound();
  }

  const reservation = {
    id: reservationData.id,
    course_name: golfClub.name,
    location_name: golfClub.location_name,
    tee_off: teeTime.tee_off,
  };

  return (
    <PageCanvas>
      <ReservationReviewClient reservation={reservation} />
    </PageCanvas>
  );
}
