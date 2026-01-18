/**
 * SDD-05: Reservation Detail Helper Functions
 *
 * Utility functions for reservation detail UI logic including:
 * - Hours calculation
 * - Weather status determination
 * - Cancellation eligibility
 * - Status badge configuration
 */

import {
  WeatherData,
  WeatherStatus,
  CancellationEligibility,
  StatusBadgeConfig,
  ReservationStatusBadge,
  PolicySection
} from '@/types/reservationDetail';
import { Database } from '@/types/database';

type Reservation = Database['public']['Tables']['reservations']['Row'];
type User = Database['public']['Tables']['users']['Row'];

// Configuration constants
export const RESERVATION_DETAIL_CONFIG = {
  CANCEL_CUTOFF_HOURS: 24,
  WEATHER_HEAVY_RAIN_THRESHOLD: 10, // mm
  WEATHER_RAIN_THRESHOLD: 1, // mm
  WEATHER_POLICY_MESSAGE: '기상 환불은 골프장 정책을 따릅니다',
  CANCELLATION_TERMS: '티오프 24시간 전까지 전액 환불 가능하며 이후 취소는 골프장 정책을 따릅니다',
  IMMINENT_DEAL_TERMS: '임박 특가 상품은 취소 및 환불이 불가합니다',
  NO_SHOW_WARNING: '노쇼 발생 시 계정 이용이 제한됩니다',
} as const;

/**
 * Calculate hours left until tee-off
 */
export function calculateHoursLeft(teeOff: string): number {
  const teeOffDate = new Date(teeOff);
  const now = new Date();
  const diffMs = teeOffDate.getTime() - now.getTime();
  return diffMs / (1000 * 60 * 60);
}

/**
 * Determine weather status from weather data
 */
export function getWeatherStatus(weather: WeatherData | null): WeatherStatus {
  if (!weather) return 'unknown';

  const { rn1, sky } = weather;

  // Heavy rain: >= 10mm
  if (rn1 >= RESERVATION_DETAIL_CONFIG.WEATHER_HEAVY_RAIN_THRESHOLD) {
    return 'heavy-rain';
  }

  // Light rain: >= 1mm
  if (rn1 >= RESERVATION_DETAIL_CONFIG.WEATHER_RAIN_THRESHOLD) {
    return 'rain';
  }

  // Cloudy or sunny based on sky condition
  if (sky === 'CLOUDY' || sky === 'OVERCAST') {
    return 'cloudy';
  }

  return 'sunny';
}

/**
 * Get weather badge configuration
 */
export function getWeatherBadgeConfig(status: WeatherStatus): {
  icon: string;
  label: string;
  className: string;
  showWarning: boolean;
} {
  switch (status) {
    case 'heavy-rain':
      return {
        icon: '🌧️',
        label: '강우',
        className: 'bg-blue-100 text-blue-800 border-blue-300',
        showWarning: true
      };
    case 'rain':
      return {
        icon: '🌦️',
        label: '약한 비',
        className: 'bg-blue-50 text-blue-700 border-blue-200',
        showWarning: true
      };
    case 'cloudy':
      return {
        icon: '☁️',
        label: '흐림',
        className: 'bg-gray-100 text-gray-700 border-gray-300',
        showWarning: false
      };
    case 'sunny':
      return {
        icon: '☀️',
        label: '맑음',
        className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        showWarning: false
      };
    default:
      return {
        icon: '🌤️',
        label: '날씨 정보 없음',
        className: 'bg-gray-50 text-gray-600 border-gray-200',
        showWarning: false
      };
  }
}

/**
 * Check if cancellation button should be shown
 *
 * Rules:
 * - canCancel must be true (from backend)
 * - User not suspended
 * - Not imminent deal
 * - Status is PAID
 */
export function shouldShowCancelButton(
  eligibility: CancellationEligibility | null,
  reservation: Reservation,
  user: User
): boolean {
  if (!eligibility) return false;

  return (
    eligibility.canCancel &&
    !user.is_suspended &&
    !reservation.is_imminent_deal &&
    reservation.status === 'PAID'
  );
}

/**
 * Get status badges to display
 */
export function getStatusBadges(
  reservation: Reservation,
  user: User,
  eligibility: CancellationEligibility | null
): ReservationStatusBadge[] {
  const badges: ReservationStatusBadge[] = [];

  // Primary status badge (always shown)
  if (reservation.status === 'CANCELLED') {
    badges.push('CANCELLED');
  } else if (reservation.status === 'NO_SHOW') {
    badges.push('NO_SHOW');
  } else if (reservation.status === 'REFUNDED') {
    badges.push('REFUNDED');
  } else if (reservation.status === 'COMPLETED') {
    badges.push('COMPLETED');
  } else if (reservation.status === 'PAID') {
    badges.push('PAID');
  }

  // Secondary badges (conditional)
  if (reservation.is_imminent_deal) {
    badges.push('IMMINENT');
  }

  if (user.is_suspended) {
    badges.push('SUSPENDED');
  }

  return badges;
}

/**
 * Get status badge configuration
 */
export function getStatusBadgeConfig(badge: ReservationStatusBadge): StatusBadgeConfig {
  switch (badge) {
    case 'PAID':
      return {
        label: '결제 완료',
        variant: 'success',
        icon: '✓',
        description: '예약이 확정되었습니다'
      };
    case 'CANCELLED':
      return {
        label: '취소됨',
        variant: 'warning',
        icon: '✕',
        description: '예약이 취소되었습니다'
      };
    case 'NO_SHOW':
      return {
        label: '노쇼',
        variant: 'danger',
        icon: '⚠',
        description: '티오프 시간에 나타나지 않았습니다'
      };
    case 'IMMINENT':
      return {
        label: '임박딜',
        variant: 'danger',
        icon: '🔥',
        description: '취소/환불 불가'
      };
    case 'SUSPENDED':
      return {
        label: '계정 정지',
        variant: 'danger',
        icon: '🔒',
        description: '이용이 제한된 계정입니다'
      };
    case 'REFUNDED':
      return {
        label: '환불 완료',
        variant: 'info',
        icon: '↩',
        description: '결제가 환불되었습니다'
      };
    case 'COMPLETED':
      return {
        label: '이용 완료',
        variant: 'neutral',
        icon: '✓',
        description: '라운드를 완료했습니다'
      };
  }
}

/**
 * Get badge variant class names
 */
export function getBadgeVariantClassName(variant: StatusBadgeConfig['variant']): string {
  switch (variant) {
    case 'success':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'warning':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'danger':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'info':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'neutral':
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

/**
 * Get policy sections to display
 */
export function getPolicySections(
  reservation: Reservation,
  eligibility: CancellationEligibility | null,
  hoursLeft: number
): PolicySection[] {
  const sections: PolicySection[] = [];

  // Imminent deal warning
  if (reservation.is_imminent_deal) {
    sections.push({
      title: '임박 특가 상품',
      content: RESERVATION_DETAIL_CONFIG.IMMINENT_DEAL_TERMS,
      variant: 'danger',
      show: true
    });
  }

  // Standard cancellation policy
  if (!reservation.is_imminent_deal) {
    sections.push({
      title: '취소 정책',
      content: RESERVATION_DETAIL_CONFIG.CANCELLATION_TERMS,
      variant: 'info',
      show: true
    });
  }

  // Cancellation deadline status
  if (eligibility && !eligibility.canCancel && !reservation.is_imminent_deal) {
    sections.push({
      title: '취소 불가',
      content: `취소 가능 시간이 지났습니다 (${Math.abs(hoursLeft).toFixed(1)}시간 경과). 골프장으로 문의하세요.`,
      variant: 'warning',
      show: hoursLeft < RESERVATION_DETAIL_CONFIG.CANCEL_CUTOFF_HOURS
    });
  }

  // Cancellation available
  if (eligibility?.canCancel && reservation.status === 'PAID') {
    sections.push({
      title: '취소 가능',
      content: `티오프까지 ${hoursLeft.toFixed(1)}시간 남음. 전액 환불 가능합니다.`,
      variant: 'info',
      show: true
    });
  }

  // No-show warning (always shown for active reservations)
  if (reservation.status === 'PAID') {
    sections.push({
      title: '노쇼 정책',
      content: RESERVATION_DETAIL_CONFIG.NO_SHOW_WARNING,
      variant: 'warning',
      show: true
    });
  }

  // Weather policy (always shown)
  sections.push({
    title: '기상 정책',
    content: RESERVATION_DETAIL_CONFIG.WEATHER_POLICY_MESSAGE,
    variant: 'info',
    show: true
  });

  return sections.filter(s => s.show);
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW'
  }).format(amount);
}

/**
 * Format date/time for display
 */
export function formatTeeOffTime(teeOff: string): {
  date: string;
  time: string;
  dayOfWeek: string;
} {
  const date = new Date(teeOff);
  const days = ['일', '월', '화', '수', '목', '금', '토'];

  return {
    date: date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    time: date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    dayOfWeek: days[date.getDay()]
  };
}

/**
 * Get cancellation reason display text
 */
export function getCancelReasonText(reason: string | null): string {
  if (!reason) return '-';

  const reasonMap: Record<string, string> = {
    'USER_REQUEST': '사용자 요청',
    'WEATHER': '기상 사유',
    'NO_SHOW': '노쇼',
    'ADMIN_CANCEL': '관리자 취소',
    'SYSTEM_CANCEL': '시스템 취소'
  };

  return reasonMap[reason] || reason;
}
