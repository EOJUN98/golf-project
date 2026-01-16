"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Settings,
  Power,
  CloudRain,
  Ban,
  RefreshCw
} from 'lucide-react';
import { Database } from '@/types/database';

type TeeTime = Database['public']['Tables']['tee_times']['Row'];

interface AdminDashboardProps {
  initialTeeTimes: TeeTime[];
  stats: { 
    totalRevenue: number; 
    bookedCount: number;
    chartData: { date: string; amount: number }[];
  };
}

export default function AdminDashboard({ initialTeeTimes, stats }: AdminDashboardProps) {
  const [teeTimes, setTeeTimes] = useState<TeeTime[]>(initialTeeTimes);
  const [processingId, setProcessingId] = useState<number | null>(null);

  // Calculate max value for chart scaling
  const maxRevenue = Math.max(...stats.chartData.map(d => d.amount), 1);

  const toggleBlockStatus = async (id: number, currentStatus: string) => {
    if (currentStatus === 'BOOKED') return alert('이미 예약된 건은 수정할 수 없습니다.');
    
    setProcessingId(id);
    const newStatus = currentStatus === 'OPEN' ? 'BLOCKED' : 'OPEN';

    try {
      const { error } = await (supabase as any)
        .from('tee_times')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setTeeTimes(prev => prev.map(t =>
        t.id === id ? { ...t, status: newStatus as any } : t
      ));

    } catch (err) {
      alert('상태 변경 실패');
    } finally {
      setProcessingId(null);
    }
  };

  const updateBasePrice = async (id: number, currentPrice: number) => {
    const newPriceStr = window.prompt('새로운 기준 가격을 입력하세요 (원):', currentPrice.toString());
    if (!newPriceStr) return;

    const newPrice = parseInt(newPriceStr, 10);
    if (isNaN(newPrice) || newPrice < 0) return alert('유효한 가격이 아닙니다.');

    setProcessingId(id);
    try {
        const { error } = await (supabase as any)
            .from('tee_times')
            .update({ base_price: newPrice })
            .eq('id', id);

        if (error) throw error;

        setTeeTimes(prev => prev.map(t =>
            t.id === id ? { ...t, base_price: newPrice } : t
        ));
    } catch (err) {
        alert('가격 수정 실패');
    } finally {
        setProcessingId(null);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

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
                onClick={handleRefresh}
                className="bg-blue-900 px-4 py-2 rounded-lg text-sm font-bold flex items-center hover:bg-blue-800 transition-colors"
            >
                <RefreshCw size={16} className="mr-2" /> 새로고침
            </button>
        </div>
      </div>

      {/* 매출 차트 & 컨트롤 패널 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* 매출 차트 */}
        <div className="lg:col-span-2 bg-gray-800 p-6 rounded-2xl border border-gray-700">
             <h2 className="text-xl font-bold mb-4 flex items-center">📊 일별 매출 추이</h2>
             <div className="h-40 flex items-end gap-2">
                {stats.chartData.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">데이터가 없습니다</div>
                ) : (
                    stats.chartData.map((d, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center group">
                            <div 
                                className="w-full bg-blue-500 rounded-t-md transition-all group-hover:bg-blue-400 relative"
                                style={{ height: `${(d.amount / maxRevenue) * 100}%` }}
                            >
                                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-gray-600 z-10">
                                    {d.amount.toLocaleString()}원
                                </div>
                            </div>
                            <div className="mt-2 text-xs text-gray-400">{d.date}</div>
                        </div>
                    ))
                )}
             </div>
        </div>

        {/* 컨트롤 패널 */}
        <div className="flex flex-col gap-4">
            <div className="p-5 rounded-2xl bg-gray-800 border border-green-500/50 flex-1">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-bold text-green-400">🤖 AI Pricing Engine</h2>
                    <Power className="text-green-500" />
                </div>
                <p className="text-gray-400 text-sm">현재 알고리즘이 정상 작동 중입니다.</p>
            </div>
            
            <div className="flex gap-4">
                 <button 
                    onClick={async () => {
                        if(!confirm('모든 티타임의 날씨 정보를 랜덤하게 변경하시겠습니까?')) return;
                        try {
                            await fetch('/api/admin/simulate-weather', { method: 'POST' });
                            alert('날씨 시뮬레이션 완료! 새로고침하세요.');
                            window.location.reload();
                        } catch(e) { alert('오류 발생'); }
                    }}
                    className="flex-1 p-5 rounded-2xl bg-blue-900/40 border border-blue-500/50 hover:bg-blue-900/60 transition-colors text-left"
                >
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-lg font-bold text-blue-400">🌦 Weather Sim</h2>
                        <CloudRain size={20} className="text-blue-500" />
                    </div>
                    <p className="text-blue-200/60 text-xs">데모용 날씨 랜덤 변경</p>
                </button>

                <div className="flex-1 p-5 rounded-2xl bg-gray-800 border border-gray-600 opacity-70 text-left">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-lg font-bold text-gray-400">🚨 Stop</h2>
                        <Ban className="text-gray-500" />
                    </div>
                    <p className="text-gray-500 text-xs">준비 중</p>
                </div>
            </div>
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
                <th className="p-3">기준 가격 (Override)</th>
                <th className="p-3">상태 관리</th>
              </tr>
            </thead>
            <tbody>
              {teeTimes.map((item) => {
                const timeStr = new Date(item.tee_off).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const weather: any = item.weather_condition || {}; // Parse JSONB
                const isRain = weather.rn1 > 0 || weather.sky === 'RAIN';

                return (
                  <tr key={item.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="p-4 font-bold text-lg">{timeStr}</td>
                    <td className="p-4 text-sm text-gray-400">
                        {isRain ? (
                            <span className="flex items-center text-blue-400 gap-1"><CloudRain size={14}/> 비 ({weather.rn1 || 0}mm)</span>
                        ) : (
                            <span className="text-gray-500">{weather.sky || '정보 없음'}</span>
                        )}
                    </td>
                    <td className="p-4">
                        <button 
                            onClick={() => updateBasePrice(item.id, item.base_price)}
                            className="flex items-center gap-2 hover:bg-gray-700 px-2 py-1 rounded transition-colors"
                        >
                            <span className="font-mono text-yellow-400">{item.base_price.toLocaleString()}원</span>
                            <span className="text-xs text-gray-500">✏️ 수정</span>
                        </button>
                    </td>
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
