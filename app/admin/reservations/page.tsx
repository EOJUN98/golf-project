/**
 * SDD-06: Admin Reservations List Page
 *
 * Displays all reservations with filtering and admin actions:
 * - Filter by date range, status, golf club, imminent deal
 * - View reservation details
 * - Quick stats overview
 */

import { Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import AdminReservationsList from '@/components/admin/AdminReservationsList';
import { AdminReservationRow } from '@/types/adminManagement';
import type { Database } from '@/types/database';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    golfClubId?: string;
    userId?: string;
  }>;
}

type ReservationSearchParams = Awaited<PageProps['searchParams']>;
type ReservationRow = Database['public']['Tables']['reservations']['Row'];
type TeeTimeRow = Database['public']['Tables']['tee_times']['Row'];
type GolfClubRow = Database['public']['Tables']['golf_clubs']['Row'];
type UserRow = Pick<
  Database['public']['Tables']['users']['Row'],
  'id' | 'email' | 'name' | 'phone' | 'is_suspended' | 'no_show_count'
>;

type JoinedReservationRow = ReservationRow & {
  tee_times: (TeeTimeRow & { golf_clubs: GolfClubRow | GolfClubRow[] | null }) | (TeeTimeRow & { golf_clubs: GolfClubRow | GolfClubRow[] | null })[] | null;
  users: UserRow | UserRow[] | null;
};

async function getReservations(params: ReservationSearchParams): Promise<AdminReservationRow[]> {
  try {
    let query = supabase
      .from('reservations')
      .select(`
        *,
        users!inner (
          id,
          email,
          name,
          phone,
          is_suspended,
          no_show_count
        ),
        tee_times!inner (
          id,
          tee_off,
          base_price,
          status,
          golf_clubs (
            id,
            name,
            location_name
          )
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (params.userId) {
      query = query.eq('user_id', params.userId);
    }

    if (params.dateFrom) {
      query = query.gte('tee_times.tee_off', params.dateFrom);
    }

    if (params.dateTo) {
      const dateTo = new Date(params.dateTo);
      dateTo.setHours(23, 59, 59, 999);
      query = query.lte('tee_times.tee_off', dateTo.toISOString());
    }

    if (params.status) {
      const statuses = params.status.split(',');
      query = query.in('status', statuses);
    }

    if (params.golfClubId) {
      query = query.eq('tee_times.golf_club_id', parseInt(params.golfClubId));
    }

    const { data, error } = await query;

    if (error) {
      console.error('[getReservations] Error:', error);
      return [];
    }

    // Transform data to AdminReservationRow format
    const transformedData: AdminReservationRow[] = ((data || []) as JoinedReservationRow[]).map((item) => {
      const teeTime = Array.isArray(item.tee_times) ? item.tee_times[0] : item.tee_times;
      const golfClub = teeTime?.golf_clubs
        ? Array.isArray(teeTime.golf_clubs)
          ? teeTime.golf_clubs[0]
          : teeTime.golf_clubs
        : null;
      const user = Array.isArray(item.users) ? item.users[0] : item.users;
      const reservation = item as Database['public']['Tables']['reservations']['Row'];

      return {
        reservation: {
          ...reservation,
          base_price: teeTime?.base_price ?? reservation.base_price,
          paid_amount: reservation.paid_amount ?? reservation.final_price,
        },
        user: {
          id: user?.id || '',
          email: user?.email || '',
          name: user?.name || null,
          phone: user?.phone || null,
          is_suspended: user?.is_suspended || false,
          no_show_count: user?.no_show_count || 0
        },
        teeTime: {
          id: teeTime?.id || 0,
          tee_off: teeTime?.tee_off || '',
          base_price: teeTime?.base_price || 0,
          status: teeTime?.status || ''
        },
        golfClub: {
          id: golfClub?.id || 0,
          name: golfClub?.name || '',
          location_name: golfClub?.location_name || ''
        }
      };
    });

    return transformedData;
  } catch (error) {
    console.error('[getReservations] Error:', error);
    return [];
  }
}

async function getGolfClubs() {
  const { data } = await supabase
    .from('golf_clubs')
    .select('id, name')
    .order('name');
  return data || [];
}

export default async function AdminReservationsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const reservations = await getReservations(resolvedParams);
  const golfClubs = await getGolfClubs();

  // Calculate stats
  const stats = {
    total: reservations.length,
    paid: reservations.filter(r => r.reservation.status === 'PAID').length,
    cancelled: reservations.filter(r => r.reservation.status === 'CANCELLED').length,
    noShow: reservations.filter(r => r.reservation.status === 'NO_SHOW').length,
    imminent: reservations.filter(r => r.reservation.is_imminent_deal).length
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">예약 관리</h1>
          <p className="text-gray-600 mt-2">
            모든 예약을 조회하고 노쇼 처리 등의 관리 작업을 수행합니다
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">전체 예약</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">결제 완료</p>
            <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">취소됨</p>
            <p className="text-2xl font-bold text-orange-600">{stats.cancelled}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">노쇼</p>
            <p className="text-2xl font-bold text-red-600">{stats.noShow}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">임박딜</p>
            <p className="text-2xl font-bold text-purple-600">{stats.imminent}</p>
          </div>
        </div>

        {/* Reservations List */}
        <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin" />}>
          <AdminReservationsList
            initialReservations={reservations}
            golfClubs={golfClubs}
            initialFilters={resolvedParams}
          />
        </Suspense>
      </div>
    </div>
  );
}
