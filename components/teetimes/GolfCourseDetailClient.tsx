/**
 * Golf Course Detail Client Component
 *
 * Displays comprehensive course information
 */

'use client';

import { useRouter } from 'next/navigation';
import {
  MapPin,
  Star,
  Info,
  Target,
  Wind,
  CloudRain,
  Thermometer,
  Clock,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';

interface GolfCourseDetailProps {
  course: {
    id: number;
    name: string;
    location_name: string;
    description: string;
    avg_rating: number;
    total_reviews: number;
    facilities: string[];
    total_length: number;
    par: number;
    green_speed: number;
    green_type: string;
    slope_rating: number;
    course_rating: number;
    holes: number;
    course_map_url?: string;
    hole_details?: Array<{
      hole: number;
      par: number;
      length: number;
      handicap: number;
    }>;
    strategy_tips?: string[];
    weather: {
      temperature: number;
      condition: string;
      wind_speed: number;
      wind_direction: string;
      rain_probability: number;
      rainfall: number;
    };
    notices: Array<{
      id: number;
      notice_type: string;
      severity: string;
      title: string;
      description: string;
      start_date: string;
      end_date: string;
    }>;
  };
}

export default function GolfCourseDetailClient({
  course,
}: GolfCourseDetailProps) {
  const router = useRouter();

  // Severity badge color
  const getSeverityBadge = (severity: string) => {
    const colors = {
      INFO: 'bg-blue-100 text-blue-700',
      WARNING: 'bg-yellow-100 text-yellow-700',
      CRITICAL: 'bg-red-100 text-red-700',
    };
    return colors[severity as keyof typeof colors] || colors.INFO;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <button
          onClick={() => router.back()}
          className="text-green-600 font-medium mb-2"
        >
          ← 뒤로
        </button>
        <h1 className="text-2xl font-black text-gray-900">{course.name}</h1>
        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
          <MapPin size={14} />
          <span>{course.location_name}</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center gap-1">
            <Star size={16} className="fill-yellow-400 text-yellow-400" />
            <span className="font-bold text-gray-900">
              {course.avg_rating.toFixed(1)}
            </span>
          </div>
          <span className="text-sm text-gray-600">
            ({course.total_reviews.toLocaleString()}개 후기)
          </span>
        </div>
      </div>

      {/* Course Overview */}
      <div className="bg-white p-5 border-b border-gray-200">
        <h2 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Info size={18} className="text-green-600" />
          코스 개요
        </h2>
        <p className="text-gray-700 text-sm mb-3">{course.description}</p>
        <div className="flex flex-wrap gap-2">
          {course.facilities.map((facility) => (
            <span
              key={facility}
              className="px-3 py-1 bg-green-50 text-green-700 text-sm rounded-lg font-medium"
            >
              {facility}
            </span>
          ))}
        </div>
      </div>

      {/* Course Information */}
      <div className="bg-white p-5 border-b border-gray-200">
        <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Target size={18} className="text-green-600" />
          코스 정보
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">홀 수</p>
            <p className="text-xl font-bold text-gray-900">{course.holes}홀</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">파</p>
            <p className="text-xl font-bold text-gray-900">PAR {course.par}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">전장</p>
            <p className="text-xl font-bold text-gray-900">
              {course.total_length.toLocaleString()}야드
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">그린 스피드</p>
            <p className="text-xl font-bold text-gray-900">
              {course.green_speed}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">그린 타입</p>
            <p className="text-sm font-bold text-gray-900">
              {course.green_type}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">슬로프 레이팅</p>
            <p className="text-xl font-bold text-gray-900">
              {course.slope_rating}
            </p>
          </div>
        </div>
      </div>

      {/* Course Map */}
      {course.course_map_url && (
        <div className="bg-white p-5 border-b border-gray-200">
          <h2 className="font-bold text-gray-900 mb-3">코스 맵</h2>
          <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-lg p-12 text-center">
            <MapPin size={48} className="text-green-600 mx-auto mb-3" />
            <p className="text-sm text-gray-700">코스 맵 이미지</p>
          </div>
        </div>
      )}

      {/* Hole Details */}
      {course.hole_details && course.hole_details.length > 0 && (
        <div className="bg-white p-5 border-b border-gray-200">
          <h2 className="font-bold text-gray-900 mb-3">홀 정보 (1-4홀)</h2>
          <div className="space-y-2">
            {course.hole_details.map((hole) => (
              <div
                key={hole.hole}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-black text-green-600">
                    {hole.hole}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      PAR {hole.par}
                    </p>
                    <p className="text-xs text-gray-600">
                      {hole.length}야드
                    </p>
                  </div>
                </div>
                <span className="text-sm text-gray-600">
                  핸디캡 {hole.handicap}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategy Tips */}
      {course.strategy_tips && course.strategy_tips.length > 0 && (
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 border-b border-gray-200">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Target size={18} className="text-green-600" />
            코스 공략 팁
          </h2>
          <div className="space-y-2">
            {course.strategy_tips.map((tip, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">•</span>
                <p className="text-sm text-gray-700">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weather Forecast */}
      <div className="bg-white p-5 border-b border-gray-200">
        <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <CloudRain size={18} className="text-blue-600" />
          날씨 정보
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Thermometer size={14} className="text-blue-600" />
              <p className="text-xs text-gray-600">기온</p>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {course.weather.temperature}°C
            </p>
            <p className="text-xs text-gray-600">{course.weather.condition}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Wind size={14} className="text-blue-600" />
              <p className="text-xs text-gray-600">바람</p>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {course.weather.wind_speed}m/s
            </p>
            <p className="text-xs text-gray-600">
              {course.weather.wind_direction}
            </p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <CloudRain size={14} className="text-blue-600" />
              <p className="text-xs text-gray-600">강수 확률</p>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {course.weather.rain_probability}%
            </p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <CloudRain size={14} className="text-blue-600" />
              <p className="text-xs text-gray-600">강수량</p>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {course.weather.rainfall}mm
            </p>
          </div>
        </div>
      </div>

      {/* Course Notices */}
      {course.notices && course.notices.length > 0 && (
        <div className="bg-white p-5 border-b border-gray-200">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-yellow-600" />
            구장 이슈 & 공지
          </h2>
          <div className="space-y-3">
            {course.notices.map((notice) => (
              <div
                key={notice.id}
                className="p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded ${getSeverityBadge(
                      notice.severity
                    )}`}
                  >
                    {notice.notice_type}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 mb-1">
                  {notice.title}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  {notice.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock size={12} />
                  <span>
                    {new Date(notice.start_date).toLocaleDateString('ko-KR')} ~{' '}
                    {new Date(notice.end_date).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA Button */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <button
          onClick={() => router.push('/')}
          className="w-full py-4 bg-green-600 text-white rounded-xl font-black text-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
        >
          <Clock size={24} />
          티타임 보기
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
