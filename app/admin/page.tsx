"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Settings,
  Save,
  Power,
  CloudRain,
  Ban,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface TeeTime {
  id: number;
  tee_off: string;
  base_price: number;
  status: 'OPEN' | 'BOOKED' | 'BLOCKED';
  weather_condition: any;
}

export default function AdminPage() {
  const [teeTimes, setTeeTimes] = useState<TeeTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  
  // 통계 상태
  const [stats, setStats] = useState({ totalRevenue: 0, bookedCount: 0 });

  // 1. 진짜 데이터 불러오기
  const fetchData = async () => {
    setLoading(true);
    try {
      // 티타임 목록
      const { data: times, error: timeError } = await supabase
        .from('tee_times')
        .select('*')
        .order('tee_off', { ascending: true });

      if (timeError) throw timeError;

      // 매출 통계
      const { data: res } = await supabase
        .from('reservations')
        .select('final_price');
      
      const total = res?.reduce((acc, curr) => acc + curr.final_price, 0) || 0;
      const booked = times?.filter(t => t.status === 'BOOKED').length || 0;

      setTeeTimes(times || []);
      setStats({ totalRevenue: total, bookedCount: booked });

    } catch (err) {
      console.error('Fetch error:', err);
      alert('데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. 상태 변경 (차단/해제) 핸들러
  const toggleBlockStatus = async (id: number, currentStatus: string) => {
    if (currentStatus === 'BOOKED') return alert('이미 예약된 건은 수정할 수 없습니다.');
    
    setProcessingId(id);
    const newStatus = currentStatus === 'OPEN' ? 'BLOCKED' : 'OPEN';

    try {
      const { error } = await supabase
        .from('tee_times')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      // 화면 즉시 갱신 (낙관적 업데이트)
      setTeeTimes(prev => prev.map(t => 
        t.id === id ? { ...t, status: newStatus as any } : t
      ));

    } catch (err) {
      alert('상태 변경 실패');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="text-yellow-500" />
            TUGOL Control Tower
          </h1>
          <p className="text-gray-400 text-sm mt-1">관리자 대시보드 (Supabase 연동됨)</p>
        </div>
        <div className="flex gap-4">
            <div className="bg-gray-800 px-4 py-2 rounded-lg text-sm font-bold flex items-center border border-gray-600">
                💰 총 매출: {stats.totalRevenue.toLocaleString()}원
            </div>
            <button 
                onClick={fetchData}
                className="bg-blue-900 px-4 py-2 rounded-lg text-sm font-bold flex items-center hover:bg-blue-800 transition-colors"
            >
                <RefreshCw size={16} className="mr-2" /> 새로고침
            </button>
        </div>
      </div>

      {/* 컨트롤 패널 (현재는 비주얼용, 추후 기능 연결) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-6 rounded-2xl bg-gray-800 border border-green-500/50">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold text-green-400">🤖 AI Pricing Engine</h2>
            <Power className="text-green-500" />
          </div>
          <p className="text-gray-400 text-sm">현재 알고리즘이 정상 작동 중입니다.</p>
        </div>
        <div className="p-6 rounded-2xl bg-gray-800 border border-gray-600 opacity-70">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold text-gray-400">🚨 Emergency Stop</h2>
            <Ban className="text-gray-500" />
          </div>
          <p className="text-gray-500 text-sm">기능 준비 중입니다.</p>
        </div>
      </div>

      {/* 티타임 관리 테이블 */}
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
        <h2 className="text-xl font-bold mb-4 flex items-center">
           ⛳️ 티타임 관리 (Live Data)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700 text-sm">
                <th className="p-3">시간</th>
                <th className="p-3">날씨 정보</th>
                <th className="p-3">기준 가격</th>
                <th className="p-3">상태 관리</th>
              </tr>
            </thead>
            <tbody>
              {teeTimes.map((item) => {
                const timeStr = new Date(item.tee_off).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const isRain = item.weather_condition?.rainProb >= 50;

                return (
                  <tr key={item.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="p-4 font-bold text-lg">{timeStr}</td>
                    <td className="p-4 text-sm text-gray-400">
                        {isRain ? (
                            <span className="flex items-center text-blue-400 gap-1"><CloudRain size={14}/> 비 예보</span>
                        ) : (
                            <span className="text-gray-500">맑음</span>
                        )}
                    </td>
                    <td className="p-4">{item.base_price.toLocaleString()}원</td>
                    <td className="p-4">
                        {item.status === 'BOOKED' ? (
                            <span className="text-blue-400 font-bold flex items-center gap-1">
                                ✅ 예약됨
                            </span>
                        ) : (
                            <button
                                onClick={() => toggleBlockStatus(item.id, item.status)}
                                disabled={processingId === item.id}
                                className={`px-3 py-1 rounded text-sm font-bold border transition-colors
                                    ${item.status === 'BLOCKED' 
                                        ? 'bg-red-900/50 text-red-400 border-red-500 hover:bg-red-900' 
                                        : 'bg-green-900/30 text-green-400 border-green-600 hover:bg-green-900/50'
                                    }`}
                            >
                                {processingId === item.id ? '처리중...' : (
                                    item.status === 'BLOCKED' ? '⛔️ 차단 해제' : '🟢 판매 중'
                                )}
                            </button>
                        )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {teeTimes.length === 0 && (
              <div className="p-8 text-center text-gray-500">데이터가 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}