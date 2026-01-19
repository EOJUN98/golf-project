'use client';

/**
 * SDD-09: My Reservations Client Component
 *
 * Displays user's reservation history with status badges and filtering
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle,
  XCircle,
  Ban,
  RefreshCcw,
  Zap,
  Home
} from 'lucide-react';
import type { UserWithRoles } from '@/lib/auth/getCurrentUserWithRoles';

interface Reservation {
  id: string;
  tee_time_id: number;
  base_price: number;
  final_price: number;
  discount_breakdown: any;
  payment_key: string | null;
  payment_status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';
  status: 'PENDING' | 'PAID' | 'CONFIRMED' | 'CANCELLED' | 'REFUNDED' | 'NO_SHOW' | 'COMPLETED';
  is_imminent_deal: boolean;
  cancelled_at: string | null;
  cancel_reason: string | null;
  refund_amount: number;
  no_show_marked_at: string | null;
  paid_amount: number;
  created_at: string;
  tee_times: {
    id: number;
    tee_off: string;
    base_price: number;
    status: string;
    golf_club_id: number;
    golf_clubs: {
      id: number;
      name: string;
      location_name: string;
    } | null;
  } | null;
}

interface MyReservationsClientProps {
  user: UserWithRoles;
  reservations: Reservation[];
}

export default function MyReservationsClient({ user, reservations }: MyReservationsClientProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Filter reservations by status
  const filteredReservations = statusFilter === 'ALL'
    ? reservations
    : reservations.filter(r => r.status === statusFilter);

  // Status badge helper
  const getStatusBadge = (status: Reservation['status']) => {
    switch (status) {
      case 'PAID':
      case 'CONFIRMED':
        return (
          <span className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-green-100 text-green-700">
            <CheckCircle size={14} />
            결제완료
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-700">
            <CheckCircle size={14} />
            이용완료
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-gray-100 text-gray-700">
            <XCircle size={14} />
            취소됨
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-purple-100 text-purple-700">
            <RefreshCcw size={14} />
            환불완료
          </span>
        );
      case 'NO_SHOW':
        return (
          <span className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-red-100 text-red-700">
            <Ban size={14} />
            노쇼
          </span>
        );
      case 'PENDING':
        return (
          <span className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-yellow-100 text-yellow-700">
            <AlertCircle size={14} />
            결제대기
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-y-auto pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')} className="text-gray-600 hover:text-gray-900">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold text-gray-900">내 예약</h1>
          </div>
          <div className="text-sm text-gray-600">
            총 <span className="font-bold text-green-600">{reservations.length}</span>건
          </div>
        </div>

        {/* Suspension Warning */}
        {user.isSuspended && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
              <div className="text-sm">
                <p className="font-bold text-red-900 mb-1">계정 정지 중</p>
                <p className="text-red-700">
                  노쇼 등 정책 위반으로 인해 계정이 일시적으로 정지되었습니다.
                  새 예약이 제한됩니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {[
            { value: 'ALL', label: '전체' },
            { value: 'PAID', label: '결제완료' },
            { value: 'COMPLETED', label: '이용완료' },
            { value: 'CANCELLED', label: '취소' },
            { value: 'NO_SHOW', label: '노쇼' }
          ].map(filter => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === filter.value
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        {filteredReservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <Calendar size={48} className="text-gray-400 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {statusFilter === 'ALL' ? '예약 내역이 없습니다' : `${statusFilter} 예약이 없습니다`}
            </h2>
            <p className="text-gray-600 mb-8">
              {statusFilter === 'ALL' ? '첫 예약을 진행해보세요!' : '다른 필터를 선택해보세요.'}
            </p>
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors"
            >
              <Home size={20} />
              티타임 보러 가기
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReservations.map(res => {
              const teeTime = res.tee_times;
              if (!teeTime) return null;

              const golfClub = teeTime.golf_clubs;
              const dateObj = new Date(teeTime.tee_off);

              return (
                <div
                  key={res.id}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    // Navigate based on status
                    if (res.status === 'COMPLETED') {
                      router.push(`/my/reservations/${res.id}/review`);
                    } else if (
                      res.status === 'PAID' ||
                      res.status === 'CONFIRMED' ||
                      res.status === 'PENDING'
                    ) {
                      router.push(`/my/reservations/${res.id}`);
                    }
                  }}
                >
                  {/* Golf Club Info */}
                  {golfClub && (
                    <div className="flex items-center gap-2 text-gray-700 mb-3">
                      <MapPin size={16} className="text-green-600" />
                      <span className="font-bold">{golfClub.name}</span>
                      <span className="text-xs text-gray-500">({golfClub.location_name})</span>
                    </div>
                  )}

                  {/* Tee Time Info */}
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar size={16} />
                      <span className="text-sm font-medium">
                        {dateObj.toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          weekday: 'short'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock size={16} />
                      <span className="text-sm font-bold">
                        {dateObj.toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Imminent Deal Badge */}
                  {res.is_imminent_deal && (
                    <div className="mb-3">
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-300">
                        <Zap size={12} />
                        임박딜
                      </span>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="border-t border-gray-200 my-4"></div>

                  {/* Price and Status */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">
                        결제금액
                      </div>
                      <div className="text-lg font-black text-green-600">
                        {res.final_price.toLocaleString()}원
                      </div>
                      {res.base_price !== res.final_price && (
                        <div className="text-xs text-gray-400 line-through">
                          {res.base_price.toLocaleString()}원
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      {getStatusBadge(res.status)}
                      {res.status === 'REFUNDED' && res.refund_amount > 0 && (
                        <div className="text-xs text-purple-600 mt-1 font-medium">
                          환불 {res.refund_amount.toLocaleString()}원
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cancel/No-Show Info */}
                  {res.cancelled_at && (
                    <div className="mt-3 text-xs text-gray-500">
                      취소일: {new Date(res.cancelled_at).toLocaleDateString('ko-KR')}
                      {res.cancel_reason && (
                        <div className="mt-1 text-gray-600">사유: {res.cancel_reason}</div>
                      )}
                    </div>
                  )}
                  {res.no_show_marked_at && (
                    <div className="mt-3 text-xs text-red-600">
                      노쇼 처리: {new Date(res.no_show_marked_at).toLocaleDateString('ko-KR')}
                    </div>
                  )}

                  {/* Booking Date */}
                  <div className="mt-3 text-xs text-gray-400">
                    예약일: {new Date(res.created_at).toLocaleDateString('ko-KR')}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

    </div>
  );
}
