/**
 * SDD-05: Weather Badge Component
 *
 * Displays weather status for the tee time with optional warning message
 */

'use client';

import { WeatherBadgeProps } from '@/types/reservationDetail';
import { getWeatherStatus, getWeatherBadgeConfig, RESERVATION_DETAIL_CONFIG } from '@/utils/reservationDetailHelpers';
import { AlertCircle } from 'lucide-react';

export default function WeatherBadge({ weather, teeOff }: WeatherBadgeProps) {
  const weatherStatus = getWeatherStatus(weather);
  const config = getWeatherBadgeConfig(weatherStatus);

  if (weatherStatus === 'unknown') {
    return null; // Don't show badge if no weather data
  }

  return (
    <div className="space-y-2">
      {/* Weather Badge */}
      <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${config.className}`}>
        <span className="text-xl">{config.icon}</span>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{config.label}</span>
          {weather && (
            <span className="text-xs opacity-75">
              {weather.tmp}°C · 강수확률 {weather.pop}%
            </span>
          )}
        </div>
      </div>

      {/* Weather Policy Warning */}
      {config.showWarning && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">기상 정책 안내</p>
            <p className="text-xs text-blue-700 mt-1">
              {RESERVATION_DETAIL_CONFIG.WEATHER_POLICY_MESSAGE}
            </p>
          </div>
        </div>
      )}

      {/* Rainfall Details */}
      {weather && weather.rn1 > 0 && (
        <div className="text-xs text-gray-600">
          예상 강수량: {weather.rn1}mm
          {weather.rn1 >= 10 && (
            <span className="ml-2 text-red-600 font-medium">
              (골프장 운영 여부 확인 필요)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
