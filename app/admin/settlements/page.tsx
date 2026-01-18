/**
 * SDD-07: Admin Settlements List Page
 *
 * Display all settlements with filtering and summary statistics
 */

import { createClient } from '@supabase/supabase-js';
import { SettlementListRow, SettlementFilters } from '@/types/settlement';
import SettlementsList from '@/components/admin/SettlementsList';
import { TrendingUp, DollarSign, Building, Lock } from 'lucide-react';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PageProps {
  searchParams: Promise<{
    golf_club_id?: string;
    status?: string;
    year?: string;
    month?: string;
    period_start?: string;
    period_end?: string;
  }>;
}

async function getSettlements(filters: SettlementFilters): Promise<SettlementListRow[]> {
  try {
    let query = supabase
      .from('settlement_summary')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.golf_club_id) {
      query = query.eq('golf_club_id', filters.golf_club_id);
    }

    if (filters.status && filters.status !== 'ALL') {
      query = query.eq('status', filters.status);
    }

    if (filters.period_start) {
      query = query.gte('period_start', filters.period_start);
    }

    if (filters.period_end) {
      query = query.lte('period_end', filters.period_end);
    }

    // Year/Month filter
    if (filters.year && filters.month) {
      const start = new Date(filters.year, filters.month - 1, 1);
      const end = new Date(filters.year, filters.month, 0);
      query = query
        .gte('period_start', start.toISOString().split('T')[0])
        .lte('period_end', end.toISOString().split('T')[0]);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[getSettlements] Error:', error);
      return [];
    }

    return (data || []) as SettlementListRow[];
  } catch (error) {
    console.error('[getSettlements] Error:', error);
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

async function getSettlementStats() {
  try {
    const { data: settlements } = await supabase
      .from('settlements')
      .select('status, gross_amount, platform_fee, club_payout');

    if (!settlements) {
      return {
        total: 0,
        draft: 0,
        confirmed: 0,
        locked: 0,
        totalGross: 0,
        totalFee: 0,
        totalPayout: 0
      };
    }

    const stats = {
      total: settlements.length,
      draft: settlements.filter(s => s.status === 'DRAFT').length,
      confirmed: settlements.filter(s => s.status === 'CONFIRMED').length,
      locked: settlements.filter(s => s.status === 'LOCKED').length,
      totalGross: settlements.reduce((sum, s) => sum + (s.gross_amount || 0), 0),
      totalFee: settlements.reduce((sum, s) => sum + (s.platform_fee || 0), 0),
      totalPayout: settlements.reduce((sum, s) => sum + (s.club_payout || 0), 0)
    };

    return stats;
  } catch (error) {
    console.error('[getSettlementStats] Error:', error);
    return {
      total: 0,
      draft: 0,
      confirmed: 0,
      locked: 0,
      totalGross: 0,
      totalFee: 0,
      totalPayout: 0
    };
  }
}

export default async function SettlementsListPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;

  const filters: SettlementFilters = {
    golf_club_id: resolvedParams.golf_club_id ? parseInt(resolvedParams.golf_club_id) : undefined,
    status: (resolvedParams.status as any) || 'ALL',
    year: resolvedParams.year ? parseInt(resolvedParams.year) : undefined,
    month: resolvedParams.month ? parseInt(resolvedParams.month) : undefined,
    period_start: resolvedParams.period_start,
    period_end: resolvedParams.period_end
  };

  const settlements = await getSettlements(filters);
  const golfClubs = await getGolfClubs();
  const stats = await getSettlementStats();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">정산 관리 (Settlement & Billing)</h1>
          <p className="text-gray-600 mt-2">
            골프장별 정산 내역을 조회하고 관리합니다
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">전체 정산</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Building className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">초안</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.draft}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">확정</p>
                <p className="text-2xl font-bold text-blue-600">{stats.confirmed}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">잠금</p>
                <p className="text-2xl font-bold text-green-600">{stats.locked}</p>
              </div>
              <Lock className="w-8 h-8 text-green-400" />
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow p-6 mb-6 text-white">
          <h2 className="text-lg font-semibold mb-4">전체 정산 요약</h2>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-blue-200 text-sm">총 결제액</p>
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat('ko-KR', {
                  style: 'currency',
                  currency: 'KRW'
                }).format(stats.totalGross)}
              </p>
            </div>
            <div>
              <p className="text-blue-200 text-sm">플랫폼 수수료</p>
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat('ko-KR', {
                  style: 'currency',
                  currency: 'KRW'
                }).format(stats.totalFee)}
              </p>
            </div>
            <div>
              <p className="text-blue-200 text-sm">골프장 지급액</p>
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat('ko-KR', {
                  style: 'currency',
                  currency: 'KRW'
                }).format(stats.totalPayout)}
              </p>
            </div>
          </div>
        </div>

        {/* Settlements List */}
        <SettlementsList
          initialSettlements={settlements}
          golfClubs={golfClubs}
          initialFilters={filters}
        />
      </div>
    </div>
  );
}
