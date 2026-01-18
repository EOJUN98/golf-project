/**
 * MY Page - Round History Tab
 *
 * Displays:
 * - List of played rounds with scores
 * - Golf club names and dates
 * - Performance highlights
 * - Detailed scorecard view (expandable)
 */

'use client';

import { useState } from 'react';
import {
  Trophy,
  MapPin,
  Calendar,
  TrendingUp,
  TrendingDown,
  Target,
  Flag,
  ChevronDown,
  ChevronUp,
  CloudRain,
  Wind,
} from 'lucide-react';
import type { UserWithRoles } from '@/lib/auth/getCurrentUserWithRoles';

interface RoundsTabProps {
  user: UserWithRoles;
  rounds: any[];
}

export default function RoundsTab({ user, rounds }: RoundsTabProps) {
  const [expandedRound, setExpandedRound] = useState<number | null>(null);

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  };

  // Score color based on performance
  const getScoreColor = (score: number) => {
    if (score <= 72) return 'text-green-600';
    if (score <= 85) return 'text-blue-600';
    if (score <= 100) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Score badge
  const getScoreBadge = (score: number) => {
    if (score <= 72) return { label: '언더파', color: 'bg-green-100 text-green-700' };
    if (score <= 80) return { label: '우수', color: 'bg-blue-100 text-blue-700' };
    if (score <= 90) return { label: '양호', color: 'bg-yellow-100 text-yellow-700' };
    return { label: '보통', color: 'bg-gray-100 text-gray-700' };
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-black text-gray-900">라운드 기록</h2>
          <p className="text-sm text-gray-600">총 {rounds.length}개의 라운드</p>
        </div>
        {rounds.length > 0 && (
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-sm">
            필터
          </button>
        )}
      </div>

      {/* Rounds List */}
      {rounds.length > 0 ? (
        <div className="space-y-3">
          {rounds.map((round, index) => {
            const isExpanded = expandedRound === round.id;
            const scoreBadge = getScoreBadge(round.total_score);

            return (
              <div
                key={round.id}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-green-500 transition-colors"
              >
                {/* Round Summary */}
                <div
                  className="p-5 cursor-pointer"
                  onClick={() =>
                    setExpandedRound(isExpanded ? null : round.id)
                  }
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin size={16} className="text-green-600" />
                        <h3 className="font-bold text-gray-900">
                          {round.golf_clubs?.name || '골프장 정보 없음'}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar size={14} />
                        <span>{formatDate(round.played_at)}</span>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      <p className={`text-3xl font-black ${getScoreColor(round.total_score)}`}>
                        {round.total_score}
                      </p>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${scoreBadge.color}`}>
                        {scoreBadge.label}
                      </span>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  {(round.front_nine || round.back_nine) && (
                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200">
                      {round.front_nine && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">전반</span>
                          <span className="font-bold text-gray-900">{round.front_nine}</span>
                        </div>
                      )}
                      {round.back_nine && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">후반</span>
                          <span className="font-bold text-gray-900">{round.back_nine}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Expand/Collapse Button */}
                  <div className="flex items-center justify-center mt-3 pt-3 border-t border-gray-200">
                    {isExpanded ? (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <ChevronUp size={16} />
                        <span>접기</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <ChevronDown size={16} />
                        <span>상세 보기</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Round Details (Expanded) */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-200 bg-gray-50">
                    <div className="pt-4 space-y-4">
                      {/* Tee Box */}
                      {round.tee_box && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">티 박스</span>
                          <span className="font-bold text-gray-900">{round.tee_box}</span>
                        </div>
                      )}

                      {/* Performance Metrics */}
                      {(round.fairways_hit !== null || round.greens_in_regulation !== null || round.total_putts !== null) && (
                        <div className="grid grid-cols-3 gap-3">
                          {round.fairways_hit !== null && (
                            <div className="p-3 bg-white rounded-lg text-center">
                              <p className="text-xs text-gray-500 mb-1">페어웨이</p>
                              <p className="text-lg font-bold text-gray-900">{round.fairways_hit}/14</p>
                            </div>
                          )}
                          {round.greens_in_regulation !== null && (
                            <div className="p-3 bg-white rounded-lg text-center">
                              <p className="text-xs text-gray-500 mb-1">GIR</p>
                              <p className="text-lg font-bold text-gray-900">{round.greens_in_regulation}/18</p>
                            </div>
                          )}
                          {round.total_putts !== null && (
                            <div className="p-3 bg-white rounded-lg text-center">
                              <p className="text-xs text-gray-500 mb-1">퍼트</p>
                              <p className="text-lg font-bold text-gray-900">{round.total_putts}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Weather Conditions */}
                      {(round.weather_condition || round.wind_speed || round.temperature) && (
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <h4 className="text-sm font-bold text-gray-900 mb-2">날씨 정보</h4>
                          <div className="space-y-1 text-sm">
                            {round.weather_condition && (
                              <div className="flex items-center gap-2">
                                <CloudRain size={14} className="text-blue-600" />
                                <span className="text-gray-700">{round.weather_condition}</span>
                              </div>
                            )}
                            {round.wind_speed && (
                              <div className="flex items-center gap-2">
                                <Wind size={14} className="text-blue-600" />
                                <span className="text-gray-700">풍속 {round.wind_speed}km/h</span>
                              </div>
                            )}
                            {round.temperature && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-700">기온 {round.temperature}°C</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {round.notes && (
                        <div className="p-3 bg-yellow-50 rounded-lg">
                          <h4 className="text-sm font-bold text-gray-900 mb-1">메모</h4>
                          <p className="text-sm text-gray-700">{round.notes}</p>
                        </div>
                      )}

                      {/* Playing Partners */}
                      {round.playing_partners && round.playing_partners.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">동반자:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {round.playing_partners.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // Empty State
        <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-300">
          <Trophy size={64} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            라운드 기록이 없습니다
          </h3>
          <p className="text-gray-600 mb-6">
            첫 라운드를 진행하고 스코어를 기록해보세요!
          </p>
          <button className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors">
            라운드 예약하기
          </button>
        </div>
      )}
    </div>
  );
}
