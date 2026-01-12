"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Calendar, Clock, CreditCard, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// [수정 포인트] user_id는 일단 무시하고 모든 예약을 가져오거나, 
// 현재 테스트용 데이터에 맞는 방식으로 필터링을 잠시 해제합니다.
// 나중에 로그인 붙이면 그때 user_id를 살립니다.

interface Reservation {
  id: string; // UUID라서 string으로 변경
  final_price: number;
  discount_breakdown: any;
  // payment_status가 DB에 없을 수도 있으니 optional 처리
  payment_status?: string; 
  created_at: string;
  tee_times: {
    id: number;
    tee_off: string; // DB 컬럼명이 tee_off_time이 아니라 tee_off 일 수 있음 (확인 필요)
    base_price: number;
    status: string;
    // golf_clubs 연결은 복잡하니 일단 제외하거나 단순화
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
        console.log("Fetching reservations...");
        
        // 1. 단순하게 예약 테이블만 먼저 불러옵니다 (Join 없이 테스트)
        // Join이 복잡하면 에러가 잘 나므로, 단계별로 확인합니다.
        const { data, error: fetchError } = await supabase
          .from('reservations')
          .select(`
            id,
            final_price,
            discount_breakdown,
            created_at,
            tee_times (
              id,
              tee_off,
              base_price,
              status
            )
          `)
          .order('created_at', { ascending: false });

        if (fetchError) {
            console.error("Supabase Error:", fetchError);
            throw fetchError;
        }

        console.log("Data fetched:", data);
        setReservations(data as any || []);
      } catch (err) {
        console.error('Error fetching reservations:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch reservations');
      } finally {
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
          <h2 className="text-red-700 font-bold text-lg mb-2">데이터 로드 실패 ㅠㅠ</h2>
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
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} className="text-gray-600">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-gray-900">내 예약 내역</h1>
        </div>
      </header>

      <main className="flex-1 p-6">
        {reservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <Calendar size={48} className="text-gray-400 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">예약 내역이 없습니다</h2>
            <p className="text-gray-600 mb-8">첫 예약을 진행해보세요!</p>
            <button onClick={() => router.push('/')} className="bg-black text-white px-6 py-3 rounded-xl font-bold">
              티타임 보러 가기
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {reservations.map((res) => {
              const teeTime = res.tee_times;
              if (!teeTime) return null;
              
              // 날짜 처리 (DB 컬럼명 차이 대응)
              const teeOffStr = teeTime.tee_off || (teeTime as any).tee_off_time;
              const dateObj = teeOffStr ? new Date(teeOffStr) : new Date();

              return (
                <div key={res.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <Calendar size={16} />
                    <span className="text-sm">{dateObj.toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 mb-4">
                    <Clock size={16} />
                    <span className="text-sm font-bold">{dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div className="border-t border-gray-200 my-4"></div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-blue-600">{res.final_price.toLocaleString()}원</span>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-green-100 text-green-700">예약 완료</span>
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