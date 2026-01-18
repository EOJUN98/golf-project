/**
 * SDD-07: Create New Settlement Wizard Page
 *
 * Multi-step wizard for creating new settlements
 */

import { createClient } from '@supabase/supabase-js';
import SettlementWizard from '@/components/admin/SettlementWizard';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function getGolfClubs() {
  const { data } = await supabase
    .from('golf_clubs')
    .select('id, name, location_name')
    .order('name');
  return data || [];
}

export default async function NewSettlementPage() {
  const golfClubs = await getGolfClubs();

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
