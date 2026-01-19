/**
 * Tee Times Client Component
 *
 * Displays golf courses with map and list view
 */

'use client';

import { useRouter } from 'next/navigation';
import { MapPin, Star, Navigation, Clock } from 'lucide-react';

interface GolfCourse {
  id: number;
  name: string;
  location_name: string;
  latitude: number;
  longitude: number;
  lowest_price: number;
  avg_rating: number;
  total_reviews: number;
  distance_km: number;
  description: string;
  facilities: string[];
}

interface TeeTimesClientProps {
  golfCourses: GolfCourse[];
}

export default function TeeTimesClient({ golfCourses }: TeeTimesClientProps) {
  const router = useRouter();

  return (
    <div className="flex-1 overflow-y-auto pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <h1 className="text-2xl font-black text-gray-900">티타임</h1>
        <p className="text-sm text-gray-600 mt-1">가까운 골프장을 찾아보세요</p>
      </div>

      {/* Map Placeholder */}
      <div className="bg-gradient-to-br from-green-100 to-green-200 p-6 text-center border-b border-gray-200">
        <MapPin size={40} className="text-green-600 mx-auto mb-2" />
        <p className="text-xs text-gray-700 font-medium">지도 영역 (향후 구현)</p>
      </div>

      {/* Golf Courses List */}
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-gray-900">
            주변 골프장 ({golfCourses.length}개)
          </h2>
          <button className="text-sm text-green-600 font-medium">
            정렬 ▼
          </button>
        </div>

        {golfCourses.map((course) => (
          <div
            key={course.id}
            className="bg-white rounded-2xl p-4 border border-gray-200 hover:border-green-500 transition-colors"
          >
            {/* Course Header */}
            <div className="mb-3">
              <h3 className="text-base font-bold text-gray-900 mb-1">
                {course.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                <MapPin size={12} />
                <span>{course.location_name}</span>
                <span className="text-gray-400">·</span>
                <Navigation size={12} />
                <span>{course.distance_km}km</span>
              </div>
            </div>

            {/* Rating & Facilities */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1">
                <Star size={14} className="fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-bold text-gray-900">
                  {course.avg_rating.toFixed(1)}
                </span>
                <span className="text-xs text-gray-500">
                  ({course.total_reviews.toLocaleString()})
                </span>
              </div>
              <div className="flex gap-1">
                {course.facilities.slice(0, 3).map((facility) => (
                  <span
                    key={facility}
                    className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
                  >
                    {facility}
                  </span>
                ))}
              </div>
            </div>

            {/* Price and CTA */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.push(`/teetimes/${course.id}`)}
                className="text-left"
                aria-label={`${course.name} 최저가 상세 보기`}
              >
                <p className="text-xs text-gray-600">현재 최저가</p>
                <p className="text-xl font-black text-green-600 underline decoration-green-300 decoration-2 underline-offset-4">
                  {course.lowest_price.toLocaleString()}원
                </p>
              </button>
              <button
                onClick={() => router.push(`/teetimes/${course.id}`)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors flex items-center gap-1"
              >
                <Clock size={16} />
                티타임 보기
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {golfCourses.length === 0 && (
        <div className="p-12 text-center">
          <MapPin size={64} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            주변에 골프장이 없습니다
          </h3>
          <p className="text-gray-600">다른 지역을 검색해보세요</p>
        </div>
      )}
    </div>
  );
}
