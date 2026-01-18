/**
 * SDD-07: Settlements List Client Component
 *
 * Interactive table for viewing and filtering settlements
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SettlementListRow, SettlementFilters } from '@/types/settlement';
import { Search, Filter, Plus, FileText, Calendar, Building2 } from 'lucide-react';

interface Props {
  initialSettlements: SettlementListRow[];
  golfClubs: Array<{ id: number; name: string }>;
  initialFilters: SettlementFilters;
}

export default function SettlementsList({
  initialSettlements,
  golfClubs,
  initialFilters
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<SettlementFilters>(initialFilters);

  const applyFilters = () => {
    const params = new URLSearchParams();

    if (filters.golf_club_id) {
      params.set('golf_club_id', filters.golf_club_id.toString());
    }
    if (filters.status && filters.status !== 'ALL') {
      params.set('status', filters.status);
    }
    if (filters.year) {
      params.set('year', filters.year.toString());
    }
    if (filters.month) {
      params.set('month', filters.month.toString());
    }
    if (filters.period_start) {
      params.set('period_start', filters.period_start);
    }
    if (filters.period_end) {
      params.set('period_end', filters.period_end);
    }

    router.push(`/admin/settlements?${params.toString()}`);
  };

  const resetFilters = () => {
    setFilters({
      status: 'ALL'
    });
    router.push('/admin/settlements');
  };

  // Client-side search filter
  const filteredSettlements = initialSettlements.filter(settlement => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      settlement.golf_club_name.toLowerCase().includes(searchLower) ||
      settlement.id.toLowerCase().includes(searchLower) ||
      settlement.notes?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      DRAFT: { label: '초안', className: 'bg-yellow-100 text-yellow-800' },
      CONFIRMED: { label: '확정', className: 'bg-blue-100 text-blue-800' },
      LOCKED: { label: '잠금', className: 'bg-green-100 text-green-800' }
    };

    const { label, className } = config[status] || {
      label: status,
      className: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${className}`}>
        {label}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const formatPeriod = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (start === end) {
      return startDate.toLocaleDateString('ko-KR');
    }

    return `${startDate.toLocaleDateString('ko-KR')} ~ ${endDate.toLocaleDateString('ko-KR')}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ko-KR');
  };

  // Generate year options (last 3 years + current + next year)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Controls */}
      <div className="p-4 border-b space-y-4">
        {/* Search and Create Button */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="골프장 이름, 정산 ID, 메모로 검색..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            onClick={() => router.push('/admin/settlements/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            새 정산 생성
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              골프장
            </label>
            <select
              value={filters.golf_club_id || ''}
              onChange={e =>
                setFilters({
                  ...filters,
                  golf_club_id: e.target.value ? parseInt(e.target.value) : undefined
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">전체 골프장</option>
              {golfClubs.map(club => (
                <option key={club.id} value={club.id}>
                  {club.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              상태
            </label>
            <select
              value={filters.status || 'ALL'}
              onChange={e => setFilters({ ...filters, status: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">전체 상태</option>
              <option value="DRAFT">초안</option>
              <option value="CONFIRMED">확정</option>
              <option value="LOCKED">잠금</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              년도
            </label>
            <select
              value={filters.year || ''}
              onChange={e =>
                setFilters({
                  ...filters,
                  year: e.target.value ? parseInt(e.target.value) : undefined
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">전체</option>
              {yearOptions.map(year => (
                <option key={year} value={year}>
                  {year}년
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              월
            </label>
            <select
              value={filters.month || ''}
              onChange={e =>
                setFilters({
                  ...filters,
                  month: e.target.value ? parseInt(e.target.value) : undefined
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">전체</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>
                  {month}월
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={applyFilters}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <Filter className="w-4 h-4" />
              필터 적용
            </button>
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              초기화
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                정산 ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                골프장
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                기간
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                총액
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                환불액
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                순액
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                수수료
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                지급액
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                예약 건수
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                생성일
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredSettlements.map(settlement => (
              <tr
                key={settlement.id}
                onClick={() => router.push(`/admin/settlements/${settlement.id}`)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-mono text-gray-900">
                      {settlement.id.slice(0, 8)}...
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {settlement.golf_club_name}
                      </p>
                      {settlement.golf_club_location && (
                        <p className="text-xs text-gray-500">
                          {settlement.golf_club_location}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900">
                      {formatPeriod(settlement.period_start, settlement.period_end)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(settlement.gross_amount)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm text-orange-600">
                    {settlement.refund_amount > 0 ? formatCurrency(settlement.refund_amount) : '-'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(settlement.net_amount)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm text-blue-600">
                    {formatCurrency(settlement.platform_fee)}
                  </span>
                  <p className="text-xs text-gray-500">
                    ({(settlement.commission_rate * 100).toFixed(1)}%)
                  </p>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm font-semibold text-green-600">
                    {formatCurrency(settlement.club_payout)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-sm font-medium text-gray-900">
                    {settlement.reservation_count}건
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {getStatusBadge(settlement.status)}
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm">
                    <p className="text-gray-900">{formatDate(settlement.created_at)}</p>
                    {settlement.created_by_email && (
                      <p className="text-xs text-gray-500">{settlement.created_by_email}</p>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredSettlements.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">정산 내역이 없습니다</p>
            <button
              onClick={() => router.push('/admin/settlements/new')}
              className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
            >
              첫 정산 생성하기
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      {filteredSettlements.length > 0 && (
        <div className="px-4 py-3 border-t bg-gray-50">
          <p className="text-sm text-gray-600">
            총 {filteredSettlements.length}개의 정산
            {search && ` (검색 결과: "${search}")`}
          </p>
        </div>
      )}
    </div>
  );
}
