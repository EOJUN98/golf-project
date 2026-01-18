/**
 * SDD-04 V2: Cancellation Policy Badge Component
 *
 * Displays cancellation policy status on tee time cards and reservation details
 */

'use client';

import { Database } from '@/types/database';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

type Reservation = Database['public']['Tables']['reservations']['Row'];
type TeeTime = Database['public']['Tables']['tee_times']['Row'];

interface CancellationBadgeProps {
  reservation?: Reservation;
  teeTime?: TeeTime;
  isImminentDeal?: boolean;
  showDescription?: boolean;
  cutoffHours?: number;
}

export default function CancellationBadge({
  reservation,
  teeTime,
  isImminentDeal = false,
  showDescription = false,
  cutoffHours = 24
}: CancellationBadgeProps) {
  // Determine cancellation status
  const getCancellationStatus = (): {
    canCancel: boolean;
    badge: string;
    description: string;
    icon: React.ReactNode;
    className: string;
  } => {
    // If imminent deal
    if (isImminentDeal || reservation?.is_imminent_deal) {
      return {
        canCancel: false,
        badge: '취소/환불 불가',
        description: '임박딜 상품은 취소 및 환불이 불가합니다. 골프장으로 문의하세요.',
        icon: <XCircle className="w-4 h-4" />,
        className: 'bg-red-100 text-red-700 border-red-300'
      };
    }

    // If reservation exists, check time left
    if (reservation && teeTime) {
      const teeOff = new Date(teeTime.tee_off);
      const now = new Date();
      const hoursLeft = (teeOff.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursLeft < cutoffHours) {
        return {
          canCancel: false,
          badge: '취소 불가',
          description: `취소는 티오프 ${cutoffHours}시간 전까지 가능합니다. 골프장으로 문의하세요.`,
          icon: <AlertCircle className="w-4 h-4" />,
          className: 'bg-orange-100 text-orange-700 border-orange-300'
        };
      }

      return {
        canCancel: true,
        badge: '취소 가능',
        description: `티오프 ${cutoffHours}시간 전까지 전액 환불 가능`,
        icon: <CheckCircle className="w-4 h-4" />,
        className: 'bg-green-100 text-green-700 border-green-300'
      };
    }

    // Default: standard tee time
    return {
      canCancel: true,
      badge: `${cutoffHours}시간 전 취소 가능`,
      description: `티오프 ${cutoffHours}시간 전까지 전액 환불`,
      icon: <CheckCircle className="w-4 h-4" />,
      className: 'bg-blue-100 text-blue-700 border-blue-300'
    };
  };

  const status = getCancellationStatus();

  return (
    <div className="space-y-2">
      {/* Badge */}
      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium ${status.className}`}>
        {status.icon}
        <span>{status.badge}</span>
      </div>

      {/* Description (optional) */}
      {showDescription && (
        <p className="text-sm text-gray-600">
          {status.description}
        </p>
      )}
    </div>
  );
}
