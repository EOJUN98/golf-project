/**
 * SDD-06: Admin Reservation Detail Page
 *
 * Admin view of reservation with management actions:
 * - View all reservation details
 * - Mark as no-show (if eligible)
 * - Unsuspend user (if suspended)
 */

import { createClient } from '@supabase/supabase-js';
import { canUserCancelReservation } from '@/utils/cancellationPolicyV2';
import { calculateHoursLeft } from '@/utils/reservationDetailHelpers';
import AdminReservationDetail from '@/components/admin/AdminReservationDetail';
import { AdminReservationDetail as AdminReservationDetailType } from '@/types/adminManagement';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getAdminReservationDetail(reservationId: string): Promise<AdminReservationDetailType | null> {
  try {
    // Fetch reservation with all relations
    const { data: reservation, error } = await supabase
      .from('reservations')
      .select(`
        *,
        users!inner(*),
        tee_times!inner(
          *,
          golf_clubs(*)
        )
      `)
      .eq('id', reservationId)
      .single();

    if (error || !reservation) {
      console.error('[getAdminReservationDetail] Error:', error);
      return null;
    }

    // Extract nested data
    const user = Array.isArray(reservation.users) ? reservation.users[0] : reservation.users;
    const teeTime = Array.isArray(reservation.tee_times) ? reservation.tee_times[0] : reservation.tee_times;
    const golfClub = teeTime?.golf_clubs
      ? Array.isArray(teeTime.golf_clubs)
        ? teeTime.golf_clubs[0]
        : teeTime.golf_clubs
      : null;

    // Get policy
    const { data: policy } = await supabase
      .from('cancellation_policies')
      .select('*')
      .eq('name', reservation.policy_version || 'STANDARD_V2')
      .single();

    // Check if can mark as no-show
    const teeOffDate = new Date(teeTime.tee_off);
    const now = new Date();
    const gracePeriodEnd = new Date(teeOffDate.getTime() + 30 * 60 * 1000); // 30 min grace
    const canMarkNoShow =
      reservation.status === 'PAID' &&
      now >= gracePeriodEnd &&
      !reservation.no_show_marked_at;

    // Check if can unsuspend user
    const canUnsuspendUser = user.is_suspended;

    return {
      reservation,
      user,
      teeTime,
      golfClub,
      policy: policy || null,
      canMarkNoShow,
      canUnsuspendUser
    };
  } catch (error) {
    console.error('[getAdminReservationDetail] Error:', error);
    return null;
  }
}

export default async function AdminReservationDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const detail = await getAdminReservationDetail(resolvedParams.id);

  if (!detail) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">예약을 찾을 수 없습니다</h1>
          <p className="text-gray-600">유효하지 않은 예약 ID이거나 삭제된 예약입니다</p>
        </div>
      </div>
    );
  }

  return <AdminReservationDetail detail={detail} />;
}
