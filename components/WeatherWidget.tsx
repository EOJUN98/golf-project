// ==================================================================
// WeatherWidget 컴포넌트
// 기획서 02 기반: 상단 날씨 상황판
// ==================================================================

import React from 'react';
import { CloudRain, Cloud, Sun, MapPin } from 'lucide-react';

interface WeatherWidgetProps {
  /** 강수확률 (%) */
  rainProb: number;

  /** 사용자 위치 메시지 (선택) */
  locationMessage?: string;

  /** 사용자 세그먼트 표시 (선택) */
  userSegment?: 'FUTURE' | 'PRESTIGE' | 'SMART' | 'CHERRY';
}

export default function WeatherWidget({
  rainProb,
  locationMessage,
  userSegment,
}: WeatherWidgetProps) {
  // 날씨 아이콘 결정
  const getWeatherIcon = () => {
    if (rainProb >= 60) return <CloudRain size={24} className="text-blue-500" />;
    if (rainProb >= 30) return <Cloud size={24} className="text-gray-500" />;
    return <Sun size={24} className="text-yellow-500" />;
  };

  // 날씨 메시지
  const getWeatherMessage = () => {
    if (rainProb >= 60) return `우천 할인 적용 중 (${rainProb}%)`;
    if (rainProb >= 30) return `흐림 할인 적용 중 (${rainProb}%)`;
    return '화창한 날씨';
  };

  // 세그먼트 뱃지
  const getSegmentBadge = () => {
    switch (userSegment) {
      case 'PRESTIGE':
        return (
          <span className="text-xs font-bold text-yellow-400 bg-gray-900 px-2 py-1 rounded-full">
            👑 VIP PRESTIGE
          </span>
        );
      case 'SMART':
        return (
          <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
            💡 SMART
          </span>
        );
      case 'CHERRY':
        return (
          <span className="text-xs font-bold text-pink-600 bg-pink-100 px-2 py-1 rounded-full">
            🍒 CHERRY
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-black text-white p-5 m-4 rounded-2xl relative overflow-hidden cursor-pointer">
      <div className="relative z-10">
        {/* 상단: 세그먼트 뱃지 */}
        <div className="flex justify-between items-center mb-2">
          {getSegmentBadge()}

          {/* 날씨 아이콘 */}
          <div className="flex items-center gap-2">
            {getWeatherIcon()}
            <span className="text-sm font-medium">{getWeatherMessage()}</span>
          </div>
        </div>

        {/* 메인 메시지 */}
        <h2 className="text-lg font-bold leading-tight mt-3">
          {locationMessage ? (
            <>
              📍 {locationMessage}
              <br />
              <span className="text-yellow-400">특별 혜택</span>을 확인하세요.
            </>
          ) : (
            <>
              회원님,
              <br />
              오늘 <span className="text-yellow-400">특별 혜택</span>을 확인하세요.
            </>
          )}
        </h2>
      </div>

      {/* 배경 장식 */}
      <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
        {rainProb >= 60 ? (
          <CloudRain size={100} />
        ) : rainProb >= 30 ? (
          <Cloud size={100} />
        ) : (
          <Sun size={100} />
        )}
      </div>
    </div>
  );
}
