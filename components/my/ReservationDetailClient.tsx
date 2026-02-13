/**
 * SDD-10: Reservation Detail Client Component
 *
 * Displays complete reservation information with:
 * - Golf club and course details
 * - Weather conditions
 * - Course notices and alerts
 * - Cancellation policy summary
 * - Action buttons
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Cloud,
  Wind,
  Droplets,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Ruler,
  Flag,
  TrendingUp,
  Target,
  Map,
} from 'lucide-react';
import type { UserWithRoles } from '@/lib/auth/getCurrentUserWithRoles';

interface ReservationDetailClientProps {
  user: UserWithRoles;
  reservation: any; // Full reservation with tee_times
  course: any | null; // Golf course details
  notices: any[]; // Course notices
  weather: any | null; // Weather forecast
}

export default function ReservationDetailClient({
  user,
  reservation,
  course,
  notices,
  weather,
}: ReservationDetailClientProps) {
  const router = useRouter();
  const [showCancelModal, setShowCancelModal] = useState(false);

  const teeTime = reservation.tee_times;
  const golfClub = teeTime?.golf_clubs;
  const teeOff = new Date(teeTime?.tee_off);

  // Status badge
  const getStatusBadge = (status: string) => {
    const config: Record<string, { icon: any; label: string; color: string }> = {
      PAID: { icon: CheckCircle, label: '결제완료', color: 'bg-green-100 text-green-700' },
      COMPLETED: { icon: CheckCircle, label: '이용완료', color: 'bg-blue-100 text-blue-700' },
      CANCELLED: { icon: XCircle, label: '취소됨', color: 'bg-gray-100 text-gray-700' },
      NO_SHOW: { icon: AlertTriangle, label: '노쇼', color: 'bg-red-100 text-red-700' },
    };

    const badge = config[status] || config.PAID;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${badge.color}`}>
        <Icon size={14} />
        {badge.label}
      </span>
    );
  };

  // Notice severity badge
  const getNoticeSeverityBadge = (severity: string) => {
    if (severity === 'CRITICAL') return 'bg-red-100 text-red-700 border-red-300';
    if (severity === 'WARNING') return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    return 'bg-blue-100 text-blue-700 border-blue-300';
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 max-w-md mx-auto shadow-2xl">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/my/reservations')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">예약 상세</h1>
            <p className="text-sm text-gray-500">{reservation.id.slice(0, 8)}</p>
          </div>
          {getStatusBadge(reservation.status)}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 space-y-4">
        {/* Golf Club & Tee Time */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-start gap-3 mb-4">
            <MapPin size={20} className="text-green-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">{golfClub?.name}</h2>
              <p className="text-sm text-gray-500">{golfClub?.location_name}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-400" />
              <span className="text-gray-700">
                {teeOff.toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short',
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gray-400" />
              <span className="text-gray-700 font-bold">
                {teeOff.toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {/* Pricing */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">기본 가격</span>
              <span className="text-gray-900">{reservation.base_price.toLocaleString()}원</span>
            </div>
            {reservation.base_price !== reservation.final_price && (
              <div className="flex justify-between mb-2">
                <span className="text-green-600">할인</span>
                <span className="text-green-600 font-bold">
                  -{(reservation.base_price - reservation.final_price).toLocaleString()}원
                </span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold">
              <span>최종 결제액</span>
              <span className="text-green-600">{reservation.final_price.toLocaleString()}원</span>
            </div>
          </div>
        </div>

        {/* Course Details */}
        {course && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Flag size={18} className="text-blue-600" />
              코스 정보
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {course.total_length_yards && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">전장</p>
                  <p className="text-sm font-bold text-gray-900">
                    {course.total_length_yards.toLocaleString()} yds
                  </p>
                </div>
              )}
              {course.course_rating && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">코스 레이팅</p>
                  <p className="text-sm font-bold text-gray-900">{course.course_rating}</p>
                </div>
              )}
              {course.slope_rating && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">슬로프</p>
                  <p className="text-sm font-bold text-gray-900">{course.slope_rating}</p>
                </div>
              )}
              {course.green_speed && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">그린 스피드</p>
                  <p className="text-sm font-bold text-gray-900">{course.green_speed}</p>
                </div>
              )}
            </div>

            {course.green_type && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">그린 타입</p>
                <p className="text-sm font-bold text-green-900">{course.green_type}</p>
              </div>
            )}

            {/* Course Overview */}
            {course.course_overview && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">코스 개요</p>
                <p className="text-sm text-gray-700">{course.course_overview}</p>
              </div>
            )}

            {/* Course Map */}
            {course.course_map_url && (
              <div className="mt-3">
                <p className="text-xs text-gray-600 mb-2">코스 맵</p>
                <div className="bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={course.course_map_url}
                    alt="Course Map"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            )}

            {/* Hole Details Preview */}
            {course.hole_details && Array.isArray(course.hole_details) && course.hole_details.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-600 mb-2">홀 정보 (예시)</p>
                <div className="grid grid-cols-2 gap-2">
                  {course.hole_details.slice(0, 4).map((hole: any, index: number) => (
                    <div key={index} className="p-2 bg-gray-50 rounded text-xs">
                      <div className="font-bold">Hole {hole.hole_number || index + 1}</div>
                      <div className="text-gray-600">Par {hole.par || '-'}</div>
                      {hole.yardage && <div className="text-gray-600">{hole.yardage} yds</div>}
                    </div>
                  ))}
                </div>
                {course.hole_details.length > 4 && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    외 {course.hole_details.length - 4}개 홀 정보
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Course Strategy & Tips */}
        {course && (
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-5 border border-green-200">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Target size={18} className="text-green-600" />
              코스 공략 팁
            </h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">•</span>
                <p>드라이버 샷은 페어웨이 중앙을 노리세요.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">•</span>
                <p>그린 주변 벙커에 유의하세요.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">•</span>
                <p>경사가 있는 홀에서는 클럽 선택에 주의하세요.</p>
              </div>
              {course.green_speed && (
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">•</span>
                  <p>오늘의 그린 스피드는 {course.green_speed}입니다. 퍼팅 시 참고하세요.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Weather Forecast */}
        {weather && (
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 border border-blue-200">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Cloud size={18} className="text-blue-600" />
              날씨 예보
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <Droplets size={20} className="text-blue-600 mx-auto mb-1" />
                <p className="text-xs text-gray-600 mb-1">강수확률</p>
                <p className="text-lg font-bold text-gray-900">{weather.pop}%</p>
              </div>
              <div className="text-center">
                <Cloud size={20} className="text-gray-600 mx-auto mb-1" />
                <p className="text-xs text-gray-600 mb-1">강수량</p>
                <p className="text-lg font-bold text-gray-900">{weather.rn1}mm</p>
              </div>
              <div className="text-center">
                <Wind size={20} className="text-gray-600 mx-auto mb-1" />
                <p className="text-xs text-gray-600 mb-1">풍속</p>
                <p className="text-lg font-bold text-gray-900">{weather.wsd}m/s</p>
              </div>
            </div>

            {weather.pop >= 60 && (
              <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded-lg flex items-start gap-2">
                <AlertTriangle size={16} className="text-yellow-700 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-900">
                  우천 예보가 있습니다. 기상 상황을 확인하세요.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Course Notices */}
        {notices.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Info size={18} className="text-orange-600" />
              코스 공지사항
            </h3>

            <div className="space-y-2">
              {notices.map((notice) => (
                <div
                  key={notice.id}
                  className={`p-3 rounded-lg border ${getNoticeSeverityBadge(notice.severity)}`}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold text-sm mb-1">{notice.title}</p>
                      {notice.description && (
                        <p className="text-xs opacity-90">{notice.description}</p>
                      )}
                      {notice.affected_holes && notice.affected_holes.length > 0 && (
                        <p className="text-xs mt-1 opacity-75">
                          영향 홀: {notice.affected_holes.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cancellation Policy */}
        {reservation.status === 'PAID' && (
          <div className="bg-gray-100 rounded-2xl p-5">
            <h3 className="font-bold text-gray-900 mb-3">취소 정책</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p>• 티오프 24시간 전: 100% 환불</p>
              <p>• 티오프 6-24시간 전: 50% 환불</p>
              <p>• 티오프 6시간 이내: 환불 불가</p>
              {reservation.is_imminent_deal && (
                <p className="text-red-600 font-bold">• 임박딜: 환불 불가</p>
              )}
            </div>

            <button
              onClick={() => setShowCancelModal(true)}
              className="mt-4 w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors"
            >
              예약 취소하기
            </button>
          </div>
        )}

        {/* Risk Assessment (if applicable) */}
        {reservation.risk_score > 0 && (
          <div className="bg-yellow-50 rounded-2xl p-5 border border-yellow-200">
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <AlertTriangle size={18} className="text-yellow-600" />
              예약 주의사항
            </h3>
            <p className="text-sm text-gray-700 mb-2">
              이 예약은 위험 점수 {reservation.risk_score.toFixed(0)}점으로 평가되었습니다.
            </p>
            {reservation.precheck_required && (
              <p className="text-sm text-gray-700">• Pre-Check-in 필수</p>
            )}
            {reservation.penalty_agreement_signed && (
              <p className="text-sm text-gray-700">• 노쇼 페널티 동의 완료</p>
            )}
          </div>
        )}
      </main>

      {/* Cancel Modal (skeleton) */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-md animate-slide-up">
            <h2 className="text-xl font-bold mb-4">예약 취소</h2>
            <p className="text-gray-600 mb-4">
              정말 이 예약을 취소하시겠습니까?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 bg-gray-200 text-gray-900 py-3 rounded-xl font-bold hover:bg-gray-300"
              >
                닫기
              </button>
              <button
                onClick={() => {
                  // TODO: Implement cancellation API call
                  setShowCancelModal(false);
                  router.push('/my/reservations');
                }}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
