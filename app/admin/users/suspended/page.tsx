/**
 * SDD-06: Admin Suspended Users Page
 *
 * Displays all suspended users with management actions:
 * - View suspension details
 * - Unsuspend users
 * - View user reservations
 */

import { Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { canUserBook } from '@/utils/cancellationPolicyV2';
import AdminSuspendedUsersList from '@/components/admin/AdminSuspendedUsersList';
import { AdminUserRow } from '@/types/adminManagement';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PageProps {
  searchParams: Promise<{
    includeExpired?: string;
  }>;
}

async function getSuspendedUsers(includeExpired: boolean = false): Promise<AdminUserRow[]> {
  try {
    let query = supabase
      .from('users')
      .select('*')
      .eq('is_suspended', true)
      .order('suspended_at', { ascending: false });

    // Filter out expired suspensions if not included
    if (!includeExpired) {
      const now = new Date().toISOString();
      query = query.or(`suspension_expires_at.is.null,suspension_expires_at.gt.${now}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[getSuspendedUsers] Error:', error);
      return [];
    }

    // Check booking eligibility for each user
    const usersWithEligibility = await Promise.all(
      (data || []).map(async (user) => {
        const bookingCheck = await canUserBook(user.id, supabase);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          is_suspended: user.is_suspended,
          suspended_reason: user.suspended_reason,
          suspended_at: user.suspended_at,
          suspension_expires_at: user.suspension_expires_at,
          no_show_count: user.no_show_count || 0,
          total_bookings: user.total_bookings || 0,
          canBook: bookingCheck.canBook
        };
      })
    );

    return usersWithEligibility;
  } catch (error) {
    console.error('[getSuspendedUsers] Error:', error);
    return [];
  }
}

export default async function AdminSuspendedUsersPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const includeExpired = resolvedParams.includeExpired === 'true';
  const suspendedUsers = await getSuspendedUsers(includeExpired);

  // Calculate stats
  const now = new Date();
  const stats = {
    total: suspendedUsers.length,
    permanent: suspendedUsers.filter(u => !u.suspension_expires_at).length,
    temporary: suspendedUsers.filter(u => u.suspension_expires_at).length,
    expired: suspendedUsers.filter(u =>
      u.suspension_expires_at && new Date(u.suspension_expires_at) < now
    ).length,
    noShowReason: suspendedUsers.filter(u =>
      u.suspended_reason?.includes('no-show') || u.suspended_reason?.includes('노쇼')
    ).length
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">정지된 사용자 관리</h1>
          <p className="text-gray-600 mt-2">
            노쇼 등으로 인해 이용이 제한된 사용자를 관리합니다
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">전체 정지</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">영구 정지</p>
            <p className="text-2xl font-bold text-red-600">{stats.permanent}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">임시 정지</p>
            <p className="text-2xl font-bold text-orange-600">{stats.temporary}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">만료됨</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.expired}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">노쇼 사유</p>
            <p className="text-2xl font-bold text-purple-600">{stats.noShowReason}</p>
          </div>
        </div>

        {/* Suspended Users List */}
        <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin" />}>
          <AdminSuspendedUsersList
            suspendedUsers={suspendedUsers}
            includeExpired={includeExpired}
          />
        </Suspense>
      </div>
    </div>
  );
}
