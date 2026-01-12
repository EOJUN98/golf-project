// ==================================================================
// PriceCard 컴포넌트
// 기획서 07 기반: 티타임 가격 카드 UI
// ==================================================================

import React from 'react';
import { Clock } from 'lucide-react';

interface PriceCardProps {
  /** 티오프 시간 (HH:MM 형식) */
  time: string;

  /** 정가 */
  basePrice: number;

  /** 최종 가격 */
  finalPrice: number;

  /** 할인 사유 */
  reasons: string[];

  /** 티타임 상태 */
  status?: 'OPEN' | 'BOOKED' | 'BLOCKED';

  /** 클릭 핸들러 */
  onClick?: () => void;
}

export default function PriceCard({
  time,
  basePrice,
  finalPrice,
  reasons,
  status = 'OPEN',
  onClick,
}: PriceCardProps) {
  const hasDiscount = finalPrice < basePrice;
  const isBlocked = status === 'BLOCKED';
  const isBooked = status === 'BOOKED';

  return (
    <div
      className={`
        bg-white p-5 rounded-xl border shadow-sm
        transition-all duration-200
        ${isBlocked ? 'border-gray-300 opacity-50 cursor-not-allowed' : ''}
        ${isBooked ? 'border-blue-300 bg-blue-50' : 'border-gray-100'}
        ${!isBlocked && !isBooked ? 'hover:shadow-md cursor-pointer' : ''}
      `}
      onClick={!isBlocked && !isBooked ? onClick : undefined}
    >
      {/* 상단: 시간 & 상태 뱃지 */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-gray-600" />
          <span className="text-xl font-bold text-gray-900">{time}</span>

          {/* 상태 뱃지 */}
          {isBlocked && (
            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-1 rounded">
              ⛈ 기상 차단
            </span>
          )}
          {isBooked && (
            <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-1 rounded">
              ✓ 예약 완료
            </span>
          )}
          {reasons.some((r) => r.includes('우천') || r.includes('비')) && !isBlocked && (
            <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-1 rounded">
              ☔️ 우천
            </span>
          )}
        </div>

        {/* 가격 영역 */}
        <div className="text-right">
          {hasDiscount && (
            <div className="text-xs text-gray-400 line-through decoration-gray-400">
              {basePrice.toLocaleString()}
            </div>
          )}
          <div
            className={`text-xl font-black ${
              hasDiscount ? 'text-red-500' : 'text-gray-900'
            }`}
          >
            {finalPrice.toLocaleString()}
            <span className="text-sm font-normal text-gray-500">원</span>
          </div>
        </div>
      </div>

      {/* 하단: 할인 사유 뱃지 */}
      {hasDiscount && reasons.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-50">
          <div className="flex flex-wrap gap-1">
            {reasons.map((reason, idx) => (
              <span
                key={idx}
                className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
              >
                {reason}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 차단 상태 메시지 */}
      {isBlocked && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            기상 특보로 인해 예약이 일시 중단되었습니다.
          </p>
        </div>
      )}
    </div>
  );
}
