"use client";

import React, { useState } from 'react';
import { Settings, Save, Power, AlertTriangle, CloudRain, Ban } from 'lucide-react';

export default function AdminPage() {
  // 가상의 관리자 설정 상태
  const [isAiMode, setIsAiMode] = useState(true); // AI 자동 모드
  const [emergencyStop, setEmergencyStop] = useState(false); // 할인 긴급 중단
  
  // 가상의 티타임 데이터
  const [teeTimes, setTeeTimes] = useState([
    { id: 1, time: '07:20', price: 150000, aiRecommended: 150000 },
    { id: 2, time: '08:00', price: 180000, aiRecommended: 180000 },
    { id: 3, time: '13:00', price: 210000, aiRecommended: 195000 },
  ]);

  // 가격 수동 변경 핸들러
  const handlePriceChange = (id: number, newPrice: string) => {
    const price = parseInt(newPrice) || 0;
    setTeeTimes(prev => prev.map(t => t.id === id ? { ...t, price: price } : t));
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
          <p className="text-gray-400 text-sm mt-1">Club 72 다이내믹 프라이싱 관리자</p>
        </div>
        <div className="bg-blue-900 px-4 py-2 rounded-lg text-sm font-bold flex items-center">
          <CloudRain size={16} className="mr-2" />
          현재 인천 기상: 맑음 (비 올 확률 0%)
        </div>
      </div>

      {/* 메인 컨트롤 패널 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        {/* 1. AI 모드 스위치 */}
        <div className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${isAiMode ? 'bg-gray-800 border-green-500' : 'bg-gray-800 border-gray-600'}`}
             onClick={() => setIsAiMode(!isAiMode)}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">🤖 AI Auto-Pilot</h2>
            <Power size={30} className={isAiMode ? "text-green-500" : "text-gray-500"} />
          </div>
          <p className="text-gray-400 mb-4 text-sm">
            {isAiMode 
              ? "현재 AI가 날씨와 예약률을 분석해 가격을 자동 조절 중입니다." 
              : "수동 모드입니다. 관리자가 설정한 고정 가격으로만 판매됩니다."}
          </p>
          <div className={`inline-block px-3 py-1 rounded text-xs font-bold ${isAiMode ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
            STATUS: {isAiMode ? 'RUNNING' : 'STOPPED'}
          </div>
        </div>

        {/* 2. 긴급 중단 스위치 */}
        <div className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${emergencyStop ? 'bg-red-900/50 border-red-500' : 'bg-gray-800 border-gray-600'}`}
             onClick={() => setEmergencyStop(!emergencyStop)}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-red-400">🚨 Emergency Stop</h2>
            <Ban size={30} className={emergencyStop ? "text-red-500 animate-pulse" : "text-gray-500"} />
          </div>
          <p className="text-gray-400 mb-4 text-sm">
            모든 할인을 즉시 중단하고 정가로 복구합니다. (예약 폭주 시 사용)
          </p>
          {emergencyStop && (
             <div className="bg-red-600 text-white px-3 py-1 rounded text-xs font-bold inline-block">
               ⛔️ 할인 전면 중단됨
             </div>
          )}
        </div>
      </div>

      {/* 3. 티타임 가격 관리 테이블 */}
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
        <h2 className="text-xl font-bold mb-4 flex items-center">
           💵 가격 수동 관리 (Override)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700 text-sm">
                <th className="p-3">시간</th>
                <th className="p-3">AI 추천가</th>
                <th className="p-3">최종 판매가 (수정 가능)</th>
                <th className="p-3">상태</th>
              </tr>
            </thead>
            <tbody>
              {teeTimes.map((item) => (
                <tr key={item.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="p-4 font-bold text-lg">{item.time}</td>
                  <td className="p-4 text-gray-400">{item.aiRecommended.toLocaleString()}원</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        value={item.price}
                        onChange={(e) => handlePriceChange(item.id, e.target.value)}
                        className={`bg-gray-900 border border-gray-600 rounded px-3 py-2 w-32 font-bold focus:outline-none focus:border-yellow-500
                          ${item.price !== item.aiRecommended ? 'text-yellow-400 border-yellow-500' : 'text-white'}
                        `}
                      />
                      <span className="text-sm text-gray-500">원</span>
                    </div>
                  </td>
                  <td className="p-4">
                    {item.price !== item.aiRecommended ? (
                      <span className="text-xs bg-yellow-900 text-yellow-300 px-2 py-1 rounded border border-yellow-700">
                        수동 조작됨
                      </span>
                    ) : (
                      <span className="text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded border border-blue-700">
                        AI 자동
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold flex items-center transition-colors">
            <Save size={18} className="mr-2" />
            변경사항 저장하기
          </button>
        </div>
      </div>
    </div>
  );
}