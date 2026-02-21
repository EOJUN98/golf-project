/**
 * SDD-07: Create New Settlement Wizard Page
 *
 * Multi-step wizard for creating new settlements
 */

import { redirect } from 'next/navigation';
import SettlementWizard from '@/components/admin/SettlementWizard';
import { createSupabaseAdminClientOptional } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserWithRoles } from '@/lib/auth/getCurrentUserWithRoles';

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

async function getGolfClubs(
  supabase: Awaited<ReturnType<typeof getSettlementsSupabase>>,
  viewer: SettlementsViewer
) {
  let query = supabase
    .from('golf_clubs')
    .select('id, name, location_name')
    .order('name');

  if (!hasGlobalSettlementAccess(viewer)) {
    const clubIds = viewer.clubIds.length > 0 ? viewer.clubIds : [-1];
    query = query.in('id', clubIds);
  }

  const { data } = await query;
  return data || [];
}

export default async function NewSettlementPage() {
  const viewer = await getCurrentUserWithRoles();
  if (!viewer) {
    redirect('/login?redirect=/admin/settlements/new');
  }
  if (!canViewSettlementConsole(viewer)) {
    redirect('/forbidden');
  }

  const supabase = await getSettlementsSupabase();
  const golfClubs = await getGolfClubs(supabase, viewer);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">새 정산 생성</h1>
          <p className="text-gray-600 mt-2">
            골프장과 기간을 선택하여 정산을 생성합니다
          </p>
        </div>

        {/* Wizard Component */}
        <SettlementWizard golfClubs={golfClubs} />
      </div>
    </div>
  );
}
