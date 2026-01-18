/**
 * SDD-06: Admin Reservations List Component
 *
 * Client component for displaying and filtering reservations
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminReservationRow } from '@/types/adminManagement';
import { formatCurrency, formatTeeOffTime } from '@/utils/reservationDetailHelpers';
import { Search, Filter, Calendar, X } from 'lucide-react';

interface Props {
  initialReservations: AdminReservationRow[];
  golfClubs: { id: number; name: string }[];
  initialFilters: any;
}

export default function AdminReservationsList({
  initialReservations,
  golfClubs,
  initialFilters
}: Props) {
  const router = useRouter();
  const [filters, setFilters] = useState({
    dateFrom: initialFilters.dateFrom || '',
    dateTo: initialFilters.dateTo || '',
    status: initialFilters.status || '',
    golfClubId: initialFilters.golfClubId || '',
    search: ''
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.status) params.set('status', filters.status);
    if (filters.golfClubId) params.set('golfClubId', filters.golfClubId);

    router.push(`/admin/reservations?${params.toString()}`);
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      status: '',
      golfClubId: '',
      search: ''
    });
    router.push('/admin/reservations');
  };

  // Client-side search filter
  const filteredReservations = initialReservations.filter(row => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      row.user.email.toLowerCase().includes(searchLower) ||
      row.user.name?.toLowerCase().includes(searchLower) ||
      row.golfClub.name.toLowerCase().includes(searchLower) ||
      row.reservation.id.toString().toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      PAID: { label: '결제 완료', className: 'bg-green-100 text-green-800' },
      CANCELLED: { label: '취소됨', className: 'bg-orange-100 text-orange-800' },
      NO_SHOW: { label: '노쇼', className: 'bg-red-100 text-red-800' },
      REFUNDED: { label: '환불 완료', className: 'bg-blue-100 text-blue-800' },
      COMPLETED: { label: '이용 완료', className: 'bg-gray-100 text-gray-800' },
      PENDING: { label: '대기 중', className: 'bg-yellow-100 text-yellow-800' }
    };

    const { label, className } = config[status] || { label: status, className: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${className}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Filters */}
      <div className="p-4 border-b space-y-4">
        <div className="flex gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="이메일, 이름, 골프장 검색..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Date From */}
          <div className="w-48">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date To */}
          <div className="w-48">
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-4">
          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">전체 상태</option>
            <option value="PAID">결제 완료</option>
            <option value="CANCELLED">취소됨</option>
            <option value="NO_SHOW">노쇼</option>
            <option value="REFUNDED">환불 완료</option>
            <option value="COMPLETED">이용 완료</option>
          </select>

          {/* Golf Club Filter */}
          <select
            value={filters.golfClubId}
            onChange={(e) => handleFilterChange('golfClubId', e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">전체 골프장</option>
            {golfClubs.map(club => (
              <option key={club.id} value={club.id}>{club.name}</option>
            ))}
          </select>

          {/* Action Buttons */}
          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            필터 적용
          </button>

          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            초기화
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">예약 ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">사용자</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">골프장</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">티오프</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">금액</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">환불액</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredReservations.map(row => {
              const teeOffFormatted = formatTeeOffTime(row.teeTime.tee_off);

              return (
                <tr
                  key={row.reservation.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/admin/reservations/${row.reservation.id}`)}
                >
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {row.reservation.id.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">{row.user.name || row.user.email}</p>
                      <p className="text-gray-500">{row.user.email}</p>
                      {row.user.is_suspended && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 mt-1">
                          🔒 정지됨
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {row.golfClub.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div>
                      <p>{teeOffFormatted.date}</p>
                      <p className="text-gray-500">{teeOffFormatted.time}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {getStatusBadge(row.reservation.status)}
                      {row.reservation.is_imminent_deal && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          🔥 임박딜
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {formatCurrency(row.reservation.final_price)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {row.reservation.refund_amount > 0
                      ? formatCurrency(row.reservation.refund_amount)
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/admin/reservations/${row.reservation.id}`);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      상세 보기
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredReservations.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">예약이 없습니다</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t bg-gray-50">
        <p className="text-sm text-gray-600">
          총 {filteredReservations.length}개의 예약
        </p>
      </div>
    </div>
  );
}
