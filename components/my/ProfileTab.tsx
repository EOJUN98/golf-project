/**
 * SDD-10: MY Page - Profile & Skills Tab
 *
 * Displays:
 * - User segment badge and score
 * - Handicap and skill metrics
 * - Recent statistics
 * - Risk score (if applicable)
 */

'use client';

import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import type { UserWithRoles } from '@/lib/auth/getCurrentUserWithRoles';
import { RISK_THRESHOLDS } from '@/utils/constants';

type SegmentType = 'PRESTIGE' | 'SMART' | 'CHERRY' | 'FUTURE';

interface ProfileTabProps {
  user: UserWithRoles & {
    segment_type?: SegmentType;
    segment_score?: number;
    total_bookings?: number;
    total_spent?: number;
    no_show_count?: number;
    no_show_risk_score?: number;
  };
  userStats: any;
}

export default function ProfileTab({ user, userStats }: ProfileTabProps) {
  const stats = userStats;
  // Segment badge colors
  const getSegmentBadge = (segment: SegmentType) => {
    const config = {
      PRESTIGE: {
        bg: 'bg-gradient-to-r from-purple-600 to-purple-800',
        text: 'text-white',
        icon: '👑',
        label: 'PRESTIGE',
        desc: 'VIP 고객',
      },
      SMART: {
        bg: 'bg-gradient-to-r from-blue-600 to-blue-800',
        text: 'text-white',
        icon: '⭐',
        label: 'SMART',
        desc: '스마트 골퍼',
      },
      CHERRY: {
        bg: 'bg-gradient-to-r from-pink-600 to-pink-800',
        text: 'text-white',
        icon: '🍒',
        label: 'CHERRY',
        desc: '체리피커',
      },
      FUTURE: {
        bg: 'bg-gradient-to-r from-gray-600 to-gray-800',
        text: 'text-white',
        icon: '🌱',
        label: 'FUTURE',
        desc: '신규 회원',
      },
    };

    return config[segment] || config.FUTURE;
  };

  const segmentBadge = getSegmentBadge((user.segment_type as SegmentType) || 'FUTURE');

  // Handicap trend icon
  const getHandicapTrendIcon = (trend: string | null) => {
    if (!trend) return <Minus size={16} className="text-gray-400" />;
    if (trend === 'IMPROVING') return <TrendingDown size={16} className="text-green-600" />;
    if (trend === 'DECLINING') return <TrendingUp size={16} className="text-red-600" />;
    return <Minus size={16} className="text-gray-400" />;
  };

  // Risk level indicator
  const getRiskIndicator = (riskScore: number) => {
    if (riskScore < RISK_THRESHOLDS.LOW) {
      return {
        label: '우수',
        color: 'text-green-600',
        bg: 'bg-green-100',
        icon: CheckCircle,
      };
    } else if (riskScore < RISK_THRESHOLDS.MEDIUM) {
      return {
        label: '보통',
        color: 'text-yellow-600',
        bg: 'bg-yellow-100',
        icon: AlertTriangle,
      };
    } else {
      return {
        label: '주의',
        color: 'text-red-600',
        bg: 'bg-red-100',
        icon: AlertTriangle,
      };
    }
  };

  const riskIndicator = getRiskIndicator(user.no_show_risk_score || 0);
  const RiskIcon = riskIndicator.icon;

  return (
    <div className="p-4 space-y-4">
      {/* Segment Badge */}
      <div className={`${segmentBadge.bg} ${segmentBadge.text} rounded-2xl p-6 shadow-lg`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{segmentBadge.icon}</span>
            <div>
              <h2 className="text-2xl font-black">{segmentBadge.label}</h2>
              <p className="text-sm opacity-90">{segmentBadge.desc}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-75">세그먼트 점수</p>
            <p className="text-3xl font-black">{(user.segment_score || 0).toFixed(0)}</p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/20">
          <div className="text-center">
            <p className="text-xs opacity-75">총 예약</p>
            <p className="text-lg font-bold">{user.total_bookings || 0}</p>
          </div>
          <div className="text-center">
            <p className="text-xs opacity-75">총 지출</p>
            <p className="text-lg font-bold">{((user.total_spent || 0) / 10000).toFixed(0)}만</p>
          </div>
          <div className="text-center">
            <p className="text-xs opacity-75">노쇼 횟수</p>
            <p className="text-lg font-bold">{user.no_show_count || 0}</p>
          </div>
        </div>
      </div>

      {/* Risk Score (if applicable) */}
      {(user.no_show_risk_score || 0) > 0 && (
        <div className={`${riskIndicator.bg} rounded-2xl p-5`}>
          <div className="flex items-center gap-3 mb-3">
            <RiskIcon size={20} className={riskIndicator.color} />
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">예약 신뢰도</h3>
              <p className="text-sm text-gray-600">노쇼 및 취소 이력 기반 평가</p>
            </div>
            <span className={`${riskIndicator.color} font-black text-xl`}>
              {riskIndicator.label}
            </span>
          </div>
          <div className="bg-white/50 rounded-lg p-3">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">위험 점수</span>
              <span className="font-bold">{(user.no_show_risk_score || 0).toFixed(0)}/100</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  (user.no_show_risk_score || 0) < RISK_THRESHOLDS.LOW
                    ? 'bg-green-600'
                    : (user.no_show_risk_score || 0) < RISK_THRESHOLDS.MEDIUM
                    ? 'bg-yellow-600'
                    : 'bg-red-600'
                }`}
                style={{ width: `${Math.min(user.no_show_risk_score || 0, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Handicap & Skills */}
      {stats && (
        <div className="bg-white rounded-2xl p-5 border border-gray-200">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Trophy size={20} className="text-yellow-600" />
            골프 실력
          </h3>

          {/* Handicap */}
          {stats.handicap !== null && (
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">핸디캡</p>
                  <p className="text-3xl font-black text-blue-900">
                    {stats.handicap.toFixed(1)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getHandicapTrendIcon(stats.handicap_trend)}
                  <span className="text-sm text-gray-600">
                    {stats.handicap_trend === 'IMPROVING' && '개선 중'}
                    {stats.handicap_trend === 'STABLE' && '유지'}
                    {stats.handicap_trend === 'DECLINING' && '하락'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Skill metrics */}
          <div className="grid grid-cols-2 gap-3">
            {stats.avg_score !== null && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">평균 스코어</p>
                <p className="text-xl font-bold text-gray-900">{stats.avg_score.toFixed(1)}</p>
              </div>
            )}

            {stats.driving_distance !== null && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">평균 비거리</p>
                <p className="text-xl font-bold text-gray-900">{stats.driving_distance}m</p>
              </div>
            )}

            {stats.fairway_accuracy !== null && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">페어웨이 적중률</p>
                <p className="text-xl font-bold text-gray-900">{stats.fairway_accuracy.toFixed(0)}%</p>
              </div>
            )}

            {stats.gir_rate !== null && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">GIR</p>
                <p className="text-xl font-bold text-gray-900">{stats.gir_rate.toFixed(0)}%</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Round Statistics */}
      {stats && stats.total_rounds > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-gray-200">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity size={20} className="text-green-600" />
            라운드 통계
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">총 라운드</span>
              <span className="font-bold">{stats.total_rounds}회</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">완주 라운드</span>
              <span className="font-bold">{stats.completed_rounds}회</span>
            </div>
            {stats.best_score !== null && (
              <div className="flex justify-between">
                <span className="text-gray-600">베스트 스코어</span>
                <span className="font-bold text-green-600">{stats.best_score}</span>
              </div>
            )}
            {stats.avg_booking_lead_time !== null && (
              <div className="flex justify-between">
                <span className="text-gray-600">평균 예약 선행일</span>
                <span className="font-bold">{stats.avg_booking_lead_time}일</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No stats placeholder */}
      {(!stats || stats.total_rounds === 0) && (
        <div className="bg-gray-50 rounded-2xl p-8 text-center">
          <Trophy size={48} className="text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">라운드 기록이 없습니다</h3>
          <p className="text-gray-600 text-sm">
            첫 라운드를 진행하고 스코어를 기록해보세요!
          </p>
        </div>
      )}
    </div>
  );
}
