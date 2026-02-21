/**
 * SDD-07: Settlement Detail Page
 *
 * Display detailed settlement information with status management
 */

import { redirect } from 'next/navigation';
import { SettlementDetail, SettlementReservationItem } from '@/types/settlement';
import SettlementDetailView from '@/components/admin/SettlementDetailView';
import { createSupabaseAdminClientOptional } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserWithRoles } from '@/lib/auth/getCurrentUserWithRoles';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

export const dynamic = 'force-dynamic';

async function getSettlementsSupabase() {
  const adminClient = createSupabaseAdminClientOptional();
  return adminClient ?? await createSupabaseServerClient();
}

type SettlementsViewer = NonNullable<Awaited<ReturnType<typeof getCurrentUserWithRoles>>>;

function canViewSettlementConsole(user: Awaited<ReturnType<typeof getCurrentUserWithRoles>>): user is SettlementsViewer {
  return Boolean(user && (user.isSuperAdmin || user.isAdmin || user.isClubAdmin));
}

function hasGlobalSettlementAccess(user: SettlementsViewer) {
  return user.isSuperAdmin || user.isAdmin;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getSettlementDetail(
  supabase: Awaited<ReturnType<typeof getSettlementsSupabase>>,
  settlementId: string,
  viewer: SettlementsViewer
): Promise<SettlementDetail | null> {
  try {
    if (!isValidUUID(settlementId)) {
      return null;
    }

    // Fetch settlement with relations
    let settlementQuery = supabase
      .from('settlements')
      .select(`
        *,
        golf_clubs!inner(id, name, location_name),
        created_by_user:users!settlements_created_by_user_id_fkey(id, email, name),
        confirmed_by_user:users!settlements_confirmed_by_user_id_fkey(id, email, name),
        locked_by_user:users!settlements_locked_by_user_id_fkey(id, email, name)
      `)
      .eq('id', settlementId);

    if (!hasGlobalSettlementAccess(viewer)) {
      const clubIds = viewer.clubIds.length > 0 ? viewer.clubIds : [-1];
      settlementQuery = settlementQuery.in('golf_club_id', clubIds);
    }

    const { data: settlement, error: settlementError } = await settlementQuery.single();

    if (settlementError || !settlement) {
      if (settlementError && settlementError.code !== 'PGRST116') {
        console.error('[getSettlementDetail] Settlement error:', settlementError);
      }
      return null;
    }

    // Extract golf club
    const golfClub = Array.isArray(settlement.golf_clubs)
      ? settlement.golf_clubs[0]
      : settlement.golf_clubs;

    // Extract user info
    const createdBy = settlement.created_by_user
      ? Array.isArray(settlement.created_by_user)
        ? settlement.created_by_user[0]
        : settlement.created_by_user
      : null;

    const confirmedBy = settlement.confirmed_by_user
      ? Array.isArray(settlement.confirmed_by_user)
        ? settlement.confirmed_by_user[0]
        : settlement.confirmed_by_user
      : null;

    const lockedBy = settlement.locked_by_user
      ? Array.isArray(settlement.locked_by_user)
        ? settlement.locked_by_user[0]
        : settlement.locked_by_user
      : null;

    // Fetch reservations in this settlement
    const { data: reservations, error: reservationsError } = await supabase
      .from('reservations')
      .select(`
        id,
        user_id,
        tee_time_id,
        status,
        paid_amount,
        refund_amount,
        is_imminent_deal,
        policy_version,
        created_at,
        cancelled_at,
        no_show_marked_at,
        settlement_id,
        users!inner(email, name),
        tee_times!inner(tee_off)
      `)
      .eq('settlement_id', settlementId)
      .order('tee_times.tee_off', { ascending: false });

    if (reservationsError) {
      console.error('[getSettlementDetail] Reservations error:', reservationsError);
    }

    // Transform reservations
    const reservationItems: SettlementReservationItem[] = (reservations || []).map(
      (res: any) => {
        const user = Array.isArray(res.users) ? res.users[0] : res.users;
        const teeTime = Array.isArray(res.tee_times) ? res.tee_times[0] : res.tee_times;

        return {
          id: res.id,
          user_id: res.user_id,
          user_email: user?.email || 'N/A',
          user_name: user?.name || null,
          tee_time_id: res.tee_time_id,
          tee_off: teeTime?.tee_off || '',
          status: res.status,
          paid_amount: res.paid_amount || 0,
          refund_amount: res.refund_amount || 0,
          net_contribution: (res.paid_amount || 0) - (res.refund_amount || 0),
          is_imminent_deal: res.is_imminent_deal || false,
          policy_version: res.policy_version || 'v1',
          created_at: res.created_at,
          cancelled_at: res.cancelled_at,
          no_show_marked_at: res.no_show_marked_at,
          already_settled: true,
          settlement_id: res.settlement_id
        };
      }
    );

    // Resolve action permissions for current viewer role.
    const canConfirm =
      settlement.status === 'DRAFT' &&
      (viewer.isSuperAdmin || viewer.isAdmin || viewer.isClubAdmin);
    const canLock = settlement.status === 'CONFIRMED' && viewer.isSuperAdmin;
    const canEdit =
      settlement.status !== 'LOCKED' &&
      (viewer.isSuperAdmin || viewer.isAdmin || viewer.isClubAdmin);

    return {
      settlement,
      golf_club: {
        id: golfClub.id,
        name: golfClub.name,
        location_name: golfClub.location_name
      },
      reservations: reservationItems,
      created_by: createdBy
        ? {
            id: createdBy.id,
            email: createdBy.email,
            name: createdBy.name
          }
        : null,
      confirmed_by: confirmedBy
        ? {
            id: confirmedBy.id,
            email: confirmedBy.email,
            name: confirmedBy.name
          }
        : null,
      locked_by: lockedBy
        ? {
            id: lockedBy.id,
            email: lockedBy.email,
            name: lockedBy.name
          }
        : null,
      can_confirm: canConfirm,
      can_lock: canLock,
      can_edit: canEdit
    };
  } catch (error) {
    console.error('[getSettlementDetail] Error:', error);
    return null;
  }
}

export default async function SettlementDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const viewer = await getCurrentUserWithRoles();
  if (!viewer) {
    redirect(`/login?redirect=/admin/settlements/${resolvedParams.id}`);
  }
  if (!canViewSettlementConsole(viewer)) {
    redirect('/forbidden');
  }

  if (!isValidUUID(resolvedParams.id)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">정산을 찾을 수 없습니다</h1>
          <p className="text-gray-600">유효하지 않은 정산 ID입니다</p>
        </div>
      </div>
    );
  }

  const supabase = await getSettlementsSupabase();
  const detail = await getSettlementDetail(supabase, resolvedParams.id, viewer);

  if (!detail) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">정산을 찾을 수 없습니다</h1>
          <p className="text-gray-600">유효하지 않은 정산 ID이거나 삭제된 정산입니다</p>
        </div>
      </div>
    );
  }

  return <SettlementDetailView detail={detail} />;
}
