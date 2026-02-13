import { notFound, redirect } from 'next/navigation';
import PageCanvas from '@/components/layout/PageCanvas';
import ReservationDetailClient from '@/components/my/ReservationDetailClient';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserWithRoles } from '@/lib/auth/getCurrentUserWithRoles';
import type { Database } from '@/types/database';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReservationDetailPage({ params }: PageProps) {
  const currentUser = await getCurrentUserWithRoles();

  if (!currentUser) {
    redirect('/login?redirect=/my/reservations');
  }

  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  type TeeTimeRow = Pick<
    Database['public']['Tables']['tee_times']['Row'],
    'id' | 'tee_off' | 'base_price' | 'status' | 'golf_club_id' | 'weather_condition'
  > & {
    golf_clubs:
      | Pick<Database['public']['Tables']['golf_clubs']['Row'], 'id' | 'name' | 'location_name'>
      | Pick<Database['public']['Tables']['golf_clubs']['Row'], 'id' | 'name' | 'location_name'>[]
      | null;
  };

  type JoinedReservation = Database['public']['Tables']['reservations']['Row'] & {
    tee_times: TeeTimeRow | TeeTimeRow[] | null;
  };

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
          weather_condition,
          golf_clubs (
            id,
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

  const reservation = data as unknown as JoinedReservation;
  if (reservation.status === 'COMPLETED') {
    redirect(`/my/reservations/${id}/review`);
  }

  const teeTime = Array.isArray(reservation.tee_times)
    ? reservation.tee_times[0]
    : reservation.tee_times;

  if (!teeTime) {
    notFound();
  }

  const golfClub = teeTime.golf_clubs
    ? Array.isArray(teeTime.golf_clubs)
      ? teeTime.golf_clubs[0]
      : teeTime.golf_clubs
    : null;

  const teeOff = new Date(teeTime.tee_off);
  const targetDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(teeOff);
  const targetHour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      hour12: false,
    }).format(teeOff)
  );

  let weather: Database['public']['Tables']['weather_cache']['Row'] | null = null;
  const { data: exactWeather } = await supabase
    .from('weather_cache')
    .select('*')
    .eq('target_date', targetDate)
    .eq('target_hour', targetHour)
    .maybeSingle();

  weather = exactWeather;

  if (!weather) {
    const { data: fallbackWeather } = await supabase
      .from('weather_cache')
      .select('*')
      .eq('target_date', targetDate)
      .order('target_hour', { ascending: true })
      .limit(1)
      .maybeSingle();
    weather = fallbackWeather;
  }

  const course = golfClub
    ? {
        id: golfClub.id,
        name: golfClub.name,
        location_name: golfClub.location_name,
        total_length_yards: null,
        course_rating: null,
        slope_rating: null,
        green_speed: null,
        green_type: null,
        course_overview: '코스 상세 정보는 준비 중입니다.',
        course_map_url: null,
        hole_details: [],
      }
    : null;

  const notices: Array<Record<string, unknown>> = [];

  return (
    <PageCanvas>
      <ReservationDetailClient
        user={currentUser}
        reservation={reservation}
        course={course}
        notices={notices}
        weather={weather}
      />
    </PageCanvas>
  );
}
