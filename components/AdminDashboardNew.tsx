"use client";

import React, { useState } from 'react';
import {
  Settings,
  Power,
  CloudRain,
  Ban,
  RefreshCw,
  BarChart3,
  Calendar,
  Users
} from 'lucide-react';
import { Database } from '@/types/database';
import AdminUserManagement from './AdminUserManagement';

type TeeTime = Database['public']['Tables']['tee_times']['Row'];
type UserRow = Database['public']['Tables']['users']['Row'];

interface AdminDashboardProps {
  initialTeeTimes: TeeTime[];
  initialUsers: UserRow[];
  stats: {
    totalRevenue: number;
    bookedCount: number;
    chartData: { date: string; amount: number }[];
    revenue: {
      lookbackDays: number;
      status: 'ok' | 'empty' | 'error';
      message: string | null;
    };
    pricingEngine: {
      status: 'healthy' | 'degraded' | 'unavailable';
      message: string;
      sampleTeeTimeId: number | null;
    };
  };
  dataStatus?: {
    usingServiceRole: boolean;
    errors: { teeTimes?: string; reservations?: string; users?: string };
  };
}

type TabType = 'overview' | 'tee-times' | 'users';

const KST_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function formatKstDateTime(isoString: string) {
  return KST_DATE_TIME_FORMATTER.format(new Date(isoString));
}

export default function AdminDashboard({ initialTeeTimes, initialUsers, stats, dataStatus }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [teeTimes, setTeeTimes] = useState<TeeTime[]>(initialTeeTimes);
  const [processingId, setProcessingId] = useState<number | null>(null);

  // Calculate max value for chart scaling
  const maxRevenue = Math.max(...stats.chartData.map((d) => d.amount), 0);

  async function patchAdminTeeTime(body: unknown) {
    const res = await fetch('/api/admin/tee-times', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      const message =
        typeof payload?.error?.message === 'string'
          ? payload.error.message
          : typeof payload?.error === 'string'
            ? payload.error
            : 'Request failed';
      throw new Error(message);
    }
  }

  const toggleBlockStatus = async (id: number, currentStatus: string) => {
    if (currentStatus === 'BOOKED') return alert('이미 예약된 건은 수정할 수 없습니다.');

    setProcessingId(id);
    const newStatus = currentStatus === 'OPEN' ? 'BLOCKED' : 'OPEN';

    try {
      await patchAdminTeeTime({ action: 'set-status', id, status: newStatus });

      setTeeTimes(prev => prev.map(t =>
        t.id === id ? { ...t, status: newStatus as any } : t
      ));

    } catch (err) {
      const message = err instanceof Error ? err.message : '상태 변경 실패';
      alert(message);
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
      await patchAdminTeeTime({ action: 'update-base-price', id, base_price: newPrice });

      setTeeTimes(prev => prev.map(t =>
        t.id === id ? { ...t, base_price: newPrice, current_price: newPrice } : t
      ));
    } catch (err) {
      const message = err instanceof Error ? err.message : '가격 수정 실패';
      alert(message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const TABS: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: '대시보드', icon: <BarChart3 size={18} /> },
    { key: 'tee-times', label: '티타임 관리', icon: <Calendar size={18} /> },
    { key: 'users', label: '사용자 관리', icon: <Users size={18} /> },
  ];

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

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-700">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 font-bold transition-all ${activeTab === tab.key
              ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800/50'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div>
          {dataStatus && (!dataStatus.usingServiceRole || Object.keys(dataStatus.errors).length > 0) && (
            <div className="mb-6 rounded-xl border border-yellow-600/50 bg-yellow-900/20 px-4 py-3 text-sm text-yellow-100">
              <div className="font-bold">데이터 조회 상태</div>
              {!dataStatus.usingServiceRole && (
                <div className="mt-1 text-yellow-200">
                  SUPABASE_SERVICE_ROLE_KEY가 없으면 매출/유저/집계가 RLS 때문에 비어 보일 수 있습니다.
                </div>
              )}
              {dataStatus.errors.reservations && <div className="mt-1">reservations: {dataStatus.errors.reservations}</div>}
              {dataStatus.errors.users && <div className="mt-1">users: {dataStatus.errors.users}</div>}
              {dataStatus.errors.teeTimes && <div className="mt-1">tee_times: {dataStatus.errors.teeTimes}</div>}
            </div>
          )}
          {/* 매출 차트 & 컨트롤 패널 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* 매출 차트 */}
            <div className="lg:col-span-2 bg-gray-800 p-6 rounded-2xl border border-gray-700">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                📊 일별 매출 추이 (최근 {stats.revenue.lookbackDays}일)
              </h2>
              <div className="h-40 flex items-end gap-2">
                {stats.revenue.status === 'error' ? (
                  <div className="w-full h-full flex items-center justify-center text-red-300">
                    조회 실패: {stats.revenue.message || 'reservations 조회 오류'}
                  </div>
                ) : (
                  stats.chartData.map((d, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center group">
                      <div
                        className={`w-full rounded-t-md transition-all relative ${
                          stats.revenue.status === 'empty'
                            ? 'bg-gray-600'
                            : 'bg-blue-500 group-hover:bg-blue-400'
                        }`}
                        style={{
                          height: `${maxRevenue > 0 ? Math.max((d.amount / maxRevenue) * 100, 2) : 2}%`,
                        }}
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
              {stats.revenue.status === 'empty' && (
                <p className="mt-3 text-xs text-gray-400">
                  {stats.revenue.message || '최근 기간 예약 데이터가 없어 0원 기준 차트로 표시됩니다.'}
                </p>
              )}
            </div>

            {/* 컨트롤 패널 */}
            <div className="flex flex-col gap-4">
              <div
                className={`p-5 rounded-2xl flex-1 ${
                  stats.pricingEngine.status === 'healthy'
                    ? 'bg-gray-800 border border-green-500/50'
                    : stats.pricingEngine.status === 'degraded'
                      ? 'bg-gray-800 border border-amber-500/50'
                      : 'bg-gray-800 border border-gray-600/70'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <h2
                    className={`text-xl font-bold ${
                      stats.pricingEngine.status === 'healthy'
                        ? 'text-green-400'
                        : stats.pricingEngine.status === 'degraded'
                          ? 'text-amber-300'
                          : 'text-gray-300'
                    }`}
                  >
                    🤖 AI Pricing Engine
                  </h2>
                  <Power
                    className={
                      stats.pricingEngine.status === 'healthy'
                        ? 'text-green-500'
                        : stats.pricingEngine.status === 'degraded'
                          ? 'text-amber-400'
                          : 'text-gray-500'
                    }
                  />
                </div>
                <p className="text-gray-300 text-sm">{stats.pricingEngine.message}</p>
                {stats.pricingEngine.sampleTeeTimeId && (
                  <p className="mt-2 text-xs text-gray-400">샘플 티타임 ID: {stats.pricingEngine.sampleTeeTimeId}</p>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={async () => {
                    if (!confirm('모든 티타임의 날씨 정보를 랜덤하게 변경하시겠습니까?')) return;
                    try {
                      await fetch('/api/admin/simulate-weather', { method: 'POST' });
                      alert('날씨 시뮬레이션 완료! 새로고침하세요.');
                      window.location.reload();
                    } catch (e) { alert('오류 발생'); }
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
        </div>
      )}

      {activeTab === 'tee-times' && (
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            ⛳️ 티타임 관리 (Live Data)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700 text-sm">
                  <th className="p-3">일시 (KST)</th>
                  <th className="p-3">날씨 정보</th>
                  <th className="p-3">기준 가격 (Override)</th>
                  <th className="p-3">상태 관리</th>
                </tr>
              </thead>
              <tbody>
                {teeTimes.map((item) => {
                  const dateTimeStr = formatKstDateTime(item.tee_off);
                  const weather: any = item.weather_condition || {}; // Parse JSONB
                  const isRain = weather.rn1 > 0 || weather.sky === 'RAIN';

                  return (
                    <tr key={item.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="p-4 font-bold text-lg">{dateTimeStr}</td>
                      <td className="p-4 text-sm text-gray-400">
                        {isRain ? (
                          <span className="flex items-center text-blue-400 gap-1"><CloudRain size={14} /> 비 ({weather.rn1 || 0}mm)</span>
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
      )}

      {activeTab === 'users' && (
        <AdminUserManagement initialUsers={initialUsers} />
      )}
    </div>
  );
}
