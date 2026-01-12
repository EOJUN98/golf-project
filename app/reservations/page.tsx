"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Calendar, Clock, CreditCard, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Mock user ID - in production this would come from auth
const MOCK_USER_ID = 1;

interface Reservation {
  id: number;
  final_price: number;
  discount_breakdown: any;
  payment_status: string;
  created_at: string;
  tee_times: {
    id: number;
    tee_off_time: string;
    base_price: number;
    status: string;
    golf_clubs: {
      name: string;
      location_name: string;
    } | null;
  } | null;
}

export default function ReservationsPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReservations() {
      try {
        const { data, error: fetchError } = await supabase
          .from('reservations')
          .select(`
            id,
            final_price,
            discount_breakdown,
            payment_status,
            created_at,
            tee_times (
              id,
              tee_off_time,
              base_price,
              status,
              golf_clubs (
                name,
                location_name
              )
            )
          `)
          .eq('user_id', MOCK_USER_ID)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        setReservations(data || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching reservations:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch reservations');
        setLoading(false);
      }
    }

    fetchReservations();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen justify-center items-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen justify-center items-center bg-gray-50 p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-700 font-bold text-lg mb-2">데이터 로드 실패</h2>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 max-w-md mx-auto shadow-2xl">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="text-gray-600 hover:text-black transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-gray-900">내 예약</h1>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-6">
        {reservations.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="bg-gray-100 rounded-full p-6 mb-6">
              <Calendar size={48} className="text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">예약 내역이 없습니다</h2>
            <p className="text-gray-600 mb-8">
              티타임을 예약하고 골프를 즐겨보세요!
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors"
            >
              티타임 둘러보기
            </button>
          </div>
        ) : (
          // Reservations List
          <div className="space-y-4">
            {reservations.map((reservation) => {
              const teeTime = reservation.tee_times;
              if (!teeTime) return null;

              const teeOffDate = new Date(teeTime.tee_off_time);
              const dateStr = teeOffDate.toLocaleDateString('ko-KR', {
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              });
              const timeStr = teeOffDate.toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
              });

              const statusConfig = {
                PENDING: { label: '결제 대기', color: 'bg-yellow-100 text-yellow-700' },
                PAID: { label: '결제 완료', color: 'bg-green-100 text-green-700' },
                CANCELLED: { label: '취소됨', color: 'bg-red-100 text-red-700' },
                REFUNDED: { label: '환불 완료', color: 'bg-gray-100 text-gray-700' },
              };

              const status = statusConfig[reservation.payment_status as keyof typeof statusConfig] || statusConfig.PENDING;

              return (
                <div
                  key={reservation.id}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  {/* Golf Club Name */}
                  {teeTime.golf_clubs && (
                    <div className="text-sm font-bold text-gray-900 mb-2">
                      {teeTime.golf_clubs.name}
                    </div>
                  )}

                  {/* Date & Time */}
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <Calendar size={16} />
                    <span className="text-sm">{dateStr}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 mb-4">
                    <Clock size={16} />
                    <span className="text-sm font-bold">{timeStr}</span>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-200 my-4"></div>

                  {/* Price & Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard size={18} className="text-gray-400" />
                      <span className="text-lg font-black text-blue-600">
                        {reservation.final_price.toLocaleString()}원
                      </span>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                  </div>

                  {/* Discount Info */}
                  {reservation.discount_breakdown && reservation.discount_breakdown.discountAmount > 0 && (
                    <div className="mt-3 text-xs text-gray-500">
                      <span className="line-through">
                        정가 {reservation.discount_breakdown.basePrice.toLocaleString()}원
                      </span>
                      <span className="text-red-600 font-bold ml-2">
                        {reservation.discount_breakdown.discountPercent}% 할인 적용
                      </span>
                    </div>
                  )}

                  {/* Tee Time Status */}
                  {teeTime.status === 'BOOKED' && (
                    <div className="mt-3 flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 size={14} />
                      <span className="font-medium">예약 확정</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
