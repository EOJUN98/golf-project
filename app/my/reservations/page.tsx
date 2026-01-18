/**
 * My Reservations Page
 *
 * Shows user's reservation history with mock data
 * **MOCK DATA MODE**: Uses fake data instead of Supabase
 */

import MyReservationsClient from '@/components/my/MyReservationsClient';

export const dynamic = 'force-dynamic';

export default async function MyReservationsPage() {
  // Mock user data
  const mockUser = {
    id: 'mock-user-1',
    email: 'demo@tugol.dev',
    name: '김골프',
    phone: '010-1234-5678',
    segment_type: 'PRESTIGE',
    roles: ['user'],
  };

  // Mock reservations data
  const mockReservations = [
    {
      id: 1,
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
      payment_key: 'mock-payment-key-1',
      payment_status: 'PAID',
      status: 'CONFIRMED',
      is_imminent_deal: false,
      cancelled_at: null,
      cancel_reason: null,
      refund_amount: null,
      no_show_marked_at: null,
      paid_amount: 144000,
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
        },
      },
    },
    {
      id: 2,
      tee_time_id: 102,
      base_price: 150000,
      final_price: 127500,
      discount_breakdown: {
        weather: 0,
        time: 10,
        lbs: 5,
        segment: 0,
        total: 15,
      },
      payment_key: 'mock-payment-key-2',
      payment_status: 'PAID',
      status: 'COMPLETED',
      is_imminent_deal: false,
      cancelled_at: null,
      cancel_reason: null,
      refund_amount: null,
      no_show_marked_at: null,
      paid_amount: 127500,
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      tee_times: {
        id: 102,
        tee_off: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        base_price: 150000,
        status: 'COMPLETED',
        golf_club_id: 2,
        golf_clubs: {
          id: 2,
          name: '서울컨트리클럽',
          location_name: '서울 강남구',
        },
      },
    },
    {
      id: 3,
      tee_time_id: 103,
      base_price: 200000,
      final_price: 170000,
      discount_breakdown: {
        weather: 5,
        time: 10,
        lbs: 0,
        segment: 0,
        total: 15,
      },
      payment_key: 'mock-payment-key-3',
      payment_status: 'REFUNDED',
      status: 'CANCELLED',
      is_imminent_deal: false,
      cancelled_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
      cancel_reason: '개인 사정으로 취소',
      refund_amount: 153000,
      no_show_marked_at: null,
      paid_amount: 170000,
      created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      tee_times: {
        id: 103,
        tee_off: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        base_price: 200000,
        status: 'CANCELLED',
        golf_club_id: 3,
        golf_clubs: {
          id: 3,
          name: '제주 오션뷰 CC',
          location_name: '제주도',
        },
      },
    },
    {
      id: 4,
      tee_time_id: 104,
      base_price: 160000,
      final_price: 96000,
      discount_breakdown: {
        weather: 20,
        time: 15,
        lbs: 5,
        segment: 0,
        total: 40,
      },
      payment_key: 'mock-payment-key-4',
      payment_status: 'PAID',
      status: 'CONFIRMED',
      is_imminent_deal: true,
      cancelled_at: null,
      cancel_reason: null,
      refund_amount: null,
      no_show_marked_at: null,
      paid_amount: 96000,
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      tee_times: {
        id: 104,
        tee_off: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        base_price: 160000,
        status: 'BOOKED',
        golf_club_id: 1,
        golf_clubs: {
          id: 1,
          name: '인천 클럽72',
          location_name: '인천 서구',
        },
      },
    },
  ];

  return (
    <MyReservationsClient
      user={mockUser as any}
      reservations={mockReservations as any}
    />
  );
}
