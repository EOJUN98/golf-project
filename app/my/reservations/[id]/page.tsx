/**
 * Reservation Detail Page
 *
 * Shows complete reservation information with mock data
 * **MOCK DATA MODE**: Uses fake data instead of Supabase
 */

import ReservationDetailClient from '@/components/my/ReservationDetailClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReservationDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Mock user
  const mockUser = {
    id: 'mock-user-1',
    email: 'demo@tugol.dev',
    name: '김골프',
    roles: ['user'],
  };

  // Mock reservation data based on ID
  const mockReservation = {
    id: parseInt(id),
    user_id: 'mock-user-1',
    tee_time_id: 101,
    base_price: 180000,
    final_price: 144000,
    discount_breakdown: {
      weather: 10,
      time: 5,
      lbs: 0,
      segment: 5,
      total: 20,
    },
    payment_status: 'PAID',
    status: 'CONFIRMED',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    tee_times: {
      id: 101,
      tee_off: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      base_price: 180000,
      status: 'BOOKED',
      golf_club_id: 1,
      golf_clubs: {
        id: 1,
        name: '인천 클럽72',
        location_name: '인천 서구',
        location_lat: 37.4563,
        location_lng: 126.6345,
      },
    },
  };

  // Mock course details
  const mockCourseDetails = {
    id: 1,
    golf_club_id: 1,
    course_name: '인천 클럽72 메인 코스',
    total_length: 6842,
    par: 72,
    green_speed: 10.5,
    green_type: 'Bent Grass',
    slope_rating: 128,
    course_rating: 72.5,
    course_map_url: null,
    hole_details: [
      { hole: 1, par: 4, length: 385, handicap: 7 },
      { hole: 2, par: 3, length: 165, handicap: 15 },
      { hole: 3, par: 5, length: 520, handicap: 3 },
      { hole: 4, par: 4, length: 410, handicap: 5 },
    ],
  };

  // Mock course notices
  const mockNotices = [
    {
      id: 1,
      golf_club_id: 1,
      notice_type: 'MAINTENANCE',
      severity: 'INFO',
      title: '7번 홀 그린 보수 작업',
      description: '7번 홀 그린 일부 구역 보수 중입니다. 임시 그린을 사용하세요.',
      valid_from: new Date().toISOString(),
      valid_until: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: true,
    },
  ];

  // Mock weather forecast
  const mockWeather = {
    temperature: 22,
    weather_condition: '맑음',
    wind_speed: 5,
    wind_direction: '서풍',
    rain_probability: 10,
    rainfall_amount: 0,
  };

  return (
    <ReservationDetailClient
      user={mockUser as any}
      reservation={mockReservation as any}
      course={mockCourseDetails as any}
      notices={mockNotices}
      weather={mockWeather}
    />
  );
}
